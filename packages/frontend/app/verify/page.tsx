"use client";

import { IDKitWidget, VerificationLevel, type ISuccessResult } from "@worldcoin/idkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useState } from "react";

const APP_ID  = process.env.NEXT_PUBLIC_WLD_APP_ID  as `app_${string}`;
const ACTION  = process.env.NEXT_PUBLIC_WLD_ACTION  ?? "genome_submission";

export default function VerifyPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [proof, setProof] = useState<ISuccessResult | null>(null);

  function onSuccess(result: ISuccessResult) {
    setProof(result);
    // Store proof in sessionStorage for use in genome upload page
    sessionStorage.setItem("wld_proof", JSON.stringify(result));
    router.push("/genome");
  }

  if (!address) {
    router.push("/");
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-bold text-genome-teal mb-2">Verify with World ID</h2>
        <p className="text-gray-400 text-sm">
          Orb verification proves you&apos;re a unique human.
          Your iris is never stored — only a zero-knowledge proof.
        </p>
      </div>

      <IDKitWidget
        app_id={APP_ID}
        action={ACTION}
        signal={address}
        onSuccess={onSuccess}
        verification_level={VerificationLevel.Orb}
      >
        {({ open }) => (
          <button
            onClick={open}
            className="px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold hover:opacity-90 transition"
          >
            Verify with World ID
          </button>
        )}
      </IDKitWidget>

      <p className="text-xs text-gray-600">
        No Orb nearby? Use the{" "}
        <a href="https://simulator.worldcoin.org" target="_blank" rel="noreferrer"
           className="text-genome-teal underline">
          World ID simulator
        </a>{" "}
        for testing.
      </p>
    </main>
  );
}
