"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { MiniKit } from "@worldcoin/minikit-js";
import { CONTRACTS, STUDY_REGISTRY_ABI } from "@/lib/contracts";

const MOCK_STUDIES = [
  {
    id: 1,
    sponsor: "Stanford Medical AI Lab",
    title: "BRCA2 Carriers — Olaparib Response Study",
    description: "Seeking BRCA2-positive participants for observational study on PARP inhibitor response patterns.",
    requiredData: ["Genome", "Oncology Lab Reports"],
    requiresGenome: true,
    reward: 500,
    participants: 142,
    maxParticipants: 500,
    deadline: "2027-06-30",
    phase: "Phase III",
    irbApproved: true,
  },
  {
    id: 2,
    sponsor: "Novartis Research India",
    title: "Type 2 Diabetes Longitudinal Cohort",
    description: "10-year observational study on T2D progression. HbA1c records + metabolic panel required.",
    requiredData: ["Lab Reports", "Prescriptions"],
    requiresGenome: false,
    reward: 200,
    participants: 1203,
    maxParticipants: 5000,
    deadline: "2028-12-31",
    phase: "Observational",
    irbApproved: true,
  },
  {
    id: 3,
    sponsor: "AIIMS Genomics Division",
    title: "South Asian Cardiovascular Genomics Initiative",
    description: "Building the first large-scale South Asian GWAS dataset. Cardiac records + genome required.",
    requiredData: ["Genome", "Cardiac Imaging", "Lab Reports"],
    requiresGenome: true,
    reward: 350,
    participants: 89,
    maxParticipants: 2000,
    deadline: "2027-03-15",
    phase: "Recruitment",
    irbApproved: true,
  },
];

type Filter = "All" | "Genome Required" | "Lab Reports Only";

const PHASE_COLORS: Record<string, string> = {
  "Phase III":    "bg-genome-teal/20 text-genome-teal",
  "Observational": "bg-violet-500/20 text-violet-400",
  "Recruitment":  "bg-amber-500/20 text-amber-400",
};

export default function StudiesPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<Filter>("All");
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Record<number, string[]>>({});
  const [joinedIds, setJoinedIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);

  const filtered = MOCK_STUDIES.filter((s) => {
    if (filter === "Genome Required") return s.requiresGenome;
    if (filter === "Lab Reports Only") return !s.requiresGenome;
    return true;
  });

  function toggleDataType(studyId: number, type: string) {
    setSelectedTypes((prev) => {
      const current = prev[studyId] ?? [];
      return {
        ...prev,
        [studyId]: current.includes(type)
          ? current.filter((t) => t !== type)
          : [...current, type],
      };
    });
  }

  function openModal(studyId: number, defaultTypes: string[]) {
    setJoiningId(studyId);
    if (!selectedTypes[studyId]) {
      setSelectedTypes((prev) => ({ ...prev, [studyId]: defaultTypes }));
    }
  }

  async function confirmJoin(studyId: number) {
    const types = selectedTypes[studyId] ?? [];
    setLoading(true);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: CONTRACTS.studyRegistry as `0x${string}`,
          abi: STUDY_REGISTRY_ABI,
          functionName: "joinStudy",
          args: [BigInt(studyId), types],
        }],
      });
      if (finalPayload.status === "error") throw new Error(finalPayload.error_code);
      setJoinedIds((prev) => [...prev, studyId]);
      setJoiningId(null);
    } catch (err) {
      console.error("joinStudy failed", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="animate-slide-up mb-8 text-center">
        <h2 className="text-3xl font-bold text-genome-teal mb-2">Research Studies</h2>
        <p className="text-gray-400 text-sm">
          Contribute your anonymised health data to science. Earn GNM tokens for each study you join.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 animate-fade-in">
        {(["All", "Genome Required", "Lab Reports Only"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === f
                ? "bg-genome-teal text-black"
                : "bg-genome-card border border-genome-border text-gray-400 hover:border-genome-teal"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Study cards */}
      {filtered.length === 0 ? (
        <div className="p-10 text-center rounded-xl bg-genome-card border border-genome-border text-gray-500 text-sm">
          No studies match this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((study) => {
            const pct = Math.round((study.participants / study.maxParticipants) * 100);
            const joined = joinedIds.includes(study.id);
            return (
              <div
                key={study.id}
                className="rounded-xl bg-genome-card border border-genome-border p-5 animate-slide-up"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{study.sponsor}</p>
                    <h3 className="text-base font-semibold text-gray-100 leading-snug">{study.title}</h3>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${PHASE_COLORS[study.phase] ?? "bg-gray-700 text-gray-300"}`}>
                    {study.phase}
                  </span>
                </div>

                <p className="text-sm text-gray-400 mb-3">{study.description}</p>

                {/* Data pills */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {study.requiredData.map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded-full text-xs bg-genome-border text-gray-300">
                      {d}
                    </span>
                  ))}
                  {study.irbApproved && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/40 text-green-400 border border-green-800">
                      IRB Approved
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{study.participants.toLocaleString()} / {study.maxParticipants.toLocaleString()} participants</span>
                    <span>Deadline {study.deadline}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-genome-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-genome-teal"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Reward + join */}
                <div className="flex items-center justify-between">
                  <span className="text-genome-teal font-semibold text-sm">
                    +{study.reward} GNM
                  </span>
                  {joined ? (
                    <span className="px-4 py-1.5 rounded-lg text-xs bg-genome-teal/10 text-genome-teal border border-genome-teal/30">
                      Joined
                    </span>
                  ) : (
                    <button
                      onClick={() => openModal(study.id, study.requiredData)}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium bg-genome-teal text-black hover:opacity-90 transition"
                    >
                      Join Study
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join modal */}
      {joiningId !== null && (() => {
        const study = MOCK_STUDIES.find((s) => s.id === joiningId)!;
        const types = selectedTypes[joiningId] ?? [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-genome-card border border-genome-border p-6 animate-slide-up">
              <h3 className="text-lg font-bold text-genome-teal mb-1">Join Study</h3>
              <p className="text-xs text-gray-400 mb-4">{study.title}</p>

              <p className="text-xs text-gray-500 mb-2">Select data to share</p>
              <div className="space-y-2 mb-4">
                {study.requiredData.map((d) => (
                  <label key={d} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={types.includes(d)}
                      onChange={() => toggleDataType(joiningId, d)}
                      className="accent-genome-teal w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">{d}</span>
                  </label>
                ))}
              </div>

              {/* World ID badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-900/30 border border-violet-700/40 mb-5">
                <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-violet-300">World ID verified — your identity stays anonymous</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setJoiningId(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-genome-border text-gray-400 text-sm hover:border-gray-500 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmJoin(joiningId)}
                  disabled={!address || types.length === 0 || loading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-genome-teal text-black text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
                >
                  {loading ? "Confirming…" : `Confirm & Earn ${study.reward} GNM`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
