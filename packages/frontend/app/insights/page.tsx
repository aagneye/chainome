"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { CONTRACTS } from "@/lib/contracts";

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

export default function InsightsPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [insights, setInsights] = useState<HealthInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Probe sessionStorage for the proof's nullifier_hash to look up genomeCID
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
    if (genomeCID) fetchInsights();
  }, [genomeCID]);

  if (!address) {
    router.push("/");
    return null;
  }

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-genome-teal mb-1">Health Insights</h1>
        <p className="text-gray-400 text-sm">
          Computed via{" "}
          <span className="text-genome-violet font-medium">0G Private Computer</span>
          {" "}— your genome CID is processed inside a confidential execution environment.
          Raw data never leaves your encrypted node.
          {insights?.source === "stub" && (
            <span className="ml-1 text-gray-600">(stub mode — no ZERO_G_API_KEY set)</span>
          )}
        </p>
      </div>

      {!genomeCID && (
        <div className="p-6 rounded-xl bg-genome-card border border-genome-border text-center">
          <p className="text-gray-400 mb-4">No genome registered yet.</p>
          <button
            onClick={() => router.push("/genome")}
            className="px-5 py-2 rounded-lg bg-genome-teal text-black font-semibold hover:opacity-90 transition"
          >
            Submit Genome
          </button>
        </div>
      )}

      {genomeCID && loading && (
        <div className="text-gray-400 text-sm animate-pulse">Computing insights via 0G…</div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {insights && (
        <div className="space-y-8">
          {/* Risk Scores */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Polygenic Risk Scores</h2>
            <div className="space-y-3">
              {insights.riskScores.map((r) => (
                <div key={r.condition} className="p-4 rounded-xl bg-genome-card border border-genome-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-200">{r.condition}</span>
                    <span className={`text-sm font-semibold ${RISK_COLOR[r.risk]}`}>
                      {r.risk.toUpperCase()} · {r.percentile}th percentile
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-genome-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${RISK_BAR[r.risk]} transition-all`}
                      style={{ width: `${r.percentile}%` }}
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Pharmacogenomics</h2>
            <div className="space-y-3">
              {insights.pharmacogenomics.map((p) => (
                <div key={p.gene + p.drug} className="p-4 rounded-xl bg-genome-card border border-genome-border">
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Ancestry Composition</h2>
            <div className="p-4 rounded-xl bg-genome-card border border-genome-border space-y-3">
              {insights.ancestryMarkers.map((a) => (
                <div key={a.population}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{a.population}</span>
                    <span className="text-genome-teal">{(a.proportion * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-genome-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-genome-teal transition-all"
                      style={{ width: `${a.proportion * 100}%` }}
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
