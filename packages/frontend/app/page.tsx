"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATS = [
  { value: "13M+", label: "Verified Humans" },
  { value: "500 GNM", label: "per Genome" },
  { value: "Zero", label: "Data Leakage" },
];

const STEPS = [
  { step: "01", title: "Connect", desc: "Sign in via World App" },
  { step: "02", title: "Verify", desc: "Prove humanity with World ID" },
  { step: "03", title: "Upload", desc: "Submit your VCF file to IPFS" },
  { step: "04", title: "Earn", desc: "500 GNM + perpetual data royalties" },
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      if (!MiniKit.isInstalled()) {
        setError("Open this app inside World App to sign in.");
        setLoading(false);
        return;
      }
      const nonce = crypto.randomUUID().replace(/-/g, "");
      // MiniKit v2: commands are async methods on MiniKit and throw on error.
      const { data } = await MiniKit.walletAuth({
        nonce,
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        statement: "Sign in to Chainome — patient-sovereign data marketplace",
      });
      localStorage.setItem("minikit_address", data.address);
      localStorage.setItem("minikit_signed_in", "true");
      router.push("/verify");
    } catch (e) {
      const msg = e instanceof Error
        ? `${e.constructor.name}: ${e.message}`
        : String(e);
      console.error("[chainome] walletAuth failed:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-genome-navy relative overflow-hidden">
      {/* Ambient gradient blobs */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div
          className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #00c9a7, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 -right-48 w-96 h-96 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #00c9a7, transparent 70%)" }}
        />
      </div>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* Live pill */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-genome-card border border-genome-border text-xs text-genome-teal font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-genome-teal animate-pulse" />
          WorldChain Sepolia · Testnet Live
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-5 leading-[1.1]">
          Your Genome.{" "}
          <span className="text-genome-teal">Your Data.</span>
          <br />
          Your Future.
        </h1>

        <p className="text-gray-400 max-w-md mb-10 text-lg leading-relaxed">
          Patient-sovereign genomic marketplace on WorldChain.
          One genome per verified human — full ownership, zero leakage,
          perpetual royalties.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10 w-full max-w-lg">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-genome-card border border-genome-border p-4"
            >
              <p className="text-2xl font-extrabold text-genome-teal">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="px-8 py-4 rounded-xl bg-genome-teal text-black font-bold text-lg
                     hover:opacity-90 active:scale-95 transition-all disabled:opacity-50
                     shadow-[0_0_30px_rgba(0,201,167,0.3)]"
        >
          {loading ? "Opening World App…" : "Get Started with World App"}
        </button>

        {error && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm rounded-xl bg-red-950 border border-red-500 p-4 shadow-2xl">
              <p className="text-xs font-bold text-red-400 mb-1">Sign-in error — tap to dismiss</p>
              <p className="text-sm text-red-200 break-all">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 w-full py-1.5 rounded-lg bg-red-900 text-red-200 text-xs font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <p className="mt-5 text-xs text-gray-600">
          World ID required for genome submission &middot; Your wallet is never shared with researchers
        </p>
      </section>

      {/* How it works */}
      <section className="relative px-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-xs font-semibold text-gray-600 uppercase tracking-widest mb-10">
            How it works
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {/* Connector line (desktop) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-5 left-[calc(50%+20px)] right-[-50%] h-px bg-genome-border" />
                )}
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="w-10 h-10 rounded-full bg-genome-card border border-genome-teal flex items-center justify-center mb-3 shrink-0">
                    <span className="text-[10px] font-bold text-genome-teal">{s.step}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-200 mb-1">{s.title}</p>
                  <p className="text-xs text-gray-500 leading-snug">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
