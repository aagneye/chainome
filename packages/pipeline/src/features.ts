/**
 * A small, explainable PGx / risk-marker panel read from the normalized GRCh38 VCF.
 *
 * Not a clinical pipeline (that would be PharmCAT plus a real PRS). Every panel
 * position's REF base is checked against the GRCh38 FASTA at run time; a mismatch
 * is reported as "ref_mismatch" and excluded instead of producing a wrong call.
 */
import type { FeatureCall, FeatureSummary, PgxPhenotype, RiskBand } from "@genomechain/shared/arkiv";
import { env } from "./config";
import { bash, q, run } from "./sh";

export const PANEL_VERSION = "gc-panel-0.1";

interface PanelSite {
  rsid: string;
  gene: string;
  chrom: string;
  pos: number; // GRCh38, 1-based
  ref: string;
  alt: string; // the allele that changes function / risk
  meaning: string;
}

const PANEL: PanelSite[] = [
  { rsid: "rs4244285", gene: "CYP2C19", chrom: "chr10", pos: 94781859, ref: "G", alt: "A", meaning: "CYP2C19*2 (no function)" },
  { rsid: "rs4986893", gene: "CYP2C19", chrom: "chr10", pos: 94780653, ref: "G", alt: "A", meaning: "CYP2C19*3 (no function)" },
  { rsid: "rs12248560", gene: "CYP2C19", chrom: "chr10", pos: 94761900, ref: "C", alt: "T", meaning: "CYP2C19*17 (increased function)" },
  { rsid: "rs1799853", gene: "CYP2C9", chrom: "chr10", pos: 94942290, ref: "C", alt: "T", meaning: "CYP2C9*2 (decreased function)" },
  { rsid: "rs1057910", gene: "CYP2C9", chrom: "chr10", pos: 94981296, ref: "A", alt: "C", meaning: "CYP2C9*3 (no function)" },
  { rsid: "rs4149056", gene: "SLCO1B1", chrom: "chr12", pos: 21178615, ref: "T", alt: "C", meaning: "SLCO1B1 c.521T>C (decreased function, statin myopathy)" },
  { rsid: "rs7903146", gene: "TCF7L2", chrom: "chr10", pos: 112998590, ref: "C", alt: "T", meaning: "TCF7L2 type 2 diabetes risk allele" },
];

function altCount(gt: string): number | undefined {
  const alleles = gt.split(/[/|]/);
  if (alleles.some((a) => a === "." || a === "")) return undefined;
  return alleles.filter((a) => a !== "0").length;
}

export async function callFeatures(vcf: string, hasRefCalls: boolean): Promise<FeatureSummary> {
  const notes: string[] = [];

  // Verify panel coordinates against the reference before trusting any call.
  const faidx = (await run("samtools", ["faidx", env.refGrch38, ...PANEL.map((s) => `${s.chrom}:${s.pos}-${s.pos}`)])).stdout;
  const refBases = faidx.split(">").filter(Boolean).map((block) => block.split("\n")[1]?.trim().toUpperCase());

  const query = (await bash(
    `bcftools query -r ${q(PANEL.map((s) => `${s.chrom}:${s.pos}`).join(","))} -f '%CHROM\\t%POS\\t%REF\\t%ALT\\t[%GT]\\n' ${q(vcf)}`,
  )).stdout.trim().split("\n").filter(Boolean).map((l) => l.split("\t"));

  const calls: FeatureCall[] = PANEL.map((site, i) => {
    const base = { rsid: site.rsid, gene: site.gene, chrom: site.chrom, pos: site.pos, ref: site.ref, alt: site.alt };
    if (refBases[i] !== site.ref) return { ...base, genotype: "./.", status: "ref_mismatch" as const };
    const row = query.find((r) => r[0] === site.chrom && Number(r[1]) === site.pos && r[2] === site.ref && r[3] === site.alt);
    if (row) return { ...base, genotype: row[4], status: "called" as const };
    // Absent from a variant-only VCF → most likely homozygous reference, but not confirmed.
    return { ...base, genotype: hasRefCalls ? "./." : "0/0", status: "assumed_ref" as const };
  });

  for (const c of calls) {
    if (c.status === "ref_mismatch") notes.push(`${c.rsid}: panel REF does not match GRCh38 — excluded`);
  }
  if (!hasRefCalls) notes.push("variant-only VCF: sites not in the file are assumed reference (0/0)");

  const n = (rsid: string) => {
    const c = calls.find((x) => x.rsid === rsid);
    return c && c.status !== "ref_mismatch" ? altCount(c.genotype) : undefined;
  };

  return {
    cyp2c19: cyp2c19(n("rs4244285"), n("rs4986893"), n("rs12248560")),
    cyp2c9: cyp2c9(n("rs1799853"), n("rs1057910")),
    slco1b1: slco1b1(n("rs4149056")),
    t2dBand: t2d(n("rs7903146")),
    calls,
    notes: [...notes, "t2dBand uses one marker (TCF7L2), not a full polygenic score"],
  };
}

// CPIC-style phenotype rules, simplified to the alleles in the panel.
function cyp2c19(star2?: number, star3?: number, star17?: number): PgxPhenotype {
  if (star2 === undefined || star3 === undefined || star17 === undefined) return "unknown";
  const lof = star2 + star3;
  if (lof >= 2) return "poor";
  if (lof === 1) return "intermediate";
  if (star17 === 2) return "ultrarapid";
  if (star17 === 1) return "rapid";
  return "normal";
}

function cyp2c9(star2?: number, star3?: number): PgxPhenotype {
  if (star2 === undefined || star3 === undefined) return "unknown";
  const score = 2 - star2 * 0.5 - star3 * 1; // activity score: *1 = 1, *2 = 0.5, *3 = 0
  if (score >= 2) return "normal";
  if (score >= 1) return "intermediate";
  return "poor";
}

function slco1b1(c?: number): PgxPhenotype {
  if (c === undefined) return "unknown";
  return c === 0 ? "normal" : c === 1 ? "decreased" : "poor";
}

function t2d(c?: number): RiskBand {
  if (c === undefined) return "unknown";
  return c === 0 ? "average" : "elevated";
}
