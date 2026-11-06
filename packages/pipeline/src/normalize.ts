/**
 * VCF ingest → one standard form: GRCh38, chr-prefixed, biallelic, left-aligned,
 * PASS-only, single anonymous sample "SAMPLE", no INFO, PII-free header,
 * bgzipped + tabix-indexed.
 *
 * Why: VCFs from different labs disagree on build (GRCh37 vs 38), chromosome
 * naming (1 vs chr1), multi-allelic rows and indel position. Without this,
 * the same variant looks different across patients and study queries miss it.
 */
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { env, MAX_INPUT_BYTES, PRIMARY_CHROMS } from "./config";
import { bash, log, q, run } from "./sh";

export type Build = "GRCh37" | "GRCh38";
export type SourceFormat = "vcf" | "23andme";

export interface DetectResult {
  format: SourceFormat;
  build: Build;
  chrPrefixed: boolean;
  sampleCount: number;
  bytes: number;
  sha256: string;
  notes: string[];
}

/** First `limit` bytes of a file, transparently gunzipping (VCF.gz / BGZF are gzip). */
async function readHead(path: string, limit: number): Promise<string> {
  const raw = createReadStream(path, { start: 0, end: 1 });
  const magic: Buffer = await new Promise((res, rej) => { const parts: Buffer[] = []; raw.on("data", (d) => parts.push(d as Buffer)); raw.on("end", () => res(Buffer.concat(parts))); raw.on("error", rej); });
  const gz = magic[0] === 0x1f && magic[1] === 0x8b;
  const stream = gz ? createReadStream(path).pipe(createGunzip()) : createReadStream(path);
  let out = "";
  for await (const chunk of stream) {
    out += chunk.toString("utf8");
    if (out.length >= limit) break;
  }
  stream.destroy();
  return out.slice(0, limit);
}

const CHR1_LENGTH: Record<number, Build> = { 248956422: "GRCh38", 249250621: "GRCh37" };

export async function sha256File(path: string): Promise<string> {
  const h = createHash("sha256");
  for await (const chunk of createReadStream(path)) h.update(chunk as Buffer);
  return h.digest("hex");
}

