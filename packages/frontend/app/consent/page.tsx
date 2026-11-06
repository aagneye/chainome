"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";

export default function ConsentPage() {
  const { address } = useAccount();
  const [institution, setInstitution] = useState("");
  const [expireDays, setExpireDays] = useState(365);
  const [checkAddr, setCheckAddr] = useState("");
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"grant" | "revoke" | "check">("grant");
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const { writeContract: grant, data: grantHash, isPending: granting } = useWriteContract();
  const { writeContract: revoke, data: revokeHash, isPending: revoking } = useWriteContract();
  const { isSuccess: grantOk } = useWaitForTransactionReceipt({ hash: grantHash });
  const { isSuccess: revokeOk } = useWaitForTransactionReceipt({ hash: revokeHash });

  const { refetch: checkConsent } = useReadContract({
    address: CONTRACTS.consentManager.address as `0x${string}`,
    abi: CONTRACTS.consentManager.abi,
    functionName: "hasConsent",
    args: address && checkAddr ? [address, checkAddr as `0x${string}`] : undefined,
    query: { enabled: false },
  });

  async function handleGrant() {
    if (!institution) return;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + expireDays * 86400);
    grant({
      address: CONTRACTS.consentManager.address as `0x${string}`,
      abi: CONTRACTS.consentManager.abi,
      functionName: "grantConsent",
      args: [institution as `0x${string}`, expiry, "0x" + "0".repeat(64) as `0x${string}`],
    });
  }

  async function handleRevoke() {
    if (!institution) return;
    revoke({
      address: CONTRACTS.consentManager.address as `0x${string}`,
      abi: CONTRACTS.consentManager.abi,
      functionName: "revokeConsent",
      args: [institution as `0x${string}`],
    });
    setShowRevokeConfirm(false);
  }

  async function handleCheck() {
    if (!checkAddr) return;
    const result = await checkConsent();
    setHasConsent(result.data as boolean ?? null);
  }

  const MODES = [
    { key: "grant",  label: "Grant" },
    { key: "revoke", label: "Revoke" },
    { key: "check",  label: "Check" },
  ] as const;

  return (
    <main className="min-h-screen px-4 py-10 max-w-lg mx-auto">
      <div className="animate-slide-up mb-8">
        <h1 className="text-3xl font-bold text-genome-teal mb-2">Consent Manager</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Grant or revoke institutional access to your health data.
          All consent is timestamped on-chain (21 CFR Part 11 compatible).
        </p>
      </div>

      {/* Mode tabs with animated underline */}
      <div className="relative flex border-b border-genome-border mb-8">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setShowRevokeConfirm(false); }}
            className={`relative px-5 py-2.5 text-sm font-medium transition-colors ${
              mode === key ? "text-genome-teal" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
            {mode === key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-genome-teal rounded-full" />
            )}
          </button>
        ))}
      </div>

      {(mode === "grant" || mode === "revoke") && (
        <div className="animate-fade-in space-y-5">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium uppercase tracking-wider">
              Institution address
            </label>
            <input
              type="text"
              placeholder="0x…"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-genome-card border border-genome-border
                         text-gray-200 font-mono text-sm transition focus:outline-none focus:border-genome-teal"
            />
          </div>

          {mode === "grant" && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium uppercase tracking-wider">
                Consent duration
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={expireDays}
                  onChange={(e) => setExpireDays(Number(e.target.value))}
                  min={1}
                  max={3650}
                  className="w-32 px-4 py-2.5 rounded-lg bg-genome-card border border-genome-border
                             text-gray-200 focus:outline-none focus:border-genome-teal transition"
                />
                <span className="text-gray-500 text-sm">days</span>
                <span className="text-gray-600 text-xs">
                  (~{Math.round(expireDays / 30)} mo)
                </span>
              </div>
            </div>
          )}

          {/* Revoke confirmation dialog */}
          {mode === "revoke" && showRevokeConfirm && (
            <div className="animate-fade-in p-4 rounded-xl bg-red-900/20 border border-red-800/60 space-y-3">
              <p className="text-sm text-red-300 font-medium">Confirm revocation</p>
              <p className="text-xs text-red-400/80 leading-relaxed">
                This will revoke on-chain access for{" "}
                <span className="font-mono text-red-300">{institution.slice(0, 10)}…</span>.
                The institution will lose access to your records immediately.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium
                             hover:bg-red-500 transition disabled:opacity-50"
                >
                  {revoking ? "Confirming…" : "Yes, revoke"}
                </button>
                <button
                  onClick={() => setShowRevokeConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-genome-border text-gray-400
                             text-sm hover:border-gray-500 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Success cards */}
          {grantOk && (
            <div className="animate-fade-in flex items-center gap-3 p-4 rounded-xl bg-genome-teal/10 border border-genome-teal/30">
              <svg className="w-5 h-5 text-genome-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-genome-teal text-sm font-medium">Consent granted on-chain</p>
            </div>
          )}
          {revokeOk && (
            <div className="animate-fade-in flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800/40">
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="text-red-400 text-sm font-medium">Consent revoked on-chain</p>
            </div>
          )}

          <button
            onClick={mode === "grant" ? handleGrant : () => setShowRevokeConfirm(true)}
            disabled={!institution || granting || revoking || (mode === "revoke" && showRevokeConfirm) || !CONTRACTS.consentManager}
            className={`w-full px-6 py-3 rounded-lg font-semibold transition-all active:scale-[0.98] disabled:opacity-40 ${
              mode === "revoke"
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-genome-teal text-black hover:opacity-90 shadow-[0_0_20px_rgba(0,201,167,0.2)]"
            }`}
          >
            {granting || revoking ? "Confirming…" : mode === "grant" ? "Grant Consent" : "Revoke Access"}
          </button>
        </div>
      )}

      {mode === "check" && (
        <div className="animate-fade-in space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium uppercase tracking-wider">
              Institution address to check
            </label>
            <input
              type="text"
              placeholder="0x…"
              value={checkAddr}
              onChange={(e) => { setCheckAddr(e.target.value); setHasConsent(null); }}
              className="w-full px-4 py-2.5 rounded-lg bg-genome-card border border-genome-border
                         text-gray-200 font-mono text-sm focus:outline-none focus:border-genome-teal transition"
            />
          </div>
          <button
            onClick={handleCheck}
            disabled={!checkAddr}
            className="w-full px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold
                       hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            Check Consent
          </button>

          {hasConsent !== null && (
            <div className={`animate-fade-in flex items-center gap-3 p-4 rounded-xl border ${
              hasConsent
                ? "bg-genome-teal/10 border-genome-teal/30"
                : "bg-red-900/20 border-red-800/40"
            }`}>
              {hasConsent ? (
                <>
                  <svg className="w-5 h-5 text-genome-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-genome-teal text-sm font-medium">Active consent exists</p>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <p className="text-red-400 text-sm font-medium">No active consent</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
