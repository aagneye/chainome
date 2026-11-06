import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn();
const getHealth = vi.fn();
const stampGet = vi.fn();
const ctor = vi.fn();
vi.mock("@ethersphere/bee-js", () => ({
  Bee: class {
    constructor(url: string) {
      ctor(url);
    }
    data = { upload };
    status = { getHealth };
    stamp = { get: stampGet };
  },
}));

const REF = "ab".repeat(32);

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import("../src/swarm");
}

beforeEach(() => {
  upload.mockReset().mockResolvedValue({ reference: { toHex: () => REF } });
  getHealth.mockReset().mockResolvedValue({ status: "ok" });
  stampGet.mockReset().mockResolvedValue({ usable: true });
  ctor.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("swarm", () => {
  it("refuses to run without a postage batch", async () => {
    const s = await load({ SWARM_BATCH_ID: undefined });
    await expect(s.checkSwarm()).rejects.toThrow(/SWARM_BATCH_ID/);
  });

  it("preflight checks node health and that the batch is usable", async () => {
    const s = await load({ SWARM_BATCH_ID: "b".repeat(64), BEE_URL: "http://bee:1633" });
    await expect(s.checkSwarm()).resolves.toContain("http://bee:1633");
    expect(ctor).toHaveBeenCalledWith("http://bee:1633");
    expect(stampGet).toHaveBeenCalledWith("b".repeat(64));
  });

  it("preflight fails on an unusable batch", async () => {
    stampGet.mockResolvedValue({ usable: false });
    const s = await load({ SWARM_BATCH_ID: "b".repeat(64) });
    await expect(s.checkSwarm()).rejects.toThrow(/not usable/);
  });

  it("uploads file bytes without Swarm encryption and returns the hex reference", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gc-swarm-"));
    await writeFile(join(dir, "seg.enc"), Buffer.from("GCv1ciphertext"));
    const s = await load({ SWARM_BATCH_ID: "b".repeat(64) });
    expect(await s.uploadFile(join(dir, "seg.enc"), "chr1")).toBe(REF);
    const [batch, body, opts] = upload.mock.calls[0];
    expect(batch).toBe("b".repeat(64));
    expect(Buffer.from(body).toString()).toBe("GCv1ciphertext");
    expect(opts).toEqual({ pin: true }); // never { encrypt: true }: encrypted refs embed their key
  });

  it("uploads JSON manifests", async () => {
    const s = await load({ SWARM_BATCH_ID: "b".repeat(64) });
    await s.uploadJson({ version: 1 }, "manifest");
    expect(JSON.parse(upload.mock.calls[0][1])).toEqual({ version: 1 });
  });

  it("retries a failed upload", async () => {
    vi.useFakeTimers();
    upload.mockRejectedValueOnce(new Error("timeout"));
    const s = await load({ SWARM_BATCH_ID: "b".repeat(64) });
    const p = s.uploadJson({}, "manifest");
    await vi.runAllTimersAsync();
    expect(await p).toBe(REF);
    expect(upload).toHaveBeenCalledTimes(2);
  });
});
