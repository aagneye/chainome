"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { useEffect } from "react";

export default function MiniKitProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Install MiniKit — connects the page to World App's native layer
    MiniKit.install(process.env.NEXT_PUBLIC_WLD_APP_ID);
  }, []);

  return <>{children}</>;
}
