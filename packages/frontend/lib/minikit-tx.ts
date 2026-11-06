/**
 * World App writes. wagmi has no connectors in this app (MiniKit owns the wallet), so every
 * contract write goes through MiniKit.sendTransaction. MiniKit v2 resolves with a user-operation
 * hash as soon as the bundler accepts it — not when it lands — so we poll World's userop status
 * (through /api/userop/<hash>) until it has a transaction hash or fails.
 *
 * Contracts must be allowlisted in the Developer Portal (Mini App → Permissions → Contract
 * Entrypoints) or World App rejects the call with `invalid_contract`.
 */
import { MiniKit } from "@worldcoin/minikit-js";
import type { Hex } from "viem";

/** Contracts are deployed on World Chain Sepolia unless configured otherwise. */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 4801);

export interface TxResult {
  userOpHash: string;
  /** undefined if the operation was accepted but not confirmed before the timeout */
  transactionHash?: string;
}

export class NotInWorldAppError extends Error {
  constructor() {
    super("Open Chainome inside World App to sign this.");
  }
}

/** Poll the userop status until it lands, fails, or the timeout passes. */
export async function waitForUserOp(
  userOpHash: string,
  { timeoutMs = 60_000, intervalMs = 2_000, fetchImpl = fetch }: { timeoutMs?: number; intervalMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetchImpl(`/api/userop/${userOpHash}`);
    if (res.ok) {
      const body: { status?: string; transaction_hash?: string | null } = await res.json();
      if (body.status === "success" && body.transaction_hash) return body.transaction_hash;
      if (body.status === "failed" || body.status === "error") throw new Error("Transaction failed on World Chain");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return undefined;
}

/** Send one contract call (pre-encoded calldata) from the user's World App wallet and wait for it. */
export async function sendCall(to: `0x${string}`, data: Hex, opts?: Parameters<typeof waitForUserOp>[1]): Promise<TxResult> {
  if (!MiniKit.isInstalled()) throw new NotInWorldAppError();
  const { data: result } = await MiniKit.sendTransaction({ chainId: CHAIN_ID, transactions: [{ to, data }] });
  const userOpHash = (result as { userOpHash: string }).userOpHash;
  return { userOpHash, transactionHash: await waitForUserOp(userOpHash, opts) };
}

/** Sign a plain message in World App (used to derive the patient's encryption key). */
export async function signMessage(message: string): Promise<string> {
  if (!MiniKit.isInstalled()) throw new NotInWorldAppError();
  const { data } = await MiniKit.signMessage({ message });
  return (data as { signature: string }).signature;
}
