"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { CONTRACTS } from "@/lib/contracts";
import Skeleton from "@/components/Skeleton";

const APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`;

interface RiskScore {
  condition: string;
  risk: "low" | "moderate" | "high";
  percentile: number;
  confidence: number;
  variants?: string[];
}

interface PharmacogenomicsEntry {
  gene: string;
  variant: string;
  drug: string;
  effect: string;
  action: string;
}

interface HealthInsights {
  riskScores: RiskScore[];
  pharmacogenomics: PharmacogenomicsEntry[];
  ancestryMarkers: { population: string; proportion: number }[];
  computedAt: number;
  source: "0g-private-compute" | "stub";
}

const RISK_COLOR: Record<string, string> = {
  low:      "text-green-400",
  moderate: "text-yellow-400",
  high:     "text-red-400",
};

const RISK_BAR: Record<string, string> = {
  low:      "bg-green-500",
  moderate: "bg-yellow-500",
  high:     "bg-red-500",
};

/** Skeleton placeholder block */
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-shimmer rounded-lg ${className ?? ""}`} />;
}

export default function InsightsPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [insights, setInsights] = useState<HealthInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [agentPassVerified, setAgentPassVerified] = useState(false);

  // Trigger progress bar transitions after mount
  useEffect(() => { setMounted(true); }, []);

  const proofRaw = typeof window !== "undefined" ? sessionStorage.getItem("wld_proof") : null;
  const nullifierHash = proofRaw ? JSON.parse(proofRaw).nullifier_hash : null;

  const { data: genomeCID } = useReadContract({
    address: CONTRACTS.genomeRegistry.address as `0x${string}`,
    abi: CONTRACTS.genomeRegistry.abi,
    functionName: "genomeCID",
    args: nullifierHash ? [BigInt(nullifierHash)] : undefined,
    query: { enabled: !!nullifierHash },
  });

  const { data: recordCount } = useReadContract({
    address: CONTRACTS.recordVault.address as `0x${string}`,
    abi: CONTRACTS.recordVault.abi,
    functionName: "getRecordCount",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  async function fetchInsights() {
    if (!genomeCID) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genomeCID:    genomeCID as string,
          recordCIDs:   [],
          nullifierHash: nullifierHash ?? undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setInsights(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (genomeCID && agentPassVerified) fetchInsights();
  }, [genomeCID, agentPassVerified]);

  if (!address) {
    router.push("/");
    return null;
  }

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <div className="animate-slide-up mb-8">
        <h1 className="text-3xl font-bold text-genome-teal mb-1">Health Insights</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Computed via{" "}
          <span className="text-genome-violet font-medium">0G Private Compute</span>
          {" "}— your genome CID is processed inside a confidential execution environment.
          Raw data never leaves your encrypted node.
          {insights?.source === "stub" && (
            <span className="ml-1 text-gray-600">(stub mode — no ZERO_G_API_KEY set)</span>
          )}
        </p>
      </div>

      {!genomeCID && (
        <div className="animate-fade-in p-6 rounded-xl bg-genome-card border border-genome-border text-center">
          <p className="text-gray-400 mb-4">No genome registered yet.</p>
          <button
            onClick={() => router.push("/genome")}
            className="px-5 py-2 rounded-lg bg-genome-teal text-black font-semibold hover:opacity-90 transition"
          >
            Submit Genome
          </button>
        </div>
      )}

      {/* Agent Pass gate */}
      {genomeCID && !agentPassVerified && (
        <div className="animate-fade-in p-6 rounded-xl bg-genome-card border border-genome-border text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-genome-violet/20 border border-genome-violet/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-genome-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-genome-violet mb-2">Agent Pass Required</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-5 max-w-xs mx-auto">
            AI-generated health insights require World ID Agent Pass verification.
            This prevents AI interpretations from being attributed to unverified actors.
          </p>
          <IDKitWidget
            app_id={APP_ID}
            action="request_health_insights"
            signal={address ?? ""}
            onSuccess={(result) => {
              sessionStorage.setItem("agent_pass_proof", JSON.stringify(result));
              setAgentPassVerified(true);
            }}
            verification_level={VerificationLevel.Device}
          >
            {({ open }) => (
              <button
                onClick={open}
                className="px-5 py-2.5 rounded-lg bg-genome-violet text-white font-semibold hover:opacity-90 transition shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              >
                Unlock with Agent Pass
              </button>
            )}
          </IDKitWidget>
          <p className="text-xs text-gray-600 mt-4">
            Uses Device verification — no Orb required · Proof expires per session
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {genomeCID && agentPassVerified && loading && (
        <div className="animate-fade-in space-y-8">
          <section>
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-genome-card border border-genome-border">
                  <div className="flex justify-between mb-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          </section>
          <section>
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-genome-card border border-genome-border">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-48 mb-1" />
                  <Skeleton className="h-3 w-56" />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {error && (
        <div className="animate-fade-in px-4 py-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
          {error}
        </div>
      )}

      {insights && (
        <div className="space-y-8">
          {/* Risk Scores */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Polygenic Risk Scores
            </h2>
            <div className="space-y-3">
              {insights.riskScores.map((r, i) => (
                <div
                  key={r.condition}
                  className="animate-slide-up p-4 rounded-xl bg-genome-card border border-genome-border"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-200">{r.condition}</span>
                    <span className={`text-xs font-semibold ${RISK_COLOR[r.risk]}`}>
                      {r.risk.toUpperCase()} · {r.percentile}th percentile
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-genome-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${RISK_BAR[r.risk]} transition-[width] duration-700 ease-out`}
                      style={{ width: mounted ? `${r.percentile}%` : "0%" }}
                    />
                  </div>
                  {r.variants && (
                    <p className="text-xs text-gray-600 mt-2">Variants: {r.variants.join(", ")}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">Confidence: {(r.confidence * 100).toFixed(0)}%</p>
                </div>
              ))}
            </div>
          </section>

          {/* Pharmacogenomics */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Pharmacogenomics
            </h2>
            <div className="space-y-3">
              {insights.pharmacogenomics.map((p, i) => (
                <div
                  key={p.gene + p.drug}
                  className="animate-slide-up p-4 rounded-xl bg-genome-card border border-genome-border"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-genome-teal">{p.gene}</span>
                    <span className="text-xs text-gray-500 font-mono">{p.variant}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-200">{p.drug}</p>
                  <p className="text-xs text-gray-400 mt-1">{p.effect}</p>
                  <p className="text-xs text-genome-violet mt-1 font-medium">→ {p.action}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Ancestry */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Ancestry Composition
            </h2>
            <div className="animate-slide-up p-4 rounded-xl bg-genome-card border border-genome-border space-y-3">
              {insights.ancestryMarkers.map((a, i) => (
                <div key={a.population} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{a.population}</span>
                    <span className="text-genome-teal">{(a.proportion * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-genome-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-genome-teal transition-[width] duration-700 ease-out"
                      style={{ width: mounted ? `${a.proportion * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs text-gray-700 text-center">
            Computed {new Date(insights.computedAt).toLocaleString()} · For informational purposes only · Consult a physician
          </p>
        </div>
      )}
    </main>
  );
}
