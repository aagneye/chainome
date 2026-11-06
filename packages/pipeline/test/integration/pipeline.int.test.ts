/**
 * End-to-end check of the bcftools stages on a synthetic genome:
 * detect → normalize → qc → split → encrypt → decrypt.
 *
 * Needs bcftools on PATH, so it runs inside the pipeline Docker image:
 *   docker run --rm --entrypoint /app/packages/pipeline/node_modules/.bin/vitest genomechain-pipeline run
 * and is skipped elsewhere.
 */
import { spawnSync } from "node:child_process";
import { createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const hasBcftools = spawnSync("bcftools", ["--version"]).status === 0;

/** Deterministic pseudo-random ACGT with a poly-A run at 500–509 (1-based) for the left-align case. */
function sequence(len: number, seed: number): string {
  const bases = "ACGT";
  let x = seed;
  let s = "";
  for (let i = 0; i < len; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    s += bases[x % 4];
  }
  return s.slice(0, 498) + "C" + "AAAAAAAAAA" + "G" + s.slice(510);
}
const CHR1 = sequence(2000, 7);
const CHR2 = sequence(2000, 11);
const base = (seq: string, pos: number) => seq[pos - 1];
const other = (b: string, n = 1) => "ACGT".replace(b, "")[n - 1];

function fasta(): string {
  const wrap = (s: string) => s.match(/.{1,60}/g)!.join("\n");
  return `>chr1\n${wrap(CHR1)}\n>chr2\n${wrap(CHR2)}\n`;
}

function vcf(): string {
  const r100 = base(CHR1, 100);
  const r200 = base(CHR1, 200);
  const r300 = base(CHR1, 300);
  const r150 = base(CHR2, 150);
  return [
    "##fileformat=VCFv4.2",
    "##commandline=caller --sample JOHN_DOE --out /home/labtech/runs/john_doe.vcf",
    "##source=SecretLab Pipeline v3",
    "##contig=<ID=1,length=248956422>",
    "##contig=<ID=2,length=242193529>",
    '##FILTER=<ID=PASS,Description="All filters passed">',
    '##FILTER=<ID=LowQual,Description="Low quality">',
    '##INFO=<ID=DP,Number=1,Type=Integer,Description="Depth">',
    '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
    "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tJOHN_DOE",
    `1\t100\t.\t${r100}\t${other(r100)}\t50\tPASS\tDP=10\tGT\t0/1`,
    `1\t200\t.\t${r200}\t${other(r200, 1)},${other(r200, 2)}\t50\tPASS\tDP=12\tGT\t1/2`,
    `1\t300\t.\t${r300}\t${other(r300)}\t5\tLowQual\tDP=2\tGT\t0/1`,
    `1\t508\t.\tAA\tA\t50\tPASS\tDP=20\tGT\t0/1`, // right-shifted deletion inside the poly-A run
    `2\t150\t.\t${r150}\t${other(r150)}\t50\tPASS\tDP=30\tGT\t1/1`,
  ].join("\n") + "\n";
}

const bcf = (...args: string[]) => spawnSync("bcftools", args, { encoding: "utf8" }).stdout;

describe.skipIf(!hasBcftools)("pipeline stages on a synthetic genome (bcftools)", () => {
  let dir: string;
  let input: string;
  let mod: typeof import("../../src/normalize");
  let normalized: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "gc-int-"));
    await writeFile(join(dir, "ref.fa"), fasta());
    spawnSync("samtools", ["faidx", join(dir, "ref.fa")]);
    input = join(dir, "input.vcf");
    await writeFile(input, vcf());
    spawnSync("bgzip", ["-f", input]);
    input += ".gz";
    process.env.REF_GRCH38 = join(dir, "ref.fa");
    process.env.PIPELINE_THREADS = "2";
    mod = await import("../../src/normalize");
  });

  it("detects build from contig length and bare chromosome names", async () => {
    const d = await mod.detect(input);
    expect(d).toMatchObject({ format: "vcf", build: "GRCh38", chrPrefixed: false, sampleCount: 1 });
  });

  it("normalizes: chr-prefix, split multi-allelics, left-align, PASS only, no INFO", async () => {
    const work = join(dir, "work");
    await mkdir(work, { recursive: true });
    const res = await mod.normalize(input, await mod.detect(input), work);
    normalized = res.vcf;

    const rows = bcf("query", "-f", "%CHROM\t%POS\t%REF\t%ALT\t%FILTER\t%INFO\t[%GT]\n", normalized)
      .trim().split("\n").map((l) => l.split("\t"));
    const at = (chrom: string, pos: number) => rows.filter((r) => r[0] === chrom && Number(r[1]) === pos);

    expect(rows.every((r) => r[0].startsWith("chr"))).toBe(true);
    expect(at("chr1", 200)).toHaveLength(2); // 1/2 split into two biallelic rows
    expect(at("chr1", 200).every((r) => !r[3].includes(","))).toBe(true);
    expect(at("chr1", 508)).toHaveLength(0); // deletion moved…
    expect(at("chr1", 499)[0]?.slice(2, 4)).toEqual(["CA", "C"]); // …to the left edge of the poly-A run
    expect(at("chr1", 300)).toHaveLength(0); // LowQual dropped
    expect(rows.every((r) => r[5] === ".")).toBe(true); // INFO stripped
    expect(rows).toHaveLength(5);
  });

  it("anonymizes the header: sample renamed, identifying lines removed", async () => {
    const header = bcf("view", "-h", normalized);
    expect(header).not.toMatch(/JOHN_DOE|labtech|SecretLab|##commandline|##source/);
    expect(bcf("query", "-l", normalized).trim()).toBe("SAMPLE");
    expect(header).toContain("##contig=<ID=chr1");
  });

  it("computes QC and flags a variant-only VCF", async () => {
    const q = await mod.qc(normalized);
    expect(q.variantCount).toBe(5);
    expect(q.snps).toBe(4);
    expect(q.indels).toBe(1);
    expect(q.hasRefCalls).toBe(false);
    expect(q.notes.some((n) => n.startsWith("variant-only"))).toBe(true);
    expect(q.pass).toBe(true); // too few SNPs for Ti/Tv to be judged
  });

  it("splits into one bgzipped segment per chromosome, in order", async () => {
    const segDir = join(dir, "segments");
    await mkdir(segDir, { recursive: true });
    const { segments, droppedContigs } = await mod.split(normalized, segDir);
    expect(segments.map((s) => [s.chrom, s.variantCount])).toEqual([["chr1", 4], ["chr2", 1]]);
    expect(droppedContigs).toBe(0);
    expect(bcf("view", "-H", segments[1].path).trim().split("\n")).toHaveLength(1);
  });

  it("encrypts a segment that decrypts back to a VCF bcftools can read", async () => {
    const { encryptFile } = await import("../../src/encrypt");
    const seg = join(dir, "segments", "chr2.vcf.gz");
    const dek = randomBytes(32);
    const enc = await encryptFile(seg, `${seg}.enc`, dek);
    const blob = await readFile(enc.path);
    const d = createDecipheriv("aes-256-gcm", dek, blob.subarray(4, 16));
    d.setAuthTag(blob.subarray(blob.length - 16));
    const plain = Buffer.concat([d.update(blob.subarray(16, blob.length - 16)), d.final()]);
    await writeFile(join(dir, "roundtrip.vcf.gz"), plain);
    expect(bcf("view", "-H", join(dir, "roundtrip.vcf.gz")).trim().split("\t").slice(0, 2)).toEqual(["chr2", "150"]);
  });
});
