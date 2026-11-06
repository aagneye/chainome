/**
 * manifest.json — uploaded to Swarm next to the segments. Its Swarm reference is
 * what the lab attests and the patient anchors on World Chain (GenomeRegistry).
 *
 * Every field is safe to publish: segments are ciphertext, keys are wrapped.
 */
import type { WrappedKey } from "./keys";

/**
 * Encrypted segment file layout (one per chromosome):
 *   "GCv1" (4 bytes) | nonce (12 bytes) | AES-256-GCM ciphertext | GCM tag (16 bytes)
 * The plaintext is a bgzipped, tabix-indexable VCF for one chromosome.
 */
export const SEGMENT_MAGIC = "GCv1";
export const SEGMENT_HEADER_BYTES = 4 + 12;

export interface ManifestSegment {
  chrom: string;
  variantCount: number;
  plainBytes: number;
  cipherBytes: number;
  sha256Plain: string;
  sha256Cipher: string;
  swarmRef: string;
  /** this segment's DEK, wrapped to the patient's X25519 key */
  wrappedKey: WrappedKey;
}

export interface GenomeManifest {
  version: 1;
  createdAt: string;
  patient: string;
  patientPublicKey: string;
  anonId: string;
  source: { format: "vcf" | "23andme"; build: "GRCh37" | "GRCh38"; sha256: string; bytes: number };
  build: "GRCh38";
  qc: {
    variantCount: number;
    snps: number;
    indels: number;
    titv: number;
    hetHom: number;
    hasRefCalls: boolean;
    pass: boolean;
    notes: string[];
  };
  pipeline: { version: string; tools: Record<string, string>; steps: string[] };
  segments: ManifestSegment[];
}
