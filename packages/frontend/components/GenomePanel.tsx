"use client";

import { useEffect, useState } from "react";
import type { GenomeManifest } from "@chainome/shared/manifest";
import type { GenomeView } from "@/lib/arkiv-server";
import { downloadAndDecrypt, fetchManifest, type SegmentCheck } from "@/lib/genome-crypto";
import type { usePatientKey } from "@/lib/use-patient-key";

const ARKIV_EXPLORER = "https://rabdi.explorer.arkiv.network";

function mb(bytes: string | number) {
  return `${(Number(bytes) / 1e6).toFixed(1)} MB`;
}

function short(hex: string, n = 8) {
  return `${hex.slice(0, n)}…${hex.slice(-4)}`;
}

/**
 * "Your genome": everything here is read from Arkiv (dataset, QC, segments) and Swarm
 * (manifest, ciphertext). Download & verify decrypts one chromosome in the browser.
 */
export function GenomePanel({
  genome,
  patientKey,
}: {
  genome: GenomeView;
  patientKey: ReturnType<typeof usePatientKey>;
}) {
  const { dataset, segments } = genome;
  const [manifest, setManifest] = useState<GenomeManifest | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, SegmentCheck>>({});
  const [error, setError] = useState<string | null>(null);

  const isDryRun = dataset.manifestRef.startsWith("dry-run:");

  useEffect(() => {
    if (isDryRun) return; // manifest not on Swarm in dry-run mode
    fetchManifest(dataset.manifestRef).then(setManifest).catch((e) => setError(e.message));
  }, [dataset.manifestRef, isDryRun]);

  // The lab encrypted to the key the patient gave it. If today's signature derives a different
  // key (e.g. a wallet that doesn't sign deterministically), say so instead of failing per segment.
  const keyMismatch =
    !!manifest && !!patientKey.publicKey && manifest.patientPublicKey.toLowerCase() !== patientKey.publicKey.toLowerCase();

  async function verify(chrom: string) {
    if (!manifest || !patientKey.key || keyMismatch) return;
    setBusy(chrom);
    setError(null);
    try {
      const check = await downloadAndDecrypt(manifest, chrom, patientKey.key);
      setChecks((c) => ({ ...c, [chrom]: check }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decryption failed");
    } finally {
      setBusy(null);
    }
  }

  function save(check: SegmentCheck) {
    const url = URL.createObjectURL(check.plaintext);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${check.chrom}.vcf.gz` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="w-full max-w-3xl bg-genome-card border border-genome-border rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Your genome</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Read live from Arkiv ·{" "}
            <a className="underline hover:text-genome-teal" href={`${ARKIV_EXPLORER}/entity/${dataset.key}`} target="_blank" rel="noreferrer">
              entity {short(dataset.key)}
            </a>
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${dataset.qcPass ? "bg-genome-teal text-black" : "bg-yellow-500/20 text-yellow-300"}`}
        >
          QC {dataset.qcPass ? "passed" : "needs review"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Build" value={dataset.sourceBuild === dataset.build ? dataset.build : `${dataset.sourceBuild} → ${dataset.build}`} />
        <Stat label="Variants" value={Number(dataset.variantCount).toLocaleString()} />
        <Stat label="Ti/Tv · het/hom" value={`${Number(dataset.titv).toFixed(2)} · ${Number(dataset.hetHom).toFixed(2)}`} />
        <Stat label="On Swarm (encrypted)" value={`${dataset.segmentCount} × · ${mb(dataset.cipherBytes)}`} />
      </div>

      {!dataset.hasRefCalls && (
        <p className="text-xs text-gray-400 bg-genome-navy/50 rounded-lg px-3 py-2">
          Variant-only VCF: a variant missing from the file is treated as &ldquo;assumed reference&rdquo;, not confirmed. A gVCF would remove this ambiguity.
        </p>
      )}

      <div className="text-xs text-gray-500">
        {isDryRun ? (
          <span className="text-yellow-400">Indexed on Arkiv · no Swarm storage (dry-run mode)</span>
        ) : (
          <>Manifest on Swarm <code className="text-genome-teal">{short(dataset.manifestRef, 12)}</code> — anchored on World Chain via GenomeRegistry.</>
        )}
      </div>

      {!patientKey.key && (
        <button
          onClick={patientKey.derive}
          disabled={patientKey.deriving}
          className="w-full py-2.5 rounded-xl border border-genome-teal text-genome-teal text-sm font-semibold hover:bg-genome-teal hover:text-black transition disabled:opacity-40"
        >
          {patientKey.deriving ? "Waiting for signature…" : "Unlock with my wallet (sign, no transaction)"}
        </button>
      )}

      {keyMismatch && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          This wallet&apos;s signature produced a different key than the one your lab encrypted to, so these segments can&apos;t be
          opened with it. Make sure you&apos;re signed in with the same World App account you used when you gave the lab your key.
        </p>
      )}

      <div className="max-h-80 overflow-y-auto rounded-xl border border-genome-border">
        <table className="w-full text-xs">
          <thead className="bg-genome-navy text-gray-500 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2">Segment</th>
              <th className="text-right px-3 py-2">Variants</th>
              <th className="text-right px-3 py-2">Size</th>
              <th className="text-left px-3 py-2">Swarm ref</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => {
              const check = checks[s.chrom];
              return (
                <tr key={s.key} className="border-t border-genome-border">
                  <td className="px-3 py-2 font-mono text-white">{s.chrom}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{Number(s.variantCount).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{mb(s.cipherBytes)}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{isDryRun ? <span className="text-yellow-600">dry-run</span> : short(s.swarmRef)}</td>
                  <td className="px-3 py-2 text-right">
                    {isDryRun ? (
                      <span className="text-gray-600 text-xs">no Swarm</span>
                    ) : check ? (
                      <button onClick={() => save(check)} className="text-genome-teal hover:underline" title="Save decrypted VCF">
                        {check.cipherHashOk && check.plainHashOk ? "✓ verified · save" : "✗ hash mismatch"}
                      </button>
                    ) : (
                      <button
                        onClick={() => verify(s.chrom)}
                        disabled={!patientKey.key || !manifest || keyMismatch || busy !== null}
                        className="text-gray-300 hover:text-genome-teal disabled:opacity-30"
                      >
                        {busy === s.chrom ? "decrypting…" : "download & verify"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(error || patientKey.error) && <p className="text-red-400 text-xs">{error ?? patientKey.error}</p>}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-genome-navy/60 border border-genome-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-white font-semibold mt-0.5">{value}</p>
    </div>
  );
}
