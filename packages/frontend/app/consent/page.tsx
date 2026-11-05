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
  }

  async function handleCheck() {
    if (!checkAddr) return;
    const result = await checkConsent();
    setHasConsent(result.data as boolean ?? null);
  }

  return (
    <main className="min-h-screen px-4 py-10 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-genome-teal mb-2">Consent Manager</h1>
      <p className="text-gray-400 text-sm mb-8">
        Grant or revoke institutional access to your health data. All consent is timestamped on-chain (21 CFR Part 11 compatible).
      </p>

      <div className="flex gap-2 mb-6">
        {(["grant", "revoke", "check"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === m
                ? "bg-genome-teal text-black"
                : "border border-genome-border text-gray-400 hover:border-genome-teal"
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {(mode === "grant" || mode === "revoke") && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Institution address</label>
            <input
              type="text"
              placeholder="0x..."
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-genome-card border border-genome-border text-gray-200 font-mono text-sm focus:outline-none focus:border-genome-teal"
            />
          </div>

          {mode === "grant" && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Consent duration (days)</label>
              <input
                type="number"
                value={expireDays}
                onChange={(e) => setExpireDays(Number(e.target.value))}
                min={1}
                max={3650}
                className="w-full px-4 py-2 rounded-lg bg-genome-card border border-genome-border text-gray-200 focus:outline-none focus:border-genome-teal"
              />
            </div>
          )}

          {(grantOk || revokeOk) && (
            <p className="text-genome-teal text-sm">
              ✓ Consent {mode === "grant" ? "granted" : "revoked"} on-chain
            </p>
          )}

          <button
            onClick={mode === "grant" ? handleGrant : handleRevoke}
            disabled={!institution || granting || revoking}
            className="w-full px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold hover:opacity-90 transition disabled:opacity-40"
          >
            {granting || revoking ? "Confirming…" : mode === "grant" ? "Grant Consent" : "Revoke Consent"}
          </button>
        </div>
      )}

      {mode === "check" && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Institution address to check</label>
            <input
              type="text"
              placeholder="0x..."
              value={checkAddr}
              onChange={(e) => { setCheckAddr(e.target.value); setHasConsent(null); }}
              className="w-full px-4 py-2 rounded-lg bg-genome-card border border-genome-border text-gray-200 font-mono text-sm focus:outline-none focus:border-genome-teal"
            />
          </div>
          <button
            onClick={handleCheck}
            disabled={!checkAddr}
            className="w-full px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold hover:opacity-90 transition disabled:opacity-40"
          >
            Check Consent
          </button>
          {hasConsent !== null && (
            <p className={`text-sm font-medium ${hasConsent ? "text-genome-teal" : "text-red-400"}`}>
              {hasConsent ? "✓ Active consent exists" : "✗ No active consent"}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
