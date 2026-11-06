import { isHex } from "viem";

export const PIPELINE_VERSION = "0.1.0";

/** Hard cap from the product decision: genomes enter as VCF ≤ 2 GB. */
export const MAX_INPUT_BYTES = 2 * 1024 ** 3;

/** Chromosomes kept as segments. Alt/random/decoy contigs are dropped (and counted). */
export const PRIMARY_CHROMS = [
  ...Array.from({ length: 22 }, (_, i) => `chr${i + 1}`),
  "chrX",
  "chrY",
  "chrM",
];

function optional(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

function hexKey(name: string): `0x${string}` | undefined {
  const v = optional(name);
  if (!v) return undefined;
  if (!isHex(v)) throw new Error(`${name} must be a 0x-prefixed hex private key`);
  return v;
}

export const env = {
  /** GRCh38 FASTA (chr-prefixed, e.g. UCSC hg38.fa) with .fai next to it */
  refGrch38: optional("REF_GRCH38") ?? "/ref/hg38.fa",
  /** UCSC hg19ToHg38 chain, used only for GRCh37 input */
  chain37to38: optional("CHAIN_37_TO_38") ?? "/ref/hg19ToHg38.over.chain.gz",
  /** GRCh37 FASTA, needed only to convert 23andMe raw files */
  refGrch37: optional("REF_GRCH37"),
  threads: Number(optional("PIPELINE_THREADS") ?? 8),

  beeUrl: optional("BEE_URL") ?? "http://localhost:1633",
  swarmBatchId: optional("SWARM_BATCH_ID"),

  arkivAccessKey: optional("ARKIV_ACCESS_KEY") ?? "",
  arkivPrivateKey: hexKey("ARKIV_PRIVATE_KEY"),

  worldchainRpc: optional("WORLDCHAIN_SEPOLIA_RPC") ?? "https://worldchain-sepolia.g.alchemy.com/public",
  labPrivateKey: hexKey("LAB_PRIVATE_KEY"),
  labAttestation: optional("NEXT_PUBLIC_LAB_ATTESTATION") as `0x${string}` | undefined,
};
