import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenomeManifest } from "@chainome/shared/manifest";

const createEntity = vi.fn();
const executeBatch = vi.fn();
vi.mock("@arkiv-network/sdk", async (orig) => ({
  ...(await orig<typeof import("@arkiv-network/sdk")>()),
  createWalletClient: () => ({ createEntity, executeBatch }),
  createPublicClient: () => ({}),
}));

process.env.ARKIV_PRIVATE_KEY = "0x" + "11".repeat(32);
const { writeGenome } = await import("../src/arkiv");
const { GenomeDataset, GenomeFeatures, GenomeSegment } = await import("@chainome/shared/arkiv");

const key = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;
const wrapped = { epk: "aa", iv: "bb", ct: "cc" };

function manifest(segments: number): GenomeManifest {
  return {
    version: 1,
    createdAt: "2026-11-06T00:00:00Z",
    patient: "0x000000000000000000000000000000000000dEaD",
    patientPublicKey: "ff".repeat(32),
    anonId: "0123456789abcdef",
    source: { format: "vcf", build: "GRCh38", sha256: "00", bytes: 1 },
    build: "GRCh38",
    qc: { variantCount: 4096123, snps: 1, indels: 1, titv: 2.0912, hetHom: 1.5824, hasRefCalls: false, pass: true, notes: [] },
    pipeline: { version: "0.1.0", tools: {}, steps: [] },
    segments: Array.from({ length: segments }, (_, i) => ({
      chrom: `chr${i + 1}`, variantCount: 1000 + i, plainBytes: 10, cipherBytes: 42,
      sha256Plain: "p".repeat(64), sha256Cipher: "c".repeat(64), swarmRef: "ab".repeat(32), wrappedKey: wrapped,
    })),
  };
}

beforeEach(() => {
  let n = 0;
  createEntity.mockReset().mockImplementation(async () => ({ entityKey: key(++n), txHash: key(1000 + n), expiresAt: 0n }));
  executeBatch.mockReset().mockImplementation(async ({ creates }: { creates: unknown[] }) => ({
    txHash: key(2000 + n), createdEntities: creates.map(() => key(++n)),
  }));
});

describe("writeGenome", () => {
  it("writes one dataset, segments in batches of 10, then sealed features", async () => {
    const res = await writeGenome(manifest(22), "cd".repeat(32), { wrappedKey: wrapped, iv: "00", ct: "11" });

    expect(createEntity).toHaveBeenCalledTimes(2);
    expect(createEntity.mock.calls[0][0]).toBe(GenomeDataset);
    expect(createEntity.mock.calls[1][0]).toBe(GenomeFeatures);
    expect(executeBatch.mock.calls.map(([b]) => b.creates.length)).toEqual([10, 10, 2]);
    expect(res.segmentKeys).toHaveLength(22);
    expect(res.txHashes).toHaveLength(5);
    expect(res.datasetKey).toBe(key(1));
  });

  it("dataset entity carries QC, build and the manifest ref", async () => {
    await writeGenome(manifest(1), "cd".repeat(32), { wrappedKey: wrapped, iv: "00", ct: "11" });
    const values = createEntity.mock.calls[0][1];
    expect(values.manifestRef).toBe("cd".repeat(32));
    expect(values.build).toBe("GRCh38");
    expect(values.qcPass).toBe(true);
    expect(values.segmentCount).toBe(1);
    expect(JSON.stringify(values, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).toContain("4096123");
  });

  it("segments point at the dataset and carry chrom order, Swarm ref and both hashes", async () => {
    await writeGenome(manifest(3), "cd".repeat(32), { wrappedKey: wrapped, iv: "00", ct: "11" });
    const creates = executeBatch.mock.calls[0][0].creates;
    expect(creates.every((c: { schema: unknown }) => c.schema === GenomeSegment)).toBe(true);
    expect(creates.map((c: { values: { chromOrder: number } }) => c.values.chromOrder)).toEqual([1, 2, 3]);
    expect(creates[0].values).toMatchObject({ chrom: "chr1", swarmRef: "ab".repeat(32), sha256Cipher: "c".repeat(64), sha256Plain: "p".repeat(64) });
    expect(JSON.stringify(creates[0].values.dataset)).toContain(key(1).slice(2));
  });

  it("stores features only as the sealed blob — no readable phenotype", async () => {
    await writeGenome(manifest(1), "cd".repeat(32), { wrappedKey: wrapped, iv: "00", ct: "11" });
    const values = createEntity.mock.calls[1][1];
    const text = new TextDecoder().decode(values.summary);
    expect(JSON.parse(text)).toEqual({ wrappedKey: wrapped, iv: "00", ct: "11" });
  });

  it("every entity is written with an expiration", async () => {
    await writeGenome(manifest(2), "cd".repeat(32), { wrappedKey: wrapped, iv: "00", ct: "11" });
    for (const call of createEntity.mock.calls) expect(call[2].expiration).toBeDefined();
    for (const c of executeBatch.mock.calls[0][0].creates) expect(c.expiration).toBeDefined();
  });
});
