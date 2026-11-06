"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useMiniKitAddress } from "@/hooks/useMiniKitAddress";
import { worldChainSepolia } from "@/lib/wagmi";
import {
  ANON_NETWORKS,
  type AnonNetwork,
  checkAnonRpc,
  getAnonRpcState,
  setAnonIsolationKey,
  setAnonNetwork,
  startAnonRpc,
  subscribeAnonRpc,
} from "@/lib/anonRpc";

const DOT: Record<string, string> = {
  idle:       "bg-gray-500",
  connecting: "bg-yellow-400 animate-pulse",
  ready:      "bg-green-400",
  error:      "bg-red-500",
};

const LABEL: Record<string, string> = {
  idle:       "Private RPC starting",
  connecting: "Private RPC connecting",
  ready:      "Private RPC on",
  error:      "Private RPC down",
};

/**
 * Floating badge that shows the Anon-RPC route is live and how much of the
 * app's RPC traffic went through it. Also starts the worker on app load.
 */
export default function AnonRpcStatus() {
  const s = useSyncExternalStore(subscribeAnonRpc, getAnonRpcState, getAnonRpcState);
  const address = useMiniKitAddress();
  const [open, setOpen] = useState(false);
  const [check, setCheck] = useState<string>();

  async function runCheck() {
    setCheck("Reading latest WorldChain block privately…");
    try {
      const { blockNumber, ms } = await checkAnonRpc(worldChainSepolia.rpcUrls.default.http[0]);
      setCheck(`Block ${blockNumber.toLocaleString()} via ${ANON_NETWORKS[getAnonRpcState().network].label} in ${(ms / 1000).toFixed(1)} s`);
    } catch (err) {
      setCheck(`Check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  useEffect(() => {
    startAnonRpc();
  }, []);

  useEffect(() => {
    setAnonIsolationKey(address);
  }, [address]);

  const total = s.privateRequests + s.directRequests;
  const share = total === 0 ? 100 : Math.round((s.privateRequests / total) * 100);

  return (
    <div className="fixed bottom-4 right-4 z-50 text-xs">
      {open && (
        <div className="mb-2 w-72 rounded-xl border border-genome-border bg-genome-card p-4 shadow-xl animate-fade-in">
          <p className="font-semibold text-white mb-1">Anonymous RPC</p>
          <p className="text-gray-400 mb-3 leading-relaxed">
            Every chain read is sent through EF Anon-RPC over a mixnet, so the RPC provider never sees your IP.
            There is no direct-RPC fallback.
          </p>
          <dl className="grid grid-cols-2 gap-y-1 text-gray-300 mb-3">
            <dt className="text-gray-500">Status</dt>
            <dd>{LABEL[s.status]}</dd>
            <dt className="text-gray-500">Connected in</dt>
            <dd>{s.readyMs ? `${(s.readyMs / 1000).toFixed(1)} s` : "—"}</dd>
            <dt className="text-gray-500">Private requests</dt>
            <dd>{s.privateRequests}</dd>
            <dt className="text-gray-500">Direct requests</dt>
            <dd>{s.directRequests}</dd>
            <dt className="text-gray-500">Batches sent</dt>
            <dd>{s.batches}</dd>
            <dt className="text-gray-500">Failed</dt>
            <dd>{s.failedRequests}</dd>
          </dl>
          {s.error && <p className="text-red-400 mb-3 break-words">{s.error}</p>}
          <button
            onClick={runCheck}
            className="w-full mb-2 rounded-lg border border-genome-border px-2 py-1 text-gray-200 hover:border-genome-teal transition"
          >
            Check now
          </button>
          {check && <p className="text-gray-300 mb-3 break-words">{check}</p>}
          <label className="block text-gray-500 mb-1">Network</label>
          <div className="flex gap-2 mb-3">
            {(Object.keys(ANON_NETWORKS) as AnonNetwork[]).map((n) => (
              <button
                key={n}
                onClick={() => setAnonNetwork(n)}
                className={`flex-1 rounded-lg border px-2 py-1 transition ${
                  s.network === n
                    ? "border-genome-teal text-genome-teal"
                    : "border-genome-border text-gray-400 hover:text-gray-200"
                }`}
              >
                {ANON_NETWORKS[n].label}
              </button>
            ))}
          </div>
          <p className="text-gray-500 leading-relaxed">
            Not routed: transactions (World App sends them), server-side lab attestation, and the one
            bootstrap read that locates the Anon-RPC worker.
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-genome-border bg-genome-card/90 px-3 py-1.5 text-gray-200 shadow-lg backdrop-blur"
        aria-expanded={open}
      >
        <span className={`h-2 w-2 rounded-full ${DOT[s.status]}`} />
        <span>{LABEL[s.status]}</span>
        <span className="text-gray-500">· {ANON_NETWORKS[s.network].label.split(" ")[0]} · {share}% private</span>
      </button>
    </div>
  );
}
