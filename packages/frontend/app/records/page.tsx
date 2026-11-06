"use client";

import { useState, useCallback } from "react";
import { encodeFunctionData } from "viem";
import { useMiniKitTx } from "@/hooks/useMiniKitTx";
import { CONTRACTS, RECORD_VAULT_ABI } from "@/lib/contracts";
import { encryptForPatient } from "@/lib/genome-crypto";
import { usePatientKey } from "@/lib/use-patient-key";

const RECORD_TYPES = ["Lab Report", "Prescription", "Imaging", "Vaccination", "Clinical Notes", "Other"];

export default function RecordsPage() {
  const patientKey = usePatientKey();
  const address = patientKey.address; // from MiniKit walletAuth
  const [file, setFile] = useState<File | null>(null);
  const [recordType, setRecordType] = useState(RECORD_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [cid, setCid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tx = useMiniKitTx();

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  async function handleSubmit() {
    if (!file || !address) return;
    if (!patientKey.publicKey) {
      await patientKey.derive();
      return;
    }
    setError(null);
    setUploading(true);
    setUploadPct(10);

    try {
      // Encrypted here, before anything leaves the device.
      const sealed = await encryptForPatient(file, patientKey.publicKey);
      setUploadPct(40);

      const nullifier: string | undefined = JSON.parse(sessionStorage.getItem("wld_proof") ?? "{}").nullifier_hash;
      const form = new FormData();
      form.append("cipher", new Blob([sealed.cipher as BlobPart]));
      form.append(
        "meta",
        JSON.stringify({
          patient: address,
          anonId: nullifier ? BigInt(nullifier).toString(16).padStart(64, "0").slice(0, 16) : "unverified",
          recordType: recordType.toLowerCase().replace(/ /g, "_"),
          mimeType: file.type || "application/octet-stream",
          plainBytes: sealed.plainBytes,
          sha256Plain: sealed.sha256Plain,
          sha256Cipher: sealed.sha256Cipher,
          wrappedKey: sealed.wrappedKey,
        }),
      );

      // Ciphertext → Swarm, record index → Arkiv (server holds the postage batch + Arkiv writer key)
      const res = await fetch("/api/records", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed");
      setUploadPct(100);
      setCid(body.manifestRef);

      await tx.send(
        CONTRACTS.recordVault,
        encodeFunctionData({ abi: RECORD_VAULT_ABI, functionName: "addRecord", args: [body.manifestRef, recordType] }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (tx.isSubmitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="animate-slide-up text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-genome-teal/20 flex items-center justify-center animate-pulse-glow">
            <svg className="w-8 h-8 text-genome-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-genome-teal mb-2">Record Stored</h2>
          <p className="text-gray-400 text-sm">
            Swarm manifest: <code className="text-genome-teal break-all">{cid}</code>
          </p>
          <p className="text-xs text-gray-500 mt-1">+10 GNM tokens minted to your wallet</p>
        </div>
        <button
          onClick={() => { setFile(null); setUploadPct(0); setCid(null); tx.reset(); }}
          className="px-6 py-3 rounded-lg border border-genome-border text-gray-300 hover:border-genome-teal transition"
        >
          Add Another Record
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="animate-slide-up text-center max-w-sm">
        <h2 className="text-2xl font-bold text-genome-teal mb-2">Add Health Record</h2>
        <p className="text-gray-400 text-sm">
          Upload any medical document. Encrypted on this device to your key, stored on Swarm, indexed on Arkiv, anchored on World Chain.
          Earn 10 GNM per record.
        </p>
      </div>

      <div className="w-full max-w-md space-y-4 animate-slide-up" style={{ animationDelay: "60ms" }}>
        {/* Record type pills */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Record type</p>
          <div className="flex flex-wrap gap-2">
            {RECORD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setRecordType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  recordType === t
                    ? "bg-genome-teal text-black shadow-[0_0_10px_rgba(0,201,167,0.3)]"
                    : "bg-genome-card border border-genome-border text-gray-400 hover:border-genome-teal hover:text-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById("record-input")?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            file ? "border-genome-teal bg-genome-teal/5" : "border-genome-border hover:border-genome-teal"
          }`}
        >
          {file ? (
            <div>
              <p className="text-genome-teal font-medium">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <svg className="mx-auto mb-2 w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-500 text-sm">Drop PDF / image / document here</p>
              <p className="text-gray-600 text-xs mt-1">or click to browse</p>
            </div>
          )}
          <input
            id="record-input"
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="animate-fade-in">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Encrypting &amp; uploading to Swarm…</span>
              <span>{uploadPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-genome-border overflow-hidden">
              <div
                className="h-full rounded-full bg-genome-teal transition-all duration-300"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {(error ?? tx.error) && (
          <div className="animate-fade-in px-4 py-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
            {error ?? tx.error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || uploading || tx.isPending}
          className="w-full px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold
                     hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {uploading ? "Uploading…" : tx.isPending ? "Confirming tx…" : "Store Record"}
        </button>
      </div>

      {/* Previous records empty state */}
      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "120ms" }}>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Previous records</p>
        <div className="p-6 rounded-xl bg-genome-card border border-genome-border text-center">
          <svg className="mx-auto mb-2 w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 text-sm">No records yet. Upload your first document above.</p>
        </div>
      </div>
    </main>
  );
}
