"use client";

import { useAccount, useReadContract, useBalance } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CONTRACTS, RECORD_VAULT_ABI } from "@/lib/contracts";
import Link from "next/link";
import Skeleton from "@/components/Skeleton";

const OPPORTUNITIES = [
  {
    org: "Pharma Co.",
    trait: "BRCA2 gene carriers",
    reward: "200 GNM",
    deadline: "30 days",
    color: "text-genome-teal",
  },
  {
    org: "Oxford Research",
    trait: "Type 2 Diabetes polygenic risk",
    reward: "150 GNM",
    deadline: "14 days",
    color: "text-genome-violet",
  },
  {
    org: "GenomeCo Science",
    trait: "Cardiovascular variants (rs12345)",
    reward: "175 GNM",
    deadline: "21 days",
    color: "text-yellow-400",
  },
];

const NAV_LINKS = [
  {
    href: "/insights",
    label: "Health Insights",
    sub: "AI risk scores & pharmacogenomics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
      </svg>
    ),
  },
  {
    href: "/genome",
    label: "Submit Genome",
    sub: "One-time World ID verified · earn 500 GNM",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    href: "/records",
    label: "Health Records",
    sub: "Upload medical documents · earn 10 GNM each",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    href: "/consent",
    label: "Manage Consent",
    sub: "Control institutional data access",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    href: "/publication",
    label: "Research Publications",
    sub: "Browse studies using your data",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const { data: gnmBalance, isLoading: balanceLoading } = useBalance({
    address,
    token: CONTRACTS.healthToken as `0x${string}`,
  });

  const { data: recordCount, isLoading: recordsLoading } = useReadContract({
    address: CONTRACTS.recordVault as `0x${string}`,
    abi: RECORD_VAULT_ABI,
    functionName: "recordCount",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const hasGenome =
    typeof window !== "undefined" && !!sessionStorage.getItem("wld_proof");
  const gnmNum = gnmBalance ? Number(gnmBalance.formatted) : 0;
  const recordNum = recordCount ? Number(recordCount) : 0;

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-400">Connect wallet to view dashboard</p>
        <ConnectButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">My Health Dashboard</h1>
        <p className="text-xs text-gray-500 font-mono break-all">{address}</p>
      </div>

      {/* GNM Balance hero */}
      <div
        className="rounded-2xl bg-genome-card border border-genome-border p-6 mb-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0e1424 0%, #0d1a2a 100%)" }}
      >
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #00c9a7, transparent 70%)" }}
        />
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">GNM Balance</p>
        {balanceLoading ? (
          <Skeleton className="w-40 h-12" variant="card" />
        ) : (
          <div className="flex items-end gap-3">
            <span className="text-5xl font-extrabold text-genome-teal tabular-nums">
              {gnmNum.toLocaleString()}
            </span>
            <span className="text-xl text-gray-400 mb-1 font-semibold">GNM</span>
          </div>
        )}
        <p className="text-xs text-gray-600 mt-2">HealthToken on WorldChain Sepolia</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatBadge
          label="Genome"
          value={hasGenome ? "Uploaded" : "Pending"}
          color={hasGenome ? "text-genome-teal" : "text-yellow-400"}
          dot={hasGenome ? "bg-genome-teal" : "bg-yellow-400"}
        />
        <StatBadge
          label="Records"
          value={recordsLoading ? "—" : String(recordNum)}
          color="text-genome-violet"
          dot="bg-genome-violet"
        />
        <StatBadge
          label="Consents"
          value="Active"
          color="text-green-400"
          dot="bg-green-400"
        />
      </div>

      {/* Data type progress */}
      <div className="rounded-xl bg-genome-card border border-genome-border p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Data Completeness
        </p>
        <div className="space-y-4">
          <ProgressRow
            label="Genome (VCF/SNP)"
            pct={hasGenome ? 100 : 0}
            color="#00c9a7"
            note={hasGenome ? "Registered on-chain" : "Not submitted"}
          />
          <ProgressRow
            label="Health Records"
            pct={Math.min(recordNum * 20, 100)}
            color="#a78bfa"
            note={`${recordNum} document${recordNum !== 1 ? "s" : ""} uploaded`}
          />
          <ProgressRow
            label="Consent Grants"
            pct={40}
            color="#34d399"
            note="1 of 3 grants active"
          />
        </div>
      </div>

      {/* Research opportunities */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Research Opportunities
        </p>
        <div className="space-y-3">
          {OPPORTUNITIES.map((o) => (
            <div
              key={o.org + o.trait}
              className="rounded-xl bg-genome-card border border-genome-border p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">{o.org}</p>
                <p className="text-sm font-medium text-gray-200 leading-snug truncate">{o.trait}</p>
                <p className="text-xs text-gray-600 mt-0.5">Closes in {o.deadline}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`text-sm font-bold ${o.color}`}>{o.reward}</span>
                <button className="mt-1 block text-xs text-gray-600 hover:text-genome-teal transition">
                  Opt in →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation links */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Actions
        </p>
        <div className="space-y-2">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-4 p-4 rounded-xl bg-genome-card border border-genome-border hover:border-genome-teal transition group"
            >
              <span className="text-gray-500 group-hover:text-genome-teal transition">
                {l.icon}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-gray-200 text-sm">{l.label}</p>
                <p className="text-xs text-gray-500 truncate">{l.sub}</p>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4 text-gray-600 ml-auto shrink-0"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Privacy note */}
      <div className="p-4 rounded-xl bg-genome-card border border-genome-border">
        <p className="text-xs text-gray-600">
          Your genome is linked to a World ID nullifier, not this address.
          Your wallet is never shared with researchers.
        </p>
      </div>
    </main>
  );
}

function StatBadge({
  label,
  value,
  color,
  dot,
}: {
  label: string;
  value: string;
  color: string;
  dot: string;
}) {
  return (
    <div className="rounded-xl bg-genome-card border border-genome-border p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ProgressRow({
  label,
  pct,
  color,
  note,
}: {
  label: string;
  pct: number;
  color: string;
  note: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{note}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-genome-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
