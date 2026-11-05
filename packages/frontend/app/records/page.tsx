"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";

const RECORD_TYPES = ["Lab Report", "Prescription", "Imaging", "Vaccination", "Clinical Notes", "Other"];

export default function RecordsPage() {
  const { address } = useAccount();
  const [file, setFile] = useState<File | null>(null);
  const [recordType, setRecordType] = useState(RECORD_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const [cid, setCid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  async function handleSubmit() {
    if (!file || !address) return;
    setError(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("https://node.lighthouse.storage/api/v0/add", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY}` },
        body: form,
      });
      if (!res.ok) throw new Error("IPFS upload failed");
      const data = await res.json();
      const ipfsCid = data.Hash as string;
      setCid(ipfsCid);

      writeContract({
        address: CONTRACTS.recordVault.address as `0x${string}`,
        abi: CONTRACTS.recordVault.abi,
        functionName: "addRecord",
        args: [ipfsCid, recordType],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-2xl font-bold text-genome-teal mb-2">Record Stored</h2>
          <p className="text-gray-400 text-sm">CID: <code className="text-genome-teal">{cid}</code></p>
          <p className="text-xs text-gray-500 mt-1">10 GNM tokens minted to your wallet</p>
        </div>
        <button
          onClick={() => setFile(null)}
          className="px-6 py-3 rounded-lg border border-genome-border text-gray-300 hover:border-genome-teal transition"
        >
          Add Another Record
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-bold text-genome-teal mb-2">Add Health Record</h2>
        <p className="text-gray-400 text-sm">
          Upload any medical document. Encrypted, stored on IPFS, anchored on WorldChain.
          Earn 10 GNM per record.
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-genome-card border border-genome-border text-gray-200 focus:outline-none focus:border-genome-teal"
        >
          {RECORD_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>

        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById("record-input")?.click()}
          className="border-2 border-dashed border-genome-border rounded-xl p-10 text-center cursor-pointer hover:border-genome-teal transition"
        >
          {file ? (
            <p className="text-genome-teal font-medium">{file.name}</p>
          ) : (
            <p className="text-gray-500">Drop PDF / image / document here</p>
          )}
          <input
            id="record-input"
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!file || uploading || isPending}
        className="px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold hover:opacity-90 transition disabled:opacity-40"
      >
        {uploading ? "Uploading…" : isPending ? "Confirming tx…" : "Store Record"}
      </button>
    </main>
  );
}
