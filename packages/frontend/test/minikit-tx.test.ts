import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeFunctionData, encodeFunctionData } from "viem";
import { RECORD_VAULT_ABI } from "@/lib/contracts";

const isInstalled = vi.fn();
const sendTransaction = vi.fn();
const signMessageMk = vi.fn();
vi.mock("@worldcoin/minikit-js", () => ({
  MiniKit: { isInstalled, sendTransaction, signMessage: signMessageMk },
}));

const { CHAIN_ID, NotInWorldAppError, sendCall, signMessage, waitForUserOp } = await import("@/lib/minikit-tx");

const OP = "0x" + "aa".repeat(32);
const TX = "0x" + "bb".repeat(32);
const VAULT = "0x00000000000000000000000000000000000000b1" as const;

function statusSequence(...bodies: Array<object | number>) {
  const fetchImpl = vi.fn();
  for (const b of bodies) {
    fetchImpl.mockResolvedValueOnce(typeof b === "number" ? new Response("x", { status: b }) : Response.json(b));
  }
  return fetchImpl as unknown as typeof fetch;
}

beforeEach(() => {
  isInstalled.mockReset().mockReturnValue(true);
  sendTransaction.mockReset().mockResolvedValue({ executedWith: "minikit", data: { userOpHash: OP, status: "success" } });
  signMessageMk.mockReset().mockResolvedValue({ executedWith: "minikit", data: { signature: "0xsig", address: "0x1" } });
});
afterEach(() => vi.useRealTimers());

describe("waitForUserOp", () => {
  it("returns the transaction hash once the userop succeeds", async () => {
    const fetchImpl = statusSequence({ status: "pending" }, { status: "success", transaction_hash: TX });
    expect(await waitForUserOp(OP, { intervalMs: 1, fetchImpl })).toBe(TX);
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe(`/api/userop/${OP}`);
  });

  it("keeps polling through transient errors", async () => {
    const fetchImpl = statusSequence(502, { status: "success", transaction_hash: TX });
    expect(await waitForUserOp(OP, { intervalMs: 1, fetchImpl })).toBe(TX);
  });

  it("throws when the userop failed on chain", async () => {
    const fetchImpl = statusSequence({ status: "failed" });
    await expect(waitForUserOp(OP, { intervalMs: 1, fetchImpl })).rejects.toThrow(/failed/);
  });

  it("returns undefined (submitted, unconfirmed) after the timeout", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ status: "pending" })) as unknown as typeof fetch;
    expect(await waitForUserOp(OP, { timeoutMs: 20, intervalMs: 5, fetchImpl })).toBeUndefined();
  });
});

describe("sendCall", () => {
  const data = encodeFunctionData({ abi: RECORD_VAULT_ABI, functionName: "addRecord", args: ["cd".repeat(32), "Lab Report"] });

  it("sends pre-encoded calldata on the configured chain and waits for the receipt", async () => {
    const res = await sendCall(VAULT, data, { intervalMs: 1, fetchImpl: statusSequence({ status: "success", transaction_hash: TX }) });
    expect(res).toEqual({ userOpHash: OP, transactionHash: TX });
    const [opts] = sendTransaction.mock.calls[0];
    expect(opts.chainId).toBe(CHAIN_ID);
    expect(opts.transactions).toEqual([{ to: VAULT, data }]);
    expect(decodeFunctionData({ abi: RECORD_VAULT_ABI, data: opts.transactions[0].data }).args).toEqual(["cd".repeat(32), "Lab Report"]);
  });

  it("defaults to World Chain Sepolia (where the contracts are deployed)", () => {
    expect(CHAIN_ID).toBe(Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 4801));
  });

  it("refuses outside World App instead of failing silently", async () => {
    isInstalled.mockReturnValue(false);
    await expect(sendCall(VAULT, data)).rejects.toBeInstanceOf(NotInWorldAppError);
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("propagates a rejected transaction", async () => {
    sendTransaction.mockRejectedValue(new Error("user_rejected"));
    await expect(sendCall(VAULT, data)).rejects.toThrow("user_rejected");
  });
});

describe("signMessage", () => {
  it("returns the World App signature for the exact message", async () => {
    expect(await signMessage("Chainome encryption key v1")).toBe("0xsig");
    expect(signMessageMk).toHaveBeenCalledWith({ message: "Chainome encryption key v1" });
  });

  it("refuses outside World App", async () => {
    isInstalled.mockReturnValue(false);
    await expect(signMessage("x")).rejects.toBeInstanceOf(NotInWorldAppError);
  });
});
