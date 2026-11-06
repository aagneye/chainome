"use client";

import { useCallback, useState } from "react";
import type { Hex } from "viem";
import { sendCall, type TxResult } from "@/lib/minikit-tx";

/**
 * Drop-in for wagmi's useWriteContract + useWaitForTransactionReceipt, backed by MiniKit.
 * `isSuccess` means World Chain confirmed it; `isSubmitted` means World App accepted it
 * (confirmation may still be pending if the status poll timed out).
 */
export function useMiniKitTx() {
  const [isPending, setPending] = useState(false);
  const [result, setResult] = useState<TxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (to: `0x${string}`, data: Hex) => {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const r = await sendCall(to, data);
      setResult(r);
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    send,
    reset,
    isPending,
    isSubmitted: !!result,
    isSuccess: !!result?.transactionHash,
    txHash: result?.transactionHash,
    userOpHash: result?.userOpHash,
    error,
  };
}