export async function detect(input: string, buildOverride?: Build): Promise<DetectResult> {
  const { size } = await stat(input);
  if (size > MAX_INPUT_BYTES) throw new Error(`Input is ${(size / 1e9).toFixed(2)} GB; the limit is 2 GB`);
  const notes: string[] = [];

  const head = await readHead(input, 200_000);
  const is23andMe = !head.startsWith("##fileformat=VCF") && /^#.*(23andMe|rsid\s+chromosome\s+position\s+genotype)/im.test(head);
  if (is23andMe) {
    // 23andMe raw data files are GRCh37 ("build 37") with bare chromosome names.
    return { format: "23andme", build: "GRCh37", chrPrefixed: false, sampleCount: 1, bytes: size, sha256: await sha256File(input), notes };
  }
  if (!head.startsWith("##fileformat=VCF")) throw new Error("Not a VCF (missing ##fileformat=VCF) and not a 23andMe raw file");

  const header = (await run("bcftools", ["view", "-h", input])).stdout;
  const samples = header.split("\n").find((l) => l.startsWith("#CHROM"))?.split("\t").slice(9) ?? [];
  if (samples.length === 0) throw new Error("VCF has no sample column — a genotype is required");
  if (samples.length > 1) notes.push(`multi-sample VCF (${samples.length}); only the first sample is kept`);

  const contigs = [...header.matchAll(/##contig=<ID=([^,>]+)(?:,length=(\d+))?/g)];
  const chr1 = contigs.find((m) => m[1] === "chr1" || m[1] === "1");
  let build: Build | undefined = buildOverride;
  if (!build && chr1?.[2]) build = CHR1_LENGTH[Number(chr1[2])];
  if (!build && /GRCh38|hg38/i.test(header)) build = "GRCh38";
  if (!build && /GRCh37|hg19|b37/i.test(header)) build = "GRCh37";
  if (!build) {
    build = "GRCh38";
    notes.push("build not declared in header; assumed GRCh38 (pass --build to override)");
  }

  const firstRecord = (await bash(`bcftools view -H ${q(input)} | head -1`, { pipefail: false })).stdout;
  const chrPrefixed = firstRecord ? firstRecord.startsWith("chr") : contigs.some((m) => m[1].startsWith("chr"));
  return { format: "vcf", build, chrPrefixed, sampleCount: samples.length, bytes: size, sha256: await sha256File(input), notes };
}

/** "1 chr1" … "MT chrM" — makes every input chr-prefixed like UCSC hg38. */
async function writeChromMap(dir: string): Promise<string> {
  const lines = [...Array.from({ length: 22 }, (_, i) => `${i + 1} chr${i + 1}`), "X chrX", "Y chrY", "MT chrM", "M chrM", "chrMT chrM"];
  const path = join(dir, "chrom-map.txt");
  await writeFile(path, lines.join("\n") + "\n");
  return path;
}

/** Keep only structural header lines; drop ##commandline / ##source / file paths / dates that can identify a person or lab run. */
async function cleanHeader(vcf: string, dir: string): Promise<string> {
  const header = (await run("bcftools", ["view", "-h", vcf])).stdout.trimEnd().split("\n");
  const keep = header.filter((l) => /^##(fileformat|contig|FILTER|FORMAT|ALT|reference)=/.test(l));
  const cols = header.at(-1)!.split("\t").slice(0, 9).concat("SAMPLE");
  const path = join(dir, "clean-header.txt");
  await writeFile(path, [...keep, cols.join("\t")].join("\n") + "\n");
  return path;
}

export async function normalize(input: string, det: DetectResult, dir: string): Promise<{ vcf: string; steps: string[] }> {
  const t = String(env.threads);
  const map = await writeChromMap(dir);
  const steps: string[] = [];
  let src = input;

  if (det.format === "23andme") {
    if (!env.refGrch37) throw new Error("23andMe input needs REF_GRCH37 (GRCh37 FASTA with bare chromosome names)");
    const converted = join(dir, "from23andme.vcf.gz");
    await run("bcftools", ["convert", "--tsv2vcf", input, "-f", env.refGrch37, "-s", "SAMPLE", "-Oz", "-o", converted]);
    steps.push("bcftools convert --tsv2vcf (23andMe → VCF, GRCh37)");
    src = converted;
  }

  // 1. chromosome naming → chr-prefixed; first sample only
  const renamed = join(dir, "renamed.vcf.gz");
  await bash(
    `bcftools view --threads ${t} -s "$(bcftools query -l ${q(src)} | head -1)" ${q(src)} -Ou ` +
      `| bcftools annotate --threads ${t} --rename-chrs ${q(map)} -Oz -o ${q(renamed)}`,
  );
  steps.push("bcftools annotate --rename-chrs (1 → chr1, MT → chrM); first sample only");

  // 2. liftover GRCh37 → GRCh38
  let grch38 = renamed;
  if (det.build === "GRCh37") {
    const lifted = join(dir, "lifted.vcf");
    await run("CrossMap", ["vcf", env.chain37to38, renamed, env.refGrch38, lifted]);
    grch38 = join(dir, "lifted.sorted.vcf.gz");
    await run("bcftools", ["sort", "-m", "4G", "-T", join(dir, "sort-tmp"), lifted, "-Oz", "-o", grch38]);
    steps.push("CrossMap vcf hg19ToHg38 (GRCh37 → GRCh38) + bcftools sort");
  }

  // 3. split multi-allelics, left-align against GRCh38, PASS only, drop INFO, sort
  const normed = join(dir, "normalized.vcf.gz");
  await bash(
    `bcftools norm --threads ${t} -m -any -f ${q(env.refGrch38)} --check-ref w ${q(grch38)} -Ou ` +
      `| bcftools view --threads ${t} -f PASS,. -Ou ` +
      `| bcftools annotate --threads ${t} -x INFO -Ou ` +
      `| bcftools sort -m 4G -T ${q(join(dir, "sort-tmp2"))} -Oz -o ${q(normed)}`,
  );
  steps.push("bcftools norm -m -any -f GRCh38 (split multi-allelic, left-align); view -f PASS; annotate -x INFO; sort");

  // 4. anonymize: sample → SAMPLE, strip identifying header lines
  const header = await cleanHeader(normed, dir);
  const final = join(dir, "final.vcf.gz");
  await run("bcftools", ["reheader", "-h", header, "-o", final, normed]);
  await run("bcftools", ["index", "-t", final]);
  steps.push("bcftools reheader (sample → SAMPLE, drop ##commandline/##source/paths); tabix index");

  log("normalize", `wrote ${final}`);
  return { vcf: final, steps };
}

export interface QcResult {
  variantCount: number;
  snps: number;
  indels: number;
  titv: number;
  hetHom: number;
  hasRefCalls: boolean;
  pass: boolean;
  notes: string[];
}

export async function qc(vcf: string): Promise<QcResult> {
  const stats = (await run("bcftools", ["stats", "-s", "-", vcf])).stdout.split("\n"); // -s - : per-sample PSC rows
  const sn = (label: string) => Number(stats.find((l) => l.startsWith("SN\t") && l.includes(label))?.split("\t")[3] ?? 0);
  const tstvLine = stats.find((l) => l.startsWith("TSTV\t"))?.split("\t");
  const psc = stats.find((l) => l.startsWith("PSC\t"))?.split("\t");
  const nonRefHom = Number(psc?.[4] ?? 0);
  const het = Number(psc?.[5] ?? 0);

  const variantCount = sn("number of records:");
  const snps = sn("number of SNPs:");
  const indels = sn("number of indels:");
  const titv = Number(tstvLine?.[4] ?? 0);
  const hetHom = nonRefHom > 0 ? het / nonRefHom : 0;

  // gVCF / all-sites files carry symbolic <NON_REF>/<*> alleles or many 0/0 rows. Variant-only
  // VCFs can still contain a stray 0/0 (GIAB HG002 has one), so count rather than test for one.
  const symbolic = (await bash(`bcftools view -H -i 'ALT="<*>" || ALT="<NON_REF>"' ${q(vcf)} | head -1`, { pipefail: false })).stdout.trim();
  const refRows = Number((await bash(`bcftools view -H -i 'GT="RR"' ${q(vcf)} | wc -l`)).stdout.trim());
  const hasRefCalls = symbolic.length > 0 || (variantCount > 0 && refRows / variantCount > 0.05);

  const notes: string[] = [];
  if (!hasRefCalls) notes.push("variant-only VCF: positions not listed are assumed reference, not confirmed");
  if (snps > 10_000 && (titv < 1.8 || titv > 3.3)) notes.push(`Ti/Tv ${titv.toFixed(2)} outside 1.8–3.3 (WGS ≈ 2.0–2.1, WES ≈ 2.8–3.0)`);
  if (hetHom > 0 && (hetHom < 1.0 || hetHom > 2.5)) notes.push(`het/hom ${hetHom.toFixed(2)} outside 1.0–2.5`);
  const pass = variantCount > 0 && notes.every((n) => n.startsWith("variant-only"));

  return { variantCount, snps, indels, titv, hetHom, hasRefCalls, pass, notes };
}

export interface Segment {
  chrom: string;
  path: string;
  variantCount: number;
}

/** One bgzipped VCF per primary chromosome. Swarm chunks bytes itself; this split is for selective sharing and retries. */
export async function split(vcf: string, dir: string): Promise<{ segments: Segment[]; droppedContigs: number }> {
  const idx = (await run("bcftools", ["index", "-s", vcf])).stdout.trim().split("\n").filter(Boolean);
  const counts = new Map(idx.map((l) => {
    const [chrom, , n] = l.split("\t");
    return [chrom, Number(n)] as const;
  }));
  const droppedContigs = [...counts.keys()].filter((c) => !PRIMARY_CHROMS.includes(c)).length;
  const chroms = PRIMARY_CHROMS.filter((c) => (counts.get(c) ?? 0) > 0);

  const segments: Segment[] = [];
  await Promise.all(
    chroms.map(async (chrom) => {
      const path = join(dir, `${chrom}.vcf.gz`);
      await run("bcftools", ["view", "-r", chrom, vcf, "-Oz", "-o", path]);
      segments.push({ chrom, path, variantCount: counts.get(chrom)! });
    }),
  );
  segments.sort((a, b) => PRIMARY_CHROMS.indexOf(a.chrom) - PRIMARY_CHROMS.indexOf(b.chrom));
  log("split", `${segments.length} segments` + (droppedContigs ? `, ${droppedContigs} non-primary contigs dropped` : ""));
  return { segments, droppedContigs };
}
