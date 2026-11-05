"use client";

import { IDKitWidget, VerificationLevel, type ISuccessResult } from "@worldcoin/idkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useState } from "react";

const APP_ID  = process.env.NEXT_PUBLIC_WLD_APP_ID  as `app_${string}`;
const ACTION  = process.env.NEXT_PUBLIC_WLD_ACTION  ?? "genome_submission";

type Status = "idle" | "verifying" | "success";

export default function VerifyPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function onSuccess(result: ISuccessResult) {
    setStatus("success");
    sessionStorage.setItem("wld_proof", JSON.stringify(result));
    setTimeout(() => router.push("/genome"), 1200);
  }

  if (!address) {
    router.push("/");
    return null;
  }

  if (status === "success") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="animate-slide-up text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-genome-teal/20 flex items-center justify-center animate-pulse-glow">
            <svg className="w-8 h-8 text-genome-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-genome-teal mb-1">Verified</h2>
          <p className="text-gray-400 text-sm">Redirecting to genome upload…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="animate-slide-up text-center max-w-sm">
        <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-genome-card border border-genome-border flex items-center justify-center">
          <svg className="w-7 h-7 text-genome-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-genome-teal mb-2">Verify with World ID</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
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
            onClick={() => { setError(null); setStatus("verifying"); open(); }}
            disabled={status === "verifying"}
            className="relative px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold
                       hover:opacity-90 active:scale-95 transition-all disabled:opacity-60
                       shadow-[0_0_20px_rgba(0,201,167,0.25)]"
          >
            {status === "verifying" ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Opening World ID…
              </span>
            ) : (
              "Verify with World ID"
            )}
          </button>
        )}
      </IDKitWidget>

      {error && (
        <div className="animate-fade-in px-4 py-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm max-w-sm text-center">
          {error}
        </div>
      )}

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
