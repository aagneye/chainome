"use client";

import { useAccount, useReadContract, useBalance } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CONTRACTS } from "@/lib/contracts";
import Link from "next/link";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const { data: gnmBalance } = useBalance({
    address,
    token: CONTRACTS.healthToken.address as `0x${string}`,
  });

  const { data: recordCount } = useReadContract({
    address: CONTRACTS.recordVault.address as `0x${string}`,
    abi: CONTRACTS.recordVault.abi,
    functionName: "getRecordCount",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

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
      <h1 className="text-3xl font-bold text-genome-teal mb-8">My Health Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label="GNM Balance"
          value={gnmBalance ? `${Number(gnmBalance.formatted).toFixed(0)} GNM` : "—"}
        />
        <StatCard
          label="Health Records"
          value={recordCount !== undefined ? String(recordCount) : "—"}
        />
      </div>

      <div className="space-y-3">
        <SectionHeader>Actions</SectionHeader>
        <ActionRow
          href="/genome"
          icon="🧬"
          title="Submit Genome"
          subtitle="One-time World ID verified submission · earn 500 GNM"
        />
        <ActionRow
          href="/records"
          icon="📄"
          title="Add Health Record"
          subtitle="Upload medical documents · earn 10 GNM each"
        />
        <ActionRow
          href="/consent"
          icon="🔐"
          title="Manage Consent"
          subtitle="Control which institutions can access your data"
        />
      </div>

      <div className="mt-8 p-4 rounded-xl bg-genome-card border border-genome-border">
        <p className="text-xs text-gray-500 mb-1">Your anonymous ID</p>
        <p className="font-mono text-xs text-gray-400 break-all">{address}</p>
        <p className="text-xs text-gray-600 mt-2">
          Your genome is linked to a World ID nullifier, not this address.
          Your wallet address is never shared with researchers.
        </p>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-genome-card border border-genome-border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-genome-teal">{value}</p>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{children}</h2>;
}

function ActionRow({ href, icon, title, subtitle }: { href: string; icon: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl bg-genome-card border border-genome-border hover:border-genome-teal transition"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-gray-200">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <span className="ml-auto text-gray-600">›</span>
    </Link>
  );
}
