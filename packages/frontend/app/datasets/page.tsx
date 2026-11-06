"use client";

import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useMiniKitAddress } from "@/hooks/useMiniKitAddress";
import { parseEther } from "viem";
import { CONTRACTS, DATASET_REGISTRY_ABI } from "@/lib/contracts";

const CATEGORIES = ["All", "Genomics", "Imaging", "Clinical", "Billing"] as const;
type Category = (typeof CATEGORIES)[number];

const MOCK_DATASETS = [
  {
    id: 1,
    name: "BRCA2 South Asian Cohort",
    slug: "brca2-south-asia",
    ensName: "brca2-south-asia.genomechain.eth",
    description:
      "1,200 BRCA2 variant carriers, South Asian ancestry. VCF + clinical annotations.",
    category: "Genomics",
    creator: "0x1234...5678",
    priceGNM: 500,
    tokenSymbol: "BRCA2D",
    recordCount: 1200,
    ensRegistered: true,
  },
  {
    id: 2,
    name: "Mumbai Cardiac Imaging Set",
    slug: "mumbai-cardiac-ct",
    ensName: "mumbai-cardiac-ct.genomechain.eth",
    description:
      "3,400 cardiac CT scans from KEM Hospital. DICOM format, anonymized.",
    category: "Imaging",
    creator: "0xabcd...ef01",
    priceGNM: 300,
    tokenSymbol: "MUMCAD",
    recordCount: 3400,
    ensRegistered: true,
  },
  {
    id: 3,
    name: "T2D Medical Bills India",
    slug: "t2d-bills-india",
    ensName: "t2d-bills-india.genomechain.eth",
    description:
      "5-year longitudinal medical billing records for T2D patients across 12 Indian states.",
    category: "Billing",
    creator: "0x9876...5432",
    priceGNM: 150,
    tokenSymbol: "T2DIND",
    recordCount: 8900,
    ensRegistered: true,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Genomics: "text-genome-teal border-genome-teal/30 bg-genome-teal/10",
  Imaging:  "text-genome-violet border-genome-violet/30 bg-genome-violet/10",
  Clinical: "text-green-400 border-green-400/30 bg-green-400/10",
  Billing:  "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

export default function DatasetsPage() {
  const address = useMiniKitAddress();
  const isConnected = !!address;
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [showPublish, setShowPublish] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(false);

  const filtered =
    activeCategory === "All"
      ? MOCK_DATASETS
      : MOCK_DATASETS.filter((d) => d.category === activeCategory);

  async function handlePurchase(id: number) {
    if (!isConnected) return;
    setLoading(true);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: CONTRACTS.datasetRegistry as `0x${string}`,
          abi: DATASET_REGISTRY_ABI,
          functionName: "purchaseAccess",
          args: [BigInt(id)],
        }],
      });
      if (finalPayload.status === "error") throw new Error(finalPayload.error_code);
      setPurchasedIds((prev) => new Set([...prev, id]));
    } catch (err) {
      console.error("purchaseAccess failed", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-400">Open in World App to browse the dataset marketplace</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Dataset Marketplace</h1>
          <p className="text-sm text-gray-500">
            ENS-registered medical datasets · pay GNM to access
          </p>
        </div>
        <button
          onClick={() => setShowPublish(true)}
          className="shrink-0 px-4 py-2 rounded-xl bg-genome-teal text-black font-semibold text-sm hover:opacity-90 transition"
        >
          + Publish Dataset
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              activeCategory === cat
                ? "border-genome-teal text-genome-teal bg-genome-teal/10"
                : "border-genome-border text-gray-500 hover:border-gray-500"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dataset grid */}
      <div className="space-y-4">
        {filtered.map((ds) => {
          const purchased = purchasedIds.has(ds.id);
          const catColor = CATEGORY_COLORS[ds.category] ?? "text-gray-400";
          return (
            <div
              key={ds.id}
              className="rounded-2xl bg-genome-card border border-genome-border p-5"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-base font-semibold text-white">{ds.name}</h2>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${catColor}`}
                    >
                      {ds.category}
                    </span>
                    {ds.ensRegistered && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-400/30 bg-blue-400/10 text-blue-400 font-medium">
                        ENS Registered
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-500">{ds.ensName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-genome-teal">{ds.priceGNM} GNM</p>
                  <p className="text-[10px] text-gray-600">{ds.tokenSymbol} token</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">{ds.description}</p>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>{ds.recordCount.toLocaleString()} records</span>
                  <span>Creator: <span className="font-mono">{ds.creator}</span></span>
                </div>
                {purchased ? (
                  <a
                    href={`https://ipfs.io/ipfs/placeholder-${ds.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-semibold hover:opacity-90 transition"
                  >
                    Access Granted — View Dataset
                  </a>
                ) : (
                  <button
                    onClick={() => handlePurchase(ds.id)}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-xl bg-genome-teal/20 border border-genome-teal/40 text-genome-teal text-xs font-semibold hover:bg-genome-teal/30 transition disabled:opacity-50"
                  >
                    {loading ? "Buying…" : "Buy Access"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Publish modal */}
      {showPublish && (
        <PublishModal onClose={() => setShowPublish(false)} />
      )}
    </main>
  );
}

function PublishModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category: "genomics",
    priceGNM: "100",
    cid: "",
  });
  const [status, setStatus] = useState("");

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "name" && !prev.slug) {
        next.slug = v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.slug) { setStatus("Name and slug required"); return; }
    const cid = form.cid || "QmPlaceholderCID_" + form.slug;
    setStatus("Submitting…");
    setLoading(true);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: CONTRACTS.datasetRegistry as `0x${string}`,
          abi: DATASET_REGISTRY_ABI,
          functionName: "publishDataset",
          args: [
            form.name,
            form.slug,
            cid,
            form.description,
            form.category,
            parseEther(form.priceGNM || "0"),
          ],
        }],
      });
      if (finalPayload.status === "error") throw new Error(finalPayload.error_code);
      setStatus("Published! ENS subname: " + form.slug + ".genomechain.eth");
    } catch (err: any) {
      setStatus("Error: " + (err?.shortMessage ?? err?.message ?? "unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md bg-[#0e1424] border border-genome-border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">Publish Dataset</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Dataset Name">
            <input
              className="input-genome"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="BRCA2 South Asian Cohort"
              required
            />
          </Field>
          <Field label={`Slug (ENS: ${form.slug || "…"}.genomechain.eth)`}>
            <input
              className="input-genome font-mono"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="brca2-south-asia"
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              className="input-genome resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of your dataset"
            />
          </Field>
          <Field label="Category">
            <select
              className="input-genome"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="genomics">Genomics</option>
              <option value="imaging">Imaging</option>
              <option value="clinical">Clinical</option>
              <option value="billing">Billing</option>
            </select>
          </Field>
          <Field label="Price (GNM)">
            <input
              type="number"
              min="0"
              className="input-genome"
              value={form.priceGNM}
              onChange={(e) => set("priceGNM", e.target.value)}
              placeholder="100"
            />
          </Field>
          <Field label="IPFS CID (optional — leave blank for demo)">
            <input
              className="input-genome font-mono text-xs"
              value={form.cid}
              onChange={(e) => set("cid", e.target.value)}
              placeholder="QmYour…CID"
            />
          </Field>
          {status && (
            <p className="text-xs text-genome-teal bg-genome-teal/10 rounded-lg px-3 py-2 break-all">
              {status}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-genome-teal text-black font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Publishing…" : "Publish Dataset"}
          </button>
        </form>
      </div>
      <style>{`
        .input-genome {
          width: 100%;
          background: #0a0f1c;
          border: 1px solid var(--genome-border, #1e2a3a);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          color: #e2e8f0;
          font-size: 0.875rem;
          outline: none;
        }
        .input-genome:focus {
          border-color: #00c9a7;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
