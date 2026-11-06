#!/usr/bin/env node
/**
 * genome-pipeline — lab-side processing of one patient genome.
 *
 *   VCF (≤2 GB) → normalize to GRCh38 → QC → PGx panel → split per chromosome
 *   → AES-256-GCM per segment → Swarm → manifest.json → Swarm
 *   → Arkiv (dataset, segments, encrypted features) → LabAttestation on World Chain
 *
 * Usage:
 *   genome-pipeline --vcf in.vcf.gz --patient 0xWallet --patient-pubkey <x25519 hex>
 *                   [--nullifier 0x…] [--build GRCh37|GRCh38] [--work ./work] [--dry-run]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { isAddress } from "viem";
import { newDataKey, sealForRecipient, wrapKey } from "@chainome/shared/keys";
import type { GenomeManifest, ManifestSegment } from "@chainome/shared/manifest";
import { env, PIPELINE_VERSION } from "./config";
import { detect, normalize, qc, split, type Build } from "./normalize";
import { callFeatures } from "./features";
import { encryptFile } from "./encrypt";
import { checkSwarm, uploadFile, uploadJson } from "./swarm";
import { readBackSegments, writeGenome } from "./arkiv";
import { attest } from "./attest";
import { log, pool, run } from "./sh";

const { values: args } = parseArgs({
  options: {
    vcf: { type: "string" },
    patient: { type: "string" },
    "patient-pubkey": { type: "string" },
    nullifier: { type: "string" },
    build: { type: "string" },
    work: { type: "string", default: "./work" },
    "dry-run": { type: "boolean", default: false },
    result: { type: "string" }, // also write the run result JSON here (used by the job service)
  },
});

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

async function toolVersion(cmd: string, args: string[]): Promise<string> {
  try {
    return (await run(cmd, args)).stdout.split("\n")[0].trim();
  } catch {
    return "unavailable";
  }
}

async function main() {
  const input = args.vcf ? resolve(args.vcf) : fail("--vcf is required");
  const patient = args.patient && isAddress(args.patient) ? args.patient : fail("--patient must be a wallet address");
  const patientPubKey = args["patient-pubkey"]?.replace(/^0x/, "");
  if (!patientPubKey || !/^[0-9a-f]{64}$/i.test(patientPubKey)) fail("--patient-pubkey must be the 32-byte X25519 key shown on /genome");
  const nullifier = args.nullifier ? BigInt(args.nullifier) : undefined;
  const anonId = nullifier !== undefined ? nullifier.toString(16).padStart(64, "0").slice(0, 16) : "unverified";
  const dryRun = args["dry-run"];

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(args.work!, runId);
  const segDir = join(dir, "segments");
  await mkdir(segDir, { recursive: true });

  if (!dryRun) log("preflight", `swarm ${await checkSwarm()}`);

  // 1–2. detect + normalize
  const det = await detect(input, args.build as Build | undefined);
  log("detect", `${det.format} ${det.build}, ${(det.bytes / 1e6).toFixed(1)} MB, chr-prefixed=${det.chrPrefixed}`);
  const { vcf, steps } = await normalize(input, det, dir);

  // 3. QC
  const q = await qc(vcf);
  log("qc", `${q.variantCount} variants, Ti/Tv ${q.titv.toFixed(2)}, het/hom ${q.hetHom.toFixed(2)}, pass=${q.pass}`);
  q.notes.forEach((n) => log("qc", `note: ${n}`));

  // 4. features (encrypted to the patient — Arkiv entities are public)
  const features = await callFeatures(vcf, q.hasRefCalls);
  log("features", `CYP2C19 ${features.cyp2c19}, CYP2C9 ${features.cyp2c9}, SLCO1B1 ${features.slco1b1}, T2D ${features.t2dBand}`);
  const sealedFeatures = sealForRecipient(new TextEncoder().encode(JSON.stringify(features)), patientPubKey);

  // 5–6. split + encrypt
  const { segments, droppedContigs } = await split(vcf, segDir);
  const encrypted = await pool(segments, env.threads, async (s) => {
    const dek = newDataKey();
    const enc = await encryptFile(s.path, `${s.path}.enc`, dek);
    return { seg: s, enc, wrappedKey: wrapKey(dek, patientPubKey) };
  });
  log("encrypt", `${encrypted.length} segments, ${(encrypted.reduce((a, e) => a + e.enc.cipherBytes, 0) / 1e6).toFixed(1)} MB ciphertext`);

  const manifest: GenomeManifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    patient,
    patientPublicKey: patientPubKey,
    anonId,
    source: { format: det.format, build: det.build, sha256: det.sha256, bytes: det.bytes },
    build: "GRCh38",
    qc: { ...q, notes: [...det.notes, ...q.notes, ...(droppedContigs ? [`${droppedContigs} non-primary contigs dropped`] : [])] },
    pipeline: {
      version: PIPELINE_VERSION,
      tools: {
        bcftools: await toolVersion("bcftools", ["--version"]),
        samtools: await toolVersion("samtools", ["--version"]),
        ...(det.build === "GRCh37" ? { crossmap: await toolVersion("CrossMap", ["--version"]) } : {}),
      },
      steps,
    },
    segments: [],
  };

  if (dryRun) {
    manifest.segments = encrypted.map(({ seg, enc, wrappedKey }) => ({
      chrom: seg.chrom, variantCount: seg.variantCount, plainBytes: enc.plainBytes, cipherBytes: enc.cipherBytes,
      sha256Plain: enc.sha256Plain, sha256Cipher: enc.sha256Cipher, swarmRef: "dry-run", wrappedKey,
    }));
    await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    if (args.result) {
      const summary = { runId, dryRun: true, qc: manifest.qc, segments: manifest.segments.map((s) => ({ chrom: s.chrom, variants: s.variantCount, cipherBytes: s.cipherBytes })) };
      await writeFile(args.result, JSON.stringify(summary, null, 2));
    }
    log("done", `dry run — manifest at ${join(dir, "manifest.json")}`);
    return;
  }

  // 7. Swarm
  manifest.segments = await pool(encrypted, 4, async ({ seg, enc, wrappedKey }): Promise<ManifestSegment> => {
    const swarmRef = await uploadFile(enc.path, seg.chrom);
    log("swarm", `${seg.chrom.padEnd(5)} ${swarmRef}`);
    return {
      chrom: seg.chrom, variantCount: seg.variantCount, plainBytes: enc.plainBytes, cipherBytes: enc.cipherBytes,
      sha256Plain: enc.sha256Plain, sha256Cipher: enc.sha256Cipher, swarmRef, wrappedKey,
    };
  });
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const manifestRef = await uploadJson(manifest, "manifest");
  log("swarm", `manifest ${manifestRef}`);

  // 8. Arkiv
  const ark = await writeGenome(manifest, manifestRef, sealedFeatures);
  const readBack = await readBackSegments(ark.datasetKey);
  if (readBack.length !== manifest.segments.length) {
    log("arkiv", `warning: read back ${readBack.length}/${manifest.segments.length} segments (indexer may lag; re-run the query)`);
  }

  // 9. World Chain attestation
  let attestTx: string | undefined;
  if (nullifier !== undefined) {
    attestTx = await attest(nullifier, manifestRef, q.pass);
    log("attest", attestTx ? `LabAttestation tx ${attestTx}` : "skipped (LAB_PRIVATE_KEY / NEXT_PUBLIC_LAB_ATTESTATION not set)");
  } else {
    log("attest", "skipped (no --nullifier)");
  }

  const result = { runId, manifestRef, ...ark, attestTx, segments: readBack };
  await writeFile(join(dir, "result.json"), JSON.stringify(result, null, 2));
  if (args.result) await writeFile(args.result, JSON.stringify({ ...result, dryRun: false, qc: manifest.qc }, null, 2));

  console.log("\n── done ─────────────────────────────────────────────");
  console.log(`manifestRef  ${manifestRef}   ← submit this in GenomeRegistry.submitGenome`);
  console.log(`dataset      ${ark.datasetKey}`);
  console.log(`writer       ${ark.writer}`);
  console.log(`result       ${join(dir, "result.json")}`);
  console.log(`\nRunnable Arkiv query (Rabdi):\n  pnpm --filter pipeline run query -- --dataset ${ark.datasetKey}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
