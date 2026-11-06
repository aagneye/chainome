"use client";

import { IDKitWidget, VerificationLevel, type ISuccessResult } from "@worldcoin/idkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useState } from "react";

const APP_ID  = process.env.NEXT_PUBLIC_WLD_APP_ID  as `app_${string}`;
const ACTION  = process.env.NEXT_PUBLIC_WLD_ACTION  ?? "genome_submission";

type Status = "idle" | "verifying" | "success" | "denied";

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

  function onError(err?: { code?: string; message?: string }) {
    setStatus("denied");
    const msg = err?.code === "user_rejected"
      ? "Verification cancelled. You must complete World ID verification to continue."
      : err?.message
        ? `Verification failed: ${err.message}`
        : "Verification failed or was denied. Only verified humans can submit genomic data.";
    setError(msg);
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

  // Denied / cancelled path — blocked state
  if (status === "denied") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="animate-slide-up text-center max-w-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">{error}</p>
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/50 text-xs text-red-300 text-left mb-6">
            <p className="font-semibold mb-1">Why is verification required?</p>
            <p>GenomeChain enforces one genome per unique human via World ID. Unverified wallets cannot submit genomic data, preventing Sybil attacks that would pollute the research dataset.</p>
          </div>
          <button
            onClick={() => { setStatus("idle"); setError(null); }}
            className="px-5 py-2 rounded-lg border border-genome-border text-gray-300 text-sm hover:border-genome-teal hover:text-genome-teal transition"
          >
            Try Again
          </button>
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
        <p className="text-xs text-gray-600 mt-2">
          Orb verification · biometric · prevents duplicate genome submissions
        </p>
      </div>

      <IDKitWidget
        app_id={APP_ID}
        action={ACTION}
        signal={address}
        onSuccess={onSuccess}
        onError={onError}
        verification_level={VerificationLevel.Orb}
      >
        {({ open }: { open: () => void }) => (
          <div className="flex flex-col items-center gap-3">
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
            {status === "verifying" && (
              <button
                onClick={() => { setStatus("denied"); setError("Verification cancelled. You must complete World ID verification to continue."); }}
                className="text-xs text-gray-600 hover:text-gray-400 transition"
              >
                Cancel
              </button>
            )}
          </div>
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

      <div className="mt-6 p-3 rounded-lg bg-genome-card border border-genome-border text-xs text-gray-500 text-left max-w-xs">
        <p className="font-semibold text-gray-400 mb-1">What happens after verification:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Upload genome file (encrypted, stored on IPFS)</li>
          <li>Upload medical bills for GNM tokens</li>
          <li>Browse research studies and earn by participating</li>
        </ul>
      </div>
    </main>
  );
}
