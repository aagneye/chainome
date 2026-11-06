import { describe, expect, it } from "vitest";
import {
  AccessGrant,
  GenomeDataset,
  GenomeFeatures,
  GenomeSegment,
  MedicalRecord,
  SCHEMA_PREFIX,
  chromOrder,
} from "../src/arkiv";
import { SEGMENT_HEADER_BYTES, SEGMENT_MAGIC } from "../src/manifest";

const SCHEMAS = { GenomeDataset, GenomeSegment, GenomeFeatures, MedicalRecord, AccessGrant };

/** Read a schema's name and columns without depending on SDK internals beyond what it exposes. */
function describeSchema(s: unknown): { name?: string; columns: Record<string, { type?: string; indexed?: boolean }> } {
  const obj = s as Record<string, unknown>;
  const columns = (obj.columns ?? obj.shape ?? {}) as Record<string, Record<string, unknown>>;
  const flat: Record<string, { type?: string; indexed?: boolean }> = {};
  for (const [k, c] of Object.entries(columns)) {
    flat[k] = { type: (c.type ?? c.kind) as string | undefined, indexed: (c.indexed ?? c.isIndexed) as boolean | undefined };
  }
  return { name: obj.name as string | undefined, columns: flat };
}

describe("Arkiv schemas", () => {
  it.each(Object.entries(SCHEMAS))("%s is named under the project schema prefix", (_n, schema) => {
    const { name } = describeSchema(schema);
    expect(name).toMatch(new RegExp(`^${SCHEMA_PREFIX}\\.[a-z_]+$`));
  });

  it("schema names are unique", () => {
    const names = Object.values(SCHEMAS).map((s) => describeSchema(s).name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(Object.entries(SCHEMAS))("%s stays within Arkiv's 31-attribute limit for named schemas", (_n, schema) => {
    expect(Object.keys(describeSchema(schema).columns).length).toBeLessThanOrEqual(31);
  });

  it("exposes columns the SDK can introspect (guards the checks above)", () => {
    expect(Object.keys(describeSchema(GenomeSegment).columns)).toEqual(
      expect.arrayContaining(["dataset", "chrom", "chromOrder", "swarmRef", "sha256Cipher"]),
    );
  });

  it("never indexes health findings — features are sealed bytes only", () => {
    const cols = describeSchema(GenomeFeatures).columns;
    expect(Object.keys(cols).sort()).toEqual(["dataset", "panelVersion", "patient", "summary"]);
  });
});

describe("chromOrder", () => {
  it("orders autosomes numerically, then X, Y, M", () => {
    const chroms = ["chrM", "chr10", "chrX", "chr2", "chr1", "chrY", "chr22"];
    expect([...chroms].sort((a, b) => chromOrder(a) - chromOrder(b))).toEqual(["chr1", "chr2", "chr10", "chr22", "chrX", "chrY", "chrM"]);
  });

  it("accepts names without the chr prefix and MT", () => {
    expect(chromOrder("7")).toBe(7);
    expect(chromOrder("MT")).toBe(25);
    expect(chromOrder("chrMT")).toBe(25);
  });

  it("puts unknown contigs last", () => {
    expect(chromOrder("chrUn_KI270302v1")).toBe(99);
  });
});

describe("segment file format constants", () => {
  it("header is 4-byte magic + 12-byte GCM nonce", () => {
    expect(SEGMENT_MAGIC).toHaveLength(4);
    expect(SEGMENT_HEADER_BYTES).toBe(16);
  });
});
