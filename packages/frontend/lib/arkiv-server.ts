import "server-only";
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { asc, eq } from "@arkiv-network/sdk/query";
import { addr, key } from "@arkiv-network/sdk/schema";
import { hexToString, http, type Hex } from "viem";
import { GenomeDataset, GenomeFeatures, GenomeSegment } from "@chainome/shared/arkiv";

/** Server-side only: the Arkiv access key must not reach the browser. */
export const arkiv = createPublicClient({
  chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" }),
  transport: http(),
});

export interface GenomeView {
  dataset: {
    key: Hex;
    build: string;
    sourceFormat: string;
    sourceBuild: string;
    qcPass: boolean;
    hasRefCalls: boolean;
    variantCount: string;
    segmentCount: number;
    cipherBytes: string;
    titv: string;
    hetHom: string;
    manifestRef: string;
    expiresAtBlock: string;
  };
  segments: { key: Hex; chrom: string; variantCount: string; cipherBytes: string; swarmRef: string; sha256Cipher: string; sha256Plain: string }[];
  /** EncryptedBlob JSON — only the patient's key opens it */
  features: string | null;
}

/** The user-facing Arkiv read behind /genome: latest dataset for a wallet, its segments and features. */
export async function getGenomeForPatient(patient: Hex): Promise<GenomeView | null> {
  const datasets = await arkiv
    .select()
    .from(GenomeDataset)
    .where(eq("patient", addr(patient)))
    .orderBy(asc("$expiresAt"))
    .limit(100)
    .fetch();
  const d = datasets.entities.at(-1); // latest write expires last
  if (!d) return null;

  const [segments, features] = await Promise.all([
    arkiv
      .select({ $key: true, chrom: true, variantCount: true, cipherBytes: true, swarmRef: true, sha256Cipher: true, sha256Plain: true })
      .from(GenomeSegment)
      .where(eq("dataset", key(d.$key)))
      .orderBy(asc("chromOrder"))
      .limit(100)
      .fetch(),
    arkiv.select({ summary: true }).from(GenomeFeatures).where(eq("dataset", key(d.$key))).limit(1).fetch(),
  ]);

  return {
    dataset: {
      key: d.$key,
      build: d.build.value,
      sourceFormat: d.sourceFormat.value,
      sourceBuild: d.sourceBuild.value,
      qcPass: d.qcPass.value,
      hasRefCalls: d.hasRefCalls.value,
      variantCount: String(d.variantCount.value),
      segmentCount: Number(d.segmentCount.value),
      cipherBytes: String(d.cipherBytes.value),
      titv: String(d.titv.value),
      hetHom: String(d.hetHom.value),
      manifestRef: d.manifestRef.value,
      expiresAtBlock: String(d.$expiresAt),
    },
    segments: segments.entities.map((s) => ({
      key: s.$key,
      chrom: s.chrom.value,
      variantCount: String(s.variantCount.value),
      cipherBytes: String(s.cipherBytes.value),
      swarmRef: s.swarmRef.value,
      sha256Cipher: s.sha256Cipher.value,
      sha256Plain: s.sha256Plain.value,
    })),
    features: features.entities[0] ? hexToString(features.entities[0].summary.value) : null,
  };
}
