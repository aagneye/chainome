"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRouter } from "next/navigation";
import { CONTRACTS, GENOME_REGISTRY_ABI } from "@/lib/contracts";
import type { ISuccessResult } from "@worldcoin/idkit";

function detectFileType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".vcf")) return "VCF";
  if (lower.includes("23andme")) return "23andMe";
  if (lower.includes("ancestry")) return "AncestryDNA";
  return "Genomic Data";
}

export default function GenomePage() {
  const { address } = useAccount();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cid, setCid] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Clean up interval on unmount
  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  function fakeProgress() {
    setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          if (progressRef.current) clearInterval(progressRef.current);
          return 90;
        }
        return p + Math.random() * 12;
      });
    }, 180);
  }

  async function uploadToIPFS(): Promise<string> {
    const form = new FormData();
    form.append("file", file!);
    const res = await fetch("https://node.lighthouse.storage/api/v0/add", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY}` },
      body: form,
    });
    if (!res.ok) throw new Error("IPFS upload failed");
    const data = await res.json();
    return data.Hash as string;
  }

  async function handleSubmit() {
    if (!file || !address) return;
    setError(null);
    setUploading(true);
    fakeProgress();

    try {
      const proofRaw = sessionStorage.getItem("wld_proof");
      if (!proofRaw) {
        router.push("/verify");
        return;
      }
      const proof: ISuccessResult = JSON.parse(proofRaw);
      const ipfsCid = await uploadToIPFS();

      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
      setCid(ipfsCid);

      writeContract({
        address: CONTRACTS.genomeRegistry as `0x${string}`,
        abi: GENOME_REGISTRY_ABI,
        functionName: "submitGenome",
        args: [
          address,
          BigInt(proof.merkle_root),
          BigInt(proof.nullifier_hash),
          proof.proof.split(",").map(BigInt) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint],
          ipfsCid,
        ],
      });
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(0);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function copyCid() {
    if (!cid) return;
    await navigator.clipboard.writeText(cid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        {/* Success glow */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-30"
            style={{ background: "#00c9a7" }}
          />
          <div className="relative w-20 h-20 rounded-full bg-genome-card border-2 border-genome-teal flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="2" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-extrabold text-white mb-1">Genome Registered</h2>
          <div className="inline-block animate-bounce mt-2 px-4 py-1.5 rounded-full bg-genome-teal text-black font-bold text-sm">
            500 GNM Minted!
          </div>
        </div>

        {cid && (
          <div className="w-full max-w-md bg-genome-card border border-genome-border rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">IPFS Content ID</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-genome-teal break-all flex-1 leading-relaxed">{cid}</code>
              <button
                onClick={copyCid}
                className="shrink-0 p-1.5 rounded-lg border border-genome-border hover:border-genome-teal transition text-gray-400 hover:text-genome-teal"
                title="Copy CID"
              >
                {copied ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-genome-teal">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

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
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-bold text-white mb-2">Submit Genome</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Upload your SNP/VCF file. It is encrypted and stored on IPFS.
          Only the content ID is written on-chain via World ID proof.
        </p>
      </div>

      {/* Drag-drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => document.getElementById("file-input")?.click()}
        className="w-full max-w-md border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200"
        style={{
          borderColor: isDragging ? "#00c9a7" : file ? "#00c9a7" : "#182035",
          backgroundColor: isDragging ? "rgba(0,201,167,0.05)" : "#0e1424",
          boxShadow: isDragging ? "0 0 24px rgba(0,201,167,0.2)" : "none",
        }}
      >
        {file ? (
          <div className="flex flex-col items-center gap-3">
            {/* File type badge */}
            <span className="inline-block px-3 py-1 rounded-full bg-genome-teal text-black text-xs font-bold">
              {detectFileType(file.name)}
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="1.5" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-genome-teal font-semibold text-sm">{file.name}</p>
            <p className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(1)} KB &middot; click to change
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#182035" strokeWidth="1.5" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div>
              <p className="text-gray-400 text-sm font-medium">Drop your genome file here</p>
              <p className="text-gray-600 text-xs mt-1">Accepts .vcf · .snp · .txt (23andMe / AncestryDNA)</p>
            </div>
          </div>
        )}
        <input
          id="file-input"
          type="file"
          accept=".vcf,.snp,.txt"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
        />
      </div>

      {/* Progress bar */}
      {(uploading || progress > 0) && progress < 100 && (
        <div className="w-full max-w-md">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Uploading to IPFS via Lighthouse…</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-genome-border overflow-hidden">
            <div
              className="h-full rounded-full bg-genome-teal transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!file || uploading || isPending}
        className="px-8 py-3 rounded-xl bg-genome-teal text-black font-bold text-sm hover:opacity-90 transition disabled:opacity-40"
      >
        {uploading
          ? "Uploading to IPFS…"
          : isPending
          ? "Confirming on-chain…"
          : "Submit Genome · Earn 500 GNM"}
      </button>
    </main>
  );
}
