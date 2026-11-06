import { createPublicClient, createWalletClient, ExpirationTime } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { addr, dec, key, u64 } from "@arkiv-network/sdk/schema";
import { http, stringToBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  chromOrder,
  GenomeDataset,
  GenomeFeatures,
  GenomeSegment,
  type EncryptedBlob,
} from "@genomechain/shared/arkiv";
import type { GenomeManifest } from "@genomechain/shared/manifest";
import { env, PIPELINE_VERSION } from "./config";
import { PANEL_VERSION } from "./features";
import { log } from "./sh";

/** Arkiv caps entity lifetime at ~182.5 days; renew before it lapses. */
const LIFETIME = ExpirationTime.fromDays(180);
const SEGMENTS_PER_BATCH = 10;

function clients() {
  if (!env.arkivPrivateKey) throw new Error("ARKIV_PRIVATE_KEY is not set (fund it at hub.arkiv.network/faucet)");
  const chain = rabdi({ accessKey: env.arkivAccessKey });
  const account = privateKeyToAccount(env.arkivPrivateKey);
  return {
    account,
    publicClient: createPublicClient({ chain, transport: http() }),
    walletClient: createWalletClient({ chain, transport: http(), account }),
  };
}

export interface ArkivWriteResult {
  writer: Hex;
  datasetKey: Hex;
  segmentKeys: Hex[];
  featuresKey: Hex;
  txHashes: Hex[];
}

export async function writeGenome(
  manifest: GenomeManifest,
  manifestRef: string,
  features: EncryptedBlob,
): Promise<ArkivWriteResult> {
  const { account, walletClient } = clients();
  const patient = addr(manifest.patient as Hex);
  const txHashes: Hex[] = [];

  const dataset = await walletClient.createEntity(
    GenomeDataset,
    {
      patient,
      anonId: manifest.anonId,
      build: manifest.build,
      sourceFormat: manifest.source.format,
      sourceBuild: manifest.source.build,
      qcPass: manifest.qc.pass,
      hasRefCalls: manifest.qc.hasRefCalls,
      variantCount: u64(BigInt(manifest.qc.variantCount)),
      segmentCount: manifest.segments.length,
      cipherBytes: u64(BigInt(manifest.segments.reduce((s, x) => s + x.cipherBytes, 0))),
      titv: dec(manifest.qc.titv.toFixed(4)),
      hetHom: dec(manifest.qc.hetHom.toFixed(4)),
      manifestRef,
      pipelineVersion: PIPELINE_VERSION,
    },
    { expiration: LIFETIME },
  );
  txHashes.push(dataset.txHash);
  log("arkiv", `dataset ${dataset.entityKey}`);

  const datasetKey = key(dataset.entityKey);
  const segmentKeys: Hex[] = [];
  for (let i = 0; i < manifest.segments.length; i += SEGMENTS_PER_BATCH) {
    const batch = manifest.segments.slice(i, i + SEGMENTS_PER_BATCH);
    const res = await walletClient.executeBatch({
      creates: batch.map((s) => ({
        schema: GenomeSegment,
        values: {
          dataset: datasetKey,
          patient,
          chrom: s.chrom,
          chromOrder: chromOrder(s.chrom),
          variantCount: u64(BigInt(s.variantCount)),
          cipherBytes: u64(BigInt(s.cipherBytes)),
          swarmRef: s.swarmRef,
          sha256Cipher: s.sha256Cipher,
          sha256Plain: s.sha256Plain,
        },
        expiration: LIFETIME,
      })),
    });
    segmentKeys.push(...res.createdEntities);
    txHashes.push(res.txHash);
    log("arkiv", `segments ${i + 1}–${i + batch.length} (${res.txHash.slice(0, 12)}…)`);
  }

  const feat = await walletClient.createEntity(
    GenomeFeatures,
    { dataset: datasetKey, patient, panelVersion: PANEL_VERSION, summary: stringToBytes(JSON.stringify(features)) },
    { expiration: LIFETIME },
  );
  txHashes.push(feat.txHash);
  log("arkiv", `features ${feat.entityKey}`);

  return { writer: account.address, datasetKey: dataset.entityKey, segmentKeys, featuresKey: feat.entityKey, txHashes };
}

/** Read back what the app reads — proves the write and gives the README its runnable query. */
export async function readBackSegments(datasetKey: Hex) {
  const { publicClient } = clients();
  const { eq, asc } = await import("@arkiv-network/sdk/query");
  const page = await publicClient
    .select({ $key: true, chrom: true, swarmRef: true, variantCount: true })
    .from(GenomeSegment)
    .where(eq("dataset", key(datasetKey)))
    .orderBy(asc("chromOrder"))
    .limit(100)
    .fetch();
  return page.entities.map((e) => ({ key: e.$key, chrom: e.chrom.value, swarmRef: e.swarmRef.value, variants: e.variantCount.value }));
}
