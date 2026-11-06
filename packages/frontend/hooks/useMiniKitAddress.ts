"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";

// Reads the wallet address stored by MiniKit walletAuth
// Falls back gracefully when not inside World App
export function useMiniKitAddress(): `0x${string}` | undefined {
  const [address, setAddress] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    const stored = sessionStorage.getItem("minikit_address");
    // Typed as an address so wagmi/viem calls accept it; anything else stored there is ignored.
    if (stored && isAddress(stored)) setAddress(stored);
  }, []);

  return address;
}
