"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useMiniKitAddress } from "@/hooks/useMiniKitAddress";
import { keccak256, toBytes } from "viem";

/**
 * Mock Federated Learning publication demo.
 *
 * Shows the loop closing:
 *   institution runs FL study → submits aggregated results → hash published on WorldChain
 *   → smart contract routes findings to matching patient profiles
 *
 * For the hackathon: simulates a completed FL study with mocked result JSON.
 * Production: institution calls this after their FL aggregation completes.
 */

const MOCK_STUDY = {
  title:          "BRCA2 Carriers — Olaparib Response (Chainome Study GC-001)",
  nctNumber:      "NCT99000001",
  institution:    "0xMockPharmaCo",
  primaryEndpoint:"Overall response rate at 12 months",
  population:     "BRCA2 rs80359550 carriers, prior platinum chemotherapy",
  finding:        "ORR 72% vs 36% placebo (p < 0.001). Median PFS 13.6 vs 7.2 months.",
  variantTag:     "BRCA2 rs80359550",
  drugName:       "Olaparib",
  icd10:          "C50.919",
  approval:       "FDA approved 2026-10-15",
  registeredHash: "0xd1e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
};

export default function PublicationPage() {
  const address = useMiniKitAddress();
  const [published, setPublished] = useState(false);
  const [resultsHash, setResultsHash] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function computeResultsHash() {
    const json = JSON.stringify(MOCK_STUDY, null, 2);
    return keccak256(toBytes(json));
  }

  async function handlePublish() {
    const hash = computeResultsHash();
    setResultsHash(hash);

    // In production: call PublicationRegistry.publishResult(hash, metadata)
    // For demo: just show the hash and simulate the tx
    setPublished(true);
  }

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-genome-teal mb-2">FL Study Publication</h1>
      <p className="text-gray-400 text-sm mb-8">
        Demo: federated learning study completed. Publish results hash on WorldChain.
        Smart contract routes findings to matching patients.
      </p>

      <div className="p-5 rounded-xl bg-genome-card border border-genome-border mb-6">
        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3">Mock Study Results</p>
        <div className="space-y-2">
          {Object.entries(MOCK_STUDY).map(([k, v]) => (
            <div key={k} className="flex gap-3 text-sm">
              <span className="text-gray-500 w-36 shrink-0 capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
              <span className="text-gray-200 font-mono text-xs break-all">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {!published && (
        <button
          onClick={handlePublish}
          disabled={isPending}
          className="w-full px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold hover:opacity-90 transition disabled:opacity-40"
        >
          Publish Results Hash on WorldChain
        </button>
      )}

      {published && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-green-900/20 border border-green-500/30">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Results Hash Published</p>
            <code className="text-xs text-gray-300 break-all">{resultsHash}</code>
          </div>

          <div className="p-4 rounded-xl bg-genome-card border border-genome-border">
            <p className="text-xs font-semibold text-genome-teal uppercase tracking-wider mb-3">
              Patients Matched &amp; Notified
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-genome-teal inline-block shrink-0"></span>
                <span className="text-gray-300">
                  All patients with <code className="text-genome-violet">BRCA2 rs80359550</code> variant will receive a Research Alert
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-genome-teal inline-block shrink-0"></span>
                <span className="text-gray-300">
                  Study reward tokens distributed pro-rata to participating data contributors
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-genome-teal inline-block shrink-0"></span>
                <span className="text-gray-300">
                  Protocol hash cross-referenced: matches pre-registered hash — no outcome switching detected ✓
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-genome-card border border-genome-border">
            <p className="text-xs text-gray-500">
              Protocol pre-registered at block timestamp before trial start.
              Results hash matches → primary endpoint unchanged from pre-registration.
              Cryptographic proof of research integrity on WorldChain.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
