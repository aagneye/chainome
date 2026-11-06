"use client";

import { useState } from "react";
import { isAddress } from "viem";

function readAddress(): `0x${string}` | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = localStorage.getItem("minikit_address");
    if (stored && isAddress(stored)) return stored as `0x${string}`;
  } catch {}
  return undefined;
}

export function useMiniKitAddress(): `0x${string}` | undefined {
  // Lazy initializer runs synchronously on first render — no useEffect race with router guards.
  const [address] = useState<`0x${string}` | undefined>(readAddress);
  return address;
}
