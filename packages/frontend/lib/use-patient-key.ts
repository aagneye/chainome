"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { KEY_DERIVATION_MESSAGE, patientKeyFromSignature, publicKeyHex, type PatientKey } from "@/lib/genome-crypto";

// In-memory only, per wallet: survives client-side navigation, gone on reload. Never persisted.
const cache = new Map<string, PatientKey>();

/** The patient's X25519 key, derived from a signature over a fixed message (no transaction). */
export function usePatientKey() {
  const { address } = useAccount();
  const { signMessageAsync, isPending } = useSignMessage();
  const [key, setKey] = useState<PatientKey | undefined>(() => (address ? cache.get(address) : undefined));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setKey(address ? cache.get(address) : undefined), [address]);

  const derive = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      const signature = await signMessageAsync({ message: KEY_DERIVATION_MESSAGE });
      const k = patientKeyFromSignature(signature);
      cache.set(address, k);
      setKey(k);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "Signature rejected");
    }
  }, [address, signMessageAsync]);

  return { key, publicKey: key ? publicKeyHex(key) : undefined, derive, deriving: isPending, error };
}
