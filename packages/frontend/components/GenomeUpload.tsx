"use client";

import { useEffect, useRef, useState } from "react";

type JobState = "awaiting_upload" | "uploading" | "queued" | "processing" | "done" | "failed";
interface JobStatus {
  state: JobState;
  step?: string;
  log: string[];
  error?: string;
  result?: { dryRun?: boolean; manifestRef?: string; datasetKey?: string; qc?: { variantCount: number; pass: boolean } };
}

const MAX_BYTES = 2 * 1024 ** 3;
const STEP_LABELS: Record<string, string> = {
  preflight: "Checking storage",
  detect: "Reading your file",
  normalize: "Normalizing to GRCh38",
  qc: "Quality checks",
  features: "Drug-response panel",
  split: "Splitting by chromosome",
  encrypt: "Encrypting to your key",
  swarm: "Storing on Swarm",
  arkiv: "Indexing on Arkiv",
  attest: "Lab attestation",
  done: "Done",
};

/**
 * Upload a whole-genome VCF (≤ 2 GB) from World App. The file goes straight to the lab node
 * (Azure) over HTTPS with a single-job upload URL; this page then follows the pipeline.
 */
export function GenomeUpload({
  patient,
  patientPublicKey,
  onDone,
}: {
  patient: string;
  patientPublicKey: string;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => () => xhrRef.current?.abort(), []);

  // Follow the job until it finishes.
  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const tick = async () => {
      const res = await fetch(`/api/genome/jobs/${jobId}`).catch(() => null);
      if (res?.ok) {
        const s: JobStatus = await res.json();
        if (stop) return;
        setStatus(s);
        if (s.state === "done") return onDone();
        if (s.state === "failed") return;
      }
      if (!stop) setTimeout(tick, 3000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [jobId, onDone]);

  async function start() {
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("This file is over 2 GB. Export a VCF (not BAM/CRAM/FASTQ) from your lab.");
    setError(null);
    setBusy(true);
    try {
      const nullifier: string | undefined = JSON.parse(sessionStorage.getItem("wld_proof") ?? "{}").nullifier_hash;
      const res = await fetch("/api/genome/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patient, patientPubKey: patientPublicKey, nullifier }),
      });
      const job = await res.json();
      if (!res.ok) throw new Error(job.error ?? "Could not start processing");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", job.uploadUrl);
        xhr.setRequestHeader("content-type", "application/octet-stream");
        xhr.upload.onprogress = (e) => e.lengthComputable && setPct(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(JSON.parse(xhr.responseText || "{}").error ?? `Upload failed (${xhr.status})`)));
        xhr.onerror = () => reject(new Error("Upload failed — check your connection"));
        xhr.send(file);
      });
      setJobId(job.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const state = status?.state;
  const stepLabel = status?.step ? STEP_LABELS[status.step] ?? status.step : undefined;

  return (
    <div className="space-y-3">
      {!jobId ? (
        <>
          <label className="block w-full border-2 border-dashed border-genome-border rounded-xl p-6 text-center cursor-pointer hover:border-genome-teal transition">
            <input type="file" accept=".vcf,.gz,.vcf.gz,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <span className="text-genome-teal text-sm font-semibold">
                {file.name} · {(file.size / 1e6).toFixed(1)} MB
              </span>
            ) : (
              <span className="text-gray-400 text-sm">Choose your genome file (.vcf / .vcf.gz / 23andMe .txt, up to 2 GB)</span>
            )}
          </label>
          {busy && (
            <div className="h-1.5 w-full rounded-full bg-genome-border overflow-hidden">
              <div className="h-full bg-genome-teal transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          <button
            onClick={start}
            disabled={!file || busy}
            className="px-5 py-2.5 rounded-xl bg-genome-teal text-black font-bold text-sm hover:opacity-90 transition disabled:opacity-40"
          >
            {busy ? `Uploading… ${pct}%` : "Upload & process"}
          </button>
          <p className="text-xs text-gray-500">
            Sent over HTTPS to our lab node, which normalizes and encrypts it to your key, then deletes the original.
          </p>
        </>
      ) : (
        <div className="rounded-xl bg-genome-navy/60 border border-genome-border p-4 space-y-2 text-sm">
          <p className="text-white font-semibold">
            {state === "done" ? "Processed" : state === "failed" ? "Processing failed" : state === "queued" ? "Waiting in queue…" : `${stepLabel ?? "Starting"}…`}
          </p>
          {state === "done" && status?.result?.dryRun && (
            <p className="text-xs text-yellow-300">
              Test mode: encrypted and checked ({status.result.qc?.variantCount?.toLocaleString()} variants), but not stored on Swarm/Arkiv yet.
            </p>
          )}
          {state === "failed" && <p className="text-xs text-red-400">{status?.error}</p>}
          {status?.log?.length ? (
            <pre className="text-[10px] text-gray-500 max-h-32 overflow-y-auto whitespace-pre-wrap">{status.log.slice(-8).join("\n")}</pre>
          ) : null}
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
