import { afterEach, describe, expect, it, vi } from "vitest";

const KEYS = ["ARKIV_PRIVATE_KEY", "LAB_PRIVATE_KEY", "REF_GRCH38", "PIPELINE_THREADS", "SWARM_BATCH_ID"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

async function loadConfig() {
  vi.resetModules();
  return import("../src/config");
}

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("config", () => {
  it("uses container defaults when nothing is set", async () => {
    for (const k of KEYS) delete process.env[k];
    const { env, MAX_INPUT_BYTES, PRIMARY_CHROMS } = await loadConfig();
    expect(env.refGrch38).toBe("/ref/hg38.fa");
    expect(env.threads).toBe(8);
    expect(env.swarmBatchId).toBeUndefined();
    expect(env.arkivPrivateKey).toBeUndefined();
    expect(MAX_INPUT_BYTES).toBe(2 * 1024 ** 3);
    expect(PRIMARY_CHROMS).toHaveLength(25);
    expect(PRIMARY_CHROMS.at(-1)).toBe("chrM");
  });

  it("treats blank values as unset", async () => {
    process.env.SWARM_BATCH_ID = "   ";
    const { env } = await loadConfig();
    expect(env.swarmBatchId).toBeUndefined();
  });

  it("accepts a 0x-prefixed hex private key", async () => {
    process.env.ARKIV_PRIVATE_KEY = "0x" + "11".repeat(32);
    const { env } = await loadConfig();
    expect(env.arkivPrivateKey).toBe("0x" + "11".repeat(32));
  });

  it("refuses a private key that isn't 0x-hex (fails at startup, not mid-upload)", async () => {
    process.env.LAB_PRIVATE_KEY = "11".repeat(32);
    await expect(loadConfig()).rejects.toThrow(/LAB_PRIVATE_KEY/);
  });
});
