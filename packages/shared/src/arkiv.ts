/**
 * Arkiv schemas shared by the lab pipeline (writes) and the web app (reads).
 *
 * Arkiv holds small, queryable metadata only. Genome bytes live on Swarm as
 * AES-256-GCM ciphertext; entities point at them by Swarm reference. A plain
 * Swarm reference to ciphertext reveals nothing, so it is safe in a public entity.
 * Never store a Swarm *encrypted* reference here — it embeds its decryption key.
 *
 * Limits that shaped this (docs.arkiv.network/reference/limits): str ≤ 128 bytes,
 * bytes ≤ 128 KiB per entity, ≤ 31 attributes per named schema, ≤ ~182 days lifetime.
 */
import { addr, bool, bytes, dec, defineSchema, i32, key, str, u64 } from "@arkiv-network/sdk/schema";

export const SCHEMA_PREFIX = "genomechain";

/** One per processed genome. Owned by the lab wallet that ran the pipeline. */
export const GenomeDataset = defineSchema(`${SCHEMA_PREFIX}.genome_dataset`, {
  patient: addr().indexed(),
  anonId: str().indexed(), // first 16 hex chars of the World ID nullifier — never the full value
  build: str().indexed(), // always "GRCh38" after normalization
  sourceFormat: str().indexed(), // "vcf" | "23andme"
  sourceBuild: str(), // build the file arrived in ("GRCh37" files are lifted over)
  qcPass: bool().indexed(),
  hasRefCalls: bool(), // false for variant-only VCFs: a missing variant is "not called", not "reference"
  variantCount: u64(),
  segmentCount: i32(),
  cipherBytes: u64(),
  titv: dec(),
  hetHom: dec(),
  manifestRef: str(), // Swarm ref of manifest.json — the value anchored on World Chain
  pipelineVersion: str(),
});

/** One per chromosome. A patient can share, and the app can download, a single segment. */
export const GenomeSegment = defineSchema(`${SCHEMA_PREFIX}.genome_segment`, {
  dataset: key().indexed(),
  patient: addr().indexed(),
  chrom: str().indexed(),
  chromOrder: i32().indexed(),
  variantCount: u64(),
  cipherBytes: u64(),
  swarmRef: str(),
  sha256Cipher: str(),
  sha256Plain: str(),
});

/**
 * Health features (PGx phenotypes, risk markers). Entities are public, so the summary is
 * encrypted to the patient: JSON EncryptedBlob whose plaintext is FeatureSummary JSON.
 * Nothing about the person's health is readable without their key.
 */
export const GenomeFeatures = defineSchema(`${SCHEMA_PREFIX}.genome_features`, {
  dataset: key().indexed(),
  patient: addr().indexed(),
  panelVersion: str(),
  summary: bytes(), // JSON: EncryptedBlob
});

/** A small payload encrypted with a fresh DEK, the DEK wrapped to one X25519 recipient. */
export interface EncryptedBlob {
  wrappedKey: { epk: string; iv: string; ct: string };
  iv: string; // hex, AES-256-GCM nonce
  ct: string; // hex, ciphertext + tag
}

/** A clinical document (lab report, prescription, …). File and its key live in a Swarm record manifest. */
export const MedicalRecord = defineSchema(`${SCHEMA_PREFIX}.medical_record`, {
  patient: addr().indexed(),
  anonId: str().indexed(),
  recordType: str().indexed(), // "lab_report" | "prescription" | "imaging" | "vaccination" | "clinical_notes" | "other"
  date: str().indexed(), // YYYY-MM-DD
  mimeType: str(),
  cipherBytes: u64(),
  manifestRef: str(), // Swarm ref of RecordManifest — the value stored in RecordVault
});

/** Swarm JSON for one medical record. No filename (often contains the patient's name). */
export interface RecordManifest {
  version: 1;
  fileRef: string;
  mimeType: string;
  plainBytes: number;
  cipherBytes: number;
  sha256Plain: string;
  sha256Cipher: string;
  wrappedKey: { epk: string; iv: string; ct: string };
}

/**
 * Consent grant, written by the patient. Its Arkiv expiry is the consent expiry,
 * so the grant (and the wrapped keys in it) disappears when consent ends.
 */
export const AccessGrant = defineSchema(`${SCHEMA_PREFIX}.access_grant`, {
  dataset: key().indexed(),
  patient: addr().indexed(),
  institution: addr().indexed(),
  chroms: str(), // comma-separated, e.g. "chr10,chr22"
  wrappedKeys: bytes(), // JSON: Record<chrom, WrappedKey> — DEKs wrapped to the institution's X25519 key
});

export type PgxPhenotype = "normal" | "intermediate" | "poor" | "rapid" | "ultrarapid" | "decreased" | "unknown";
export type RiskBand = "low" | "average" | "elevated" | "unknown";

export interface FeatureCall {
  rsid: string;
  gene: string;
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  /** "0/0" when assumed reference in a variant-only VCF */
  genotype: string;
  status: "called" | "assumed_ref" | "ref_mismatch";
}

export interface FeatureSummary {
  cyp2c19: PgxPhenotype;
  cyp2c9: PgxPhenotype;
  slco1b1: PgxPhenotype;
  t2dBand: RiskBand;
  calls: FeatureCall[];
  notes: string[];
}

/** Arkiv chromosome sort order: chr1..chr22, chrX, chrY, chrM. */
export function chromOrder(chrom: string): number {
  const c = chrom.replace(/^chr/, "");
  if (c === "X") return 23;
  if (c === "Y") return 24;
  if (c === "M" || c === "MT") return 25;
  const n = Number(c);
  return Number.isInteger(n) ? n : 99;
}
