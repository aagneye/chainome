"use client";

import { useEffect, useState } from "react";

// Reads the wallet address stored by MiniKit walletAuth
// Falls back gracefully when not inside World App
export function useMiniKitAddress(): `0x${string}` | undefined {
  const [address, setAddress] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    const stored = sessionStorage.getItem("minikit_address");
    if (stored) setAddress(stored as `0x${string}`);
  }, []);

  return address;
}
