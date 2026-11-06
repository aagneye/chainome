import { beforeEach, describe, expect, it, vi } from "vitest";
import { stringToHex } from "viem";

/** A chainable fake of publicClient.select(...).from(...).where(...)...fetch() keyed by schema name. */
const results = new Map<string, unknown[]>();
const calls: { schema?: string; where?: unknown; orderBy?: unknown }[] = [];
function query() {
  const q: Record<string, unknown> = {};
  const rec: { schema?: string; where?: unknown; orderBy?: unknown } = {};
  calls.push(rec);
  Object.assign(q, {
    from: (s: { name: string }) => ((rec.schema = s.name), q),
    where: (w: unknown) => ((rec.where = w), q),
    orderBy: (o: unknown) => ((rec.orderBy = o), q),
    limit: () => q,
    fetch: async () => ({ entities: results.get(rec.schema!) ?? [], skipped: 0 }),
  });
  return q;
}
vi.mock("@arkiv-network/sdk", async (orig) => ({
  ...(await orig<typeof import("@arkiv-network/sdk")>()),
  createPublicClient: () => ({ select: () => query() }),
}));

const { getGenomeForPatient } = await import("@/lib/arkiv-server");

const v = <T,>(value: T) => ({ value });
const K = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
const OLD = K(1);
const NEW = K(2);
function dataset(key: string, expires: bigint) {
  return {
    $key: key, $expiresAt: expires, build: v("GRCh38"), sourceFormat: v("vcf"), sourceBuild: v("GRCh38"), qcPass: v(true),
    hasRefCalls: v(false), variantCount: v(BigInt(4096123)), segmentCount: v(22), cipherBytes: v(BigInt(67_000_000)), titv: v("2.09"),
    hetHom: v("1.58"), manifestRef: v("cd".repeat(32)),
  };
}

beforeEach(() => {
  results.clear();
  calls.length = 0;
});

describe("getGenomeForPatient", () => {
  it("returns null when the wallet has no genome", async () => {
    expect(await getGenomeForPatient("0x000000000000000000000000000000000000dEaD")).toBeNull();
  });

  it("picks the latest dataset and maps segments and sealed features to plain JSON", async () => {
    results.set("chainome.genome_dataset", [dataset(OLD, BigInt(100)), dataset(NEW, BigInt(200))]);
    results.set("chainome.genome_segment", [
      { $key: K(3), chrom: v("chr1"), variantCount: v(BigInt(323430)), cipherBytes: v(BigInt(5315954)), swarmRef: v("ab".repeat(32)), sha256Cipher: v("c"), sha256Plain: v("p") },
    ]);
    results.set("chainome.genome_features", [{ summary: v(stringToHex('{"iv":"00"}')) }]);

    const g = await getGenomeForPatient("0x000000000000000000000000000000000000dEaD");
    expect(g!.dataset).toMatchObject({ key: NEW, variantCount: "4096123", segmentCount: 22, qcPass: true, hasRefCalls: false, expiresAtBlock: "200" });
    expect(g!.segments).toEqual([{ key: K(3), chrom: "chr1", variantCount: "323430", cipherBytes: "5315954", swarmRef: "ab".repeat(32), sha256Cipher: "c", sha256Plain: "p" }]);
    expect(g!.features).toBe('{"iv":"00"}');
    expect(() => JSON.stringify(g)).not.toThrow(); // no bigint left over for NextResponse.json
  });

  it("queries segments of that dataset, sorted by chromosome order", async () => {
    results.set("chainome.genome_dataset", [dataset(NEW, BigInt(200))]);
    await getGenomeForPatient("0x000000000000000000000000000000000000dEaD");
    const seg = calls.find((c) => c.schema === "chainome.genome_segment")!;
    expect(JSON.stringify(seg.where)).toContain("dataset");
    expect(JSON.stringify(seg.orderBy)).toContain("chromOrder");
  });

  it("returns features: null when the features entity is missing", async () => {
    results.set("chainome.genome_dataset", [dataset(NEW, BigInt(200))]);
    expect((await getGenomeForPatient("0x000000000000000000000000000000000000dEaD"))!.features).toBeNull();
  });
});
