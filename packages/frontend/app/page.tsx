"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) router.push("/verify");
  }, [isConnected, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-genome-teal mb-2">GenomeChain</h1>
        <p className="text-gray-400 max-w-sm">
          Patient-sovereign genome + health records.<br />
          One genome per verified human, globally.
        </p>
      </div>
      <ConnectButton />
      <p className="text-xs text-gray-600">
        WorldChain Sepolia · World ID required for genome submission
      </p>
    </main>
  );
}
