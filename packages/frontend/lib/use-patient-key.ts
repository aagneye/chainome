"use client";

import { useCallback, useEffect, useState } from "react";
import { useMiniKitAddress } from "@/hooks/useMiniKitAddress";
import { KEY_DERIVATION_MESSAGE, patientKeyFromSignature, publicKeyHex, type PatientKey } from "@/lib/genome-crypto";
import { signMessage } from "@/lib/minikit-tx";

// In-memory only, per wallet: survives client-side navigation, gone on reload. Never persisted.
const cache = new Map<string, PatientKey>();

/** The patient's X25519 key, derived from a World App signature over a fixed message (no transaction). */
export function usePatientKey() {
  const address = useMiniKitAddress();
  const [key, setKey] = useState<PatientKey | undefined>(() => (address ? cache.get(address) : undefined));
  const [deriving, setDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setKey(address ? cache.get(address) : undefined), [address]);

  const derive = useCallback(async () => {
    if (!address) return;
    setError(null);
    setDeriving(true);
    try {
      const k = patientKeyFromSignature(await signMessage(KEY_DERIVATION_MESSAGE));
      cache.set(address, k);
      setKey(k);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "Signature rejected");
    } finally {
      setDeriving(false);
    }
  }, [address]);

  return { address, key, publicKey: key ? publicKeyHex(key) : undefined, derive, deriving, error };
}
