import { beforeEach, describe, expect, it, vi } from "vitest";

// callFeatures shells out to samtools/bcftools; replace the shell layer with canned output.
const run = vi.fn();
const bash = vi.fn();
vi.mock("../src/sh", () => ({ run, bash, q: (s: string) => `'${s}'` }));

const { altCount, callFeatures, cyp2c19, cyp2c9, slco1b1, t2d } = await import("../src/features");

const PANEL_REFS = ["G", "G", "C", "C", "A", "T", "c"]; // as samtools faidx prints them (soft-masked lowercase allowed)

function faidx(refs = PANEL_REFS) {
  const regions = ["chr10:94781859", "chr10:94780653", "chr10:94761900", "chr10:94942290", "chr10:94981296", "chr12:21178615", "chr10:112998590"];
  return { stdout: regions.map((r, i) => `>${r}-${r.split(":")[1]}\n${refs[i]}\n`).join(""), stderr: "" };
}

describe("altCount", () => {
  it.each([
    ["0/0", 0], ["0/1", 1], ["1/0", 1], ["1/1", 2], ["0|1", 1], ["1|1", 2], ["1/2", 2],
  ])("%s → %i", (gt, n) => expect(altCount(gt)).toBe(n));

  it.each(["./.", "./1", "."])("%s is a no-call", (gt) => expect(altCount(gt)).toBeUndefined());
});

describe("CYP2C19 phenotype (CPIC-style)", () => {
  it.each([
    [0, 0, 0, "normal"],
    [0, 0, 1, "rapid"],
    [0, 0, 2, "ultrarapid"],
    [1, 0, 0, "intermediate"],
    [1, 0, 1, "intermediate"], // *2/*17
    [0, 1, 0, "intermediate"],
    [2, 0, 0, "poor"],
    [1, 1, 0, "poor"], // *2/*3
  ] as const)("*2=%i *3=%i *17=%i → %s", (s2, s3, s17, expected) => expect(cyp2c19(s2, s3, s17)).toBe(expected));

  it("is unknown when any site is uncalled", () => {
    expect(cyp2c19(undefined, 0, 0)).toBe("unknown");
    expect(cyp2c19(0, 0, undefined)).toBe("unknown");
  });
});

describe("CYP2C9 phenotype (activity score)", () => {
  it.each([
    [0, 0, "normal"], // AS 2
    [1, 0, "intermediate"], // *1/*2 AS 1.5
    [2, 0, "intermediate"], // *2/*2 AS 1
    [0, 1, "intermediate"], // *1/*3 AS 1
    [1, 1, "poor"], // *2/*3 AS 0.5
    [0, 2, "poor"], // *3/*3 AS 0
  ] as const)("*2=%i *3=%i → %s", (s2, s3, expected) => expect(cyp2c9(s2, s3)).toBe(expected));

  it("is unknown when uncalled", () => expect(cyp2c9(undefined, 0)).toBe("unknown"));
});

describe("SLCO1B1 and TCF7L2", () => {
  it("SLCO1B1 maps 0/1/2 alleles to normal/decreased/poor", () => {
    expect([slco1b1(0), slco1b1(1), slco1b1(2), slco1b1(undefined)]).toEqual(["normal", "decreased", "poor", "unknown"]);
  });
  it("TCF7L2 risk allele carriers are elevated", () => {
    expect([t2d(0), t2d(1), t2d(2), t2d(undefined)]).toEqual(["average", "elevated", "elevated", "unknown"]);
  });
});

describe("callFeatures", () => {
  beforeEach(() => {
    run.mockReset();
    bash.mockReset();
  });

  it("calls genotypes found in the VCF and assumes reference for missing sites in a variant-only VCF", async () => {
    run.mockResolvedValueOnce(faidx());
    bash.mockResolvedValueOnce({
      stdout: "chr10\t94781859\tG\tA\t0/1\nchr10\t112998590\tC\tT\t1/1\n",
      stderr: "",
    });
    const f = await callFeatures("x.vcf.gz", false);
    expect(f.cyp2c19).toBe("intermediate");
    expect(f.cyp2c9).toBe("normal");
    expect(f.slco1b1).toBe("normal");
    expect(f.t2dBand).toBe("elevated");
    expect(f.calls.find((c) => c.rsid === "rs4244285")).toMatchObject({ genotype: "0/1", status: "called" });
    expect(f.calls.find((c) => c.rsid === "rs4986893")).toMatchObject({ genotype: "0/0", status: "assumed_ref" });
    expect(f.notes.some((n) => n.includes("assumed reference"))).toBe(true);
  });

  it("treats missing sites as unknown when the file has reference calls (gVCF)", async () => {
    run.mockResolvedValueOnce(faidx());
    bash.mockResolvedValueOnce({ stdout: "", stderr: "" });
    const f = await callFeatures("x.g.vcf.gz", true);
    expect(f.cyp2c19).toBe("unknown");
    expect(f.calls.every((c) => c.genotype === "./.")).toBe(true);
  });

  it("excludes a site whose panel REF disagrees with the reference genome", async () => {
    run.mockResolvedValueOnce(faidx(["T", "G", "C", "C", "A", "T", "C"])); // rs4244285 REF wrong
    bash.mockResolvedValueOnce({ stdout: "chr10\t94781859\tG\tA\t1/1\n", stderr: "" });
    const f = await callFeatures("x.vcf.gz", false);
    expect(f.calls.find((c) => c.rsid === "rs4244285")?.status).toBe("ref_mismatch");
    expect(f.cyp2c19).toBe("unknown"); // never turns a coordinate error into a "poor metabolizer" call
    expect(f.notes.some((n) => n.startsWith("rs4244285"))).toBe(true);
  });

  it("ignores a row at the right position but with a different ALT allele", async () => {
    run.mockResolvedValueOnce(faidx());
    bash.mockResolvedValueOnce({ stdout: "chr10\t94781859\tG\tT\t1/1\n", stderr: "" });
    const f = await callFeatures("x.vcf.gz", false);
    expect(f.calls.find((c) => c.rsid === "rs4244285")?.status).toBe("assumed_ref");
  });

  it("queries exactly the panel positions", async () => {
    run.mockResolvedValueOnce(faidx());
    bash.mockResolvedValueOnce({ stdout: "", stderr: "" });
    await callFeatures("x.vcf.gz", false);
    expect(bash.mock.calls[0][0]).toContain("chr10:94781859");
    expect(bash.mock.calls[0][0]).toContain("chr12:21178615");
  });
});
