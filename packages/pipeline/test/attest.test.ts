import { beforeEach, describe, expect, it, vi } from "vitest";

const writeContract = vi.fn();
const waitForTransactionReceipt = vi.fn();
const readContract = vi.fn();
vi.mock("viem", async (orig) => ({
  ...(await orig<typeof import("viem")>()),
  createWalletClient: () => ({ writeContract }),
  createPublicClient: () => ({ waitForTransactionReceipt, readContract }),
}));

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import("../src/attest");
}

const LAB = { LAB_PRIVATE_KEY: "0x" + "22".repeat(32), NEXT_PUBLIC_LAB_ATTESTATION: "0x" + "33".repeat(20) };

beforeEach(() => {
  writeContract.mockReset().mockResolvedValue("0xtx");
  waitForTransactionReceipt.mockReset().mockResolvedValue({ status: "success" });
  readContract.mockReset().mockResolvedValue(true);
});

describe("attest", () => {
  it("is skipped (undefined) when the lab key or contract is not configured", async () => {
    const { attest } = await load({ LAB_PRIVATE_KEY: undefined, NEXT_PUBLIC_LAB_ATTESTATION: undefined });
    expect(await attest(1n, "ref", true)).toBeUndefined();
    expect(writeContract).not.toHaveBeenCalled();
  });

  it("attests the manifest ref with a QC-dependent score and checks isValid", async () => {
    const { attest } = await load(LAB);
    expect(await attest(42n, "cd".repeat(32), true)).toBe("0xtx");
    expect(writeContract.mock.calls[0][0]).toMatchObject({ functionName: "attest", args: [42n, "cd".repeat(32), 95] });
    expect(readContract.mock.calls[0][0]).toMatchObject({ functionName: "isValid", args: [42n, "cd".repeat(32)] });
  });

  it("uses a lower score when QC failed", async () => {
    const { attest } = await load(LAB);
    await attest(1n, "r", false);
    expect(writeContract.mock.calls[0][0].args[2]).toBe(60);
  });

  it("fails loudly if the chain says the attestation is not valid", async () => {
    readContract.mockResolvedValue(false);
    const { attest } = await load(LAB);
    await expect(attest(1n, "r", true)).rejects.toThrow(/isValid/);
  });
});
