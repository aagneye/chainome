"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRouter } from "next/navigation";
import { CONTRACTS } from "@/lib/contracts";
import type { ISuccessResult } from "@worldcoin/idkit";

export default function GenomePage() {
  const { address } = useAccount();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
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

    try {
      const proofRaw = sessionStorage.getItem("wld_proof");
      if (!proofRaw) {
        router.push("/verify");
        return;
      }
      const proof: ISuccessResult = JSON.parse(proofRaw);
      const ipfsCid = await uploadToIPFS();
      setCid(ipfsCid);

      writeContract({
        address: CONTRACTS.genomeRegistry.address as `0x${string}`,
        abi: CONTRACTS.genomeRegistry.abi,
        functionName: "submitGenome",
        args: [
          address,
          BigInt(proof.merkle_root),
          BigInt(proof.nullifier_hash),
          proof.proof.split(",").map(BigInt) as readonly [bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint],
          ipfsCid,
        ],
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
          <div className="text-5xl mb-4">🧬</div>
          <h2 className="text-2xl font-bold text-genome-teal mb-2">Genome Registered</h2>
          <p className="text-gray-400 text-sm">CID: <code className="text-genome-teal">{cid}</code></p>
          <p className="text-xs text-gray-500 mt-1">500 GNM tokens minted to your wallet</p>
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
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-bold text-genome-teal mb-2">Submit Genome</h2>
        <p className="text-gray-400 text-sm">
          Upload your SNP/VCF file. It will be encrypted and stored on IPFS.
          Only the CID is written on-chain.
        </p>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById("file-input")?.click()}
        className="w-full max-w-md border-2 border-dashed border-genome-border rounded-xl p-10 text-center cursor-pointer hover:border-genome-teal transition"
      >
        {file ? (
          <p className="text-genome-teal font-medium">{file.name}</p>
        ) : (
          <p className="text-gray-500">Drop .vcf / .snp file here or click to browse</p>
        )}
        <input
          id="file-input"
          type="file"
          accept=".vcf,.snp,.txt"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!file || uploading || isPending}
        className="px-6 py-3 rounded-lg bg-genome-teal text-black font-semibold hover:opacity-90 transition disabled:opacity-40"
      >
        {uploading ? "Uploading to IPFS…" : isPending ? "Confirming tx…" : "Submit Genome"}
      </button>
    </main>
  );
}
