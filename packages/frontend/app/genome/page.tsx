"use client";

import { useCallback, useEffect, useState } from "react";
import { decodeAbiParameters, encodeFunctionData, parseAbiParameters } from "viem";
import { useRouter } from "next/navigation";
import type { ISuccessResult } from "@worldcoin/idkit";
import { CONTRACTS, GENOME_REGISTRY_ABI } from "@/lib/contracts";
import type { GenomeView } from "@/lib/arkiv-server";
import { usePatientKey } from "@/lib/use-patient-key";
import { useMiniKitTx } from "@/hooks/useMiniKitTx";
import { GenomePanel } from "@/components/GenomePanel";
import { GenomeUpload } from "@/components/GenomeUpload";

/**
 * Genome flow (whole-genome VCF up to 2 GB never passes through the browser):
 *  1. Patient unlocks an encryption key from a wallet signature and gives the lab its public half.
 *  2. The certified lab runs the pipeline: normalize → QC → split per chromosome → encrypt
 *     → Swarm → Arkiv, then signs LabAttestation over the manifest's Swarm reference.
 *  3. This page reads the result from Arkiv; the patient verifies a segment and anchors the
 *     manifest on World Chain with their World ID proof (one genome per human).
 */
export default function GenomePage() {
  const router = useRouter();
  const patientKey = usePatientKey();
  const address = patientKey.address; // from MiniKit walletAuth

  const [genome, setGenome] = useState<GenomeView | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tx = useMiniKitTx();

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/genome?patient=${address}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Arkiv query failed");
      setGenome(body.genome);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Arkiv query failed");
    } finally {
      setLoading(false);
    }
  }, [address]);

  // After job completes, Arkiv indexer may lag a few seconds. Retry with backoff.
  const loadAfterJob = useCallback(async () => {
    const delays = [3000, 6000, 12000, 20000];
    for (const delay of delays) {
      await new Promise((r) => setTimeout(r, delay));
      if (!address) return;
      try {
        const res = await fetch(`/api/genome?patient=${address}`);
        const body = await res.json();
        if (res.ok && body.genome) { setGenome(body.genome); return; }
      } catch { /* retry */ }
    }
    load(); // final attempt, show whatever result
  }, [address, load]);

  useEffect(() => {
    load();
  }, [load]);

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function anchor() {
    if (!genome || !address) return;
    setError(null);
    const proofRaw = localStorage.getItem("wld_proof");
    if (!proofRaw) {
      router.push("/verify");
      return;
    }
    const proof: ISuccessResult = JSON.parse(proofRaw);
    // IDKit returns the Groth16 proof as one ABI-encoded hex string of uint256[8].
    const [proofWords] = decodeAbiParameters(parseAbiParameters("uint256[8]"), proof.proof as `0x${string}`);
    await tx.send(
      CONTRACTS.genomeRegistry,
      encodeFunctionData({
        abi: GENOME_REGISTRY_ABI,
        functionName: "submitGenome",
        args: [
          address,
          BigInt(proof.merkle_root),
          BigInt(proof.nullifier_hash),
          proofWords,
          genome.dataset.manifestRef, // the exact string the lab attested
        ],
      }),
    );
  }

  const labCommand = patientKey.publicKey
    ? `scripts/run.sh --vcf /gc/in/<patient>.vcf.gz --patient ${address} --patient-pubkey ${patientKey.publicKey} --nullifier <nullifier_hash>`
    : "";

  if (tx.isSubmitted && genome) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="relative w-20 h-20 rounded-full bg-genome-card border-2 border-genome-teal flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="2" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-1">Genome Registered</h2>
          <div className="inline-block animate-bounce mt-2 px-4 py-1.5 rounded-full bg-genome-teal text-black font-bold text-sm">
            500 GNM Minted!
          </div>
        </div>
        <div className="w-full max-w-md bg-genome-card border border-genome-border rounded-xl p-4 text-left">
          <p className="text-xs text-gray-500 mb-2">Swarm manifest anchored on World Chain</p>
          <code className="text-xs text-genome-teal break-all">{genome.dataset.manifestRef}</code>
          <p className="text-xs text-gray-500 mt-3">
            {tx.txHash ? <>Transaction <code className="text-gray-300 break-all">{tx.txHash}</code></> : "Submitted — waiting for World Chain to confirm."}
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold hover:opacity-90 transition"
        >
          View Dashboard
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-8 px-4 py-16">
      <div className="text-center max-w-xl">
        <h2 className="text-2xl font-bold text-white mb-2">Your Genome</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Your lab normalizes your whole-genome VCF to GRCh38, splits it per chromosome and encrypts each part to your key.
          The encrypted parts live on Swarm, their index on Arkiv, and one reference on World Chain.
        </p>
      </div>

      {!address && <p className="text-gray-400 text-sm">Connect your wallet to continue.</p>}

      {address && (
        <section className="w-full max-w-3xl bg-genome-card border border-genome-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Step n={1} done={!!patientKey.publicKey} />
            <h3 className="text-white font-semibold">{patientKey.publicKey ? "Upload your genome" : "Create your encryption key"}</h3>
          </div>
          {!patientKey.publicKey ? (
            <button
              onClick={patientKey.derive}
              disabled={patientKey.deriving}
              className="px-5 py-2.5 rounded-xl bg-genome-teal text-black font-bold text-sm hover:opacity-90 transition disabled:opacity-40"
            >
              {patientKey.deriving ? "Waiting for signature…" : "Create key from my wallet (sign, free)"}
            </button>
          ) : (
            <div className="space-y-3">
              <GenomeUpload patient={address} patientPublicKey={patientKey.publicKey} onDone={loadAfterJob} />
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-300">Your lab already has the file? Give them your key instead</summary>
                <div className="mt-3 space-y-3">
                  <KeyRow label="Public key" value={patientKey.publicKey} copied={copied === "pk"} onCopy={() => copy("pk", patientKey.publicKey!)} />
                  <KeyRow label="Lab command" value={labCommand} copied={copied === "cmd"} onCopy={() => copy("cmd", labCommand)} />
                </div>
              </details>
              <p className="text-xs text-gray-500">
                Only the public half of your key leaves this page. The private key is recomputed from your signature whenever you need it and is never stored.
              </p>
            </div>
          )}
          {patientKey.error && <p className="text-red-400 text-xs">{patientKey.error}</p>}
        </section>
      )}

      {address && (
        <>
          {genome ? (
            <GenomePanel genome={genome} patientKey={patientKey} />
          ) : (
            <section className="w-full max-w-3xl bg-genome-card border border-dashed border-genome-border rounded-2xl p-6 text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                <Step n={2} done={false} />
                <h3 className="text-white font-semibold">Waiting for your lab</h3>
              </div>
              <p className="text-gray-500 text-sm">
                {loading ? "Checking Arkiv…" : loadError ? `Arkiv: ${loadError}` : "No genome for this wallet on Arkiv yet."}
              </p>
              <button onClick={load} className="text-genome-teal text-sm hover:underline">
                Refresh
              </button>
            </section>
          )}

          {genome && (
            <section className="w-full max-w-3xl flex flex-col items-center gap-3">
              {genome.dataset.manifestRef.startsWith("dry-run:") ? (
                <div className="w-full rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300 text-center">
                  <p className="font-semibold mb-1">Anchoring unavailable in demo mode</p>
                  <p className="text-yellow-400/80">A real Swarm storage batch is needed to generate a valid manifest reference. The lab attestation and World Chain anchoring require a permanent CID, not a dry-run placeholder.</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={anchor}
                    disabled={tx.isPending || !CONTRACTS.genomeRegistry || !genome.dataset.qcPass}
                    className="px-8 py-3 rounded-xl bg-genome-teal text-black font-bold text-sm hover:opacity-90 transition disabled:opacity-40"
                  >
                    {tx.isPending ? "Confirming on-chain…" : "Anchor on World Chain · Earn 500 GNM"}
                  </button>
                  <p className="text-xs text-gray-500">Requires your World ID proof and the lab&apos;s attestation of this manifest.</p>
                  {(error ?? tx.error) && <p className="text-red-400 text-sm">{error ?? tx.error}</p>}
                </>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Step({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-genome-teal text-black" : "border border-genome-border text-gray-400"}`}
    >
      {done ? "✓" : n}
    </span>
  );
}

function KeyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs text-genome-teal break-all bg-genome-navy/60 rounded-lg px-3 py-2">{value}</code>
        <button onClick={onCopy} className="shrink-0 px-3 py-2 rounded-lg border border-genome-border text-xs text-gray-300 hover:border-genome-teal">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
