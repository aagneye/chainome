import { custom } from "viem";
import type { AnonRpcWorker } from "@anon-rpc/browser-harness";

/**
 * Anon-RPC transport (EF anon-rpc, https://github.com/ethereum/anon-rpc).
 *
 * Every JSON-RPC read the app makes is sent through a sandboxed anon-rpc
 * worker that carries it over a mixnet, so the RPC provider never sees the
 * patient's IP address. There is no fallback to a direct RPC: if the private
 * route is down, reads fail and the status badge says so.
 *
 * - One long-lived worker per page, started on app load.
 * - Calls made in the same tick are sent as one JSON-RPC batch (a mixnet
 *   round trip costs ~0.5–3 s, so batching matters more than anything else).
 * - Each wallet gets its own isolationKey, so two wallets used on one device
 *   are not linkable by the network.
 */

export type AnonNetwork = "nox" | "nym";

// Specifiers from adopters.json5 in ethereum/anon-rpc. The specifier chain is
// only where the worker bundle is looked up; requests can go to any RPC URL.
export const ANON_NETWORKS: Record<AnonNetwork, { label: string; specifier: `0x${string}`; bootstrapRpc: string }> = {
  nox: {
    label: "Nox mixnet",
    specifier: "0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A", // on Ethereum Sepolia
    bootstrapRpc: process.env.NEXT_PUBLIC_ANON_BOOTSTRAP_SEPOLIA_RPC ?? "https://ethereum-sepolia-rpc.publicnode.com",
  },
  nym: {
    label: "Nym mixnet",
    specifier: "0x3aCD9742C68F6d993066Ae25533e09b9e1f60eD0", // on Ethereum mainnet
    bootstrapRpc: process.env.NEXT_PUBLIC_ANON_BOOTSTRAP_MAINNET_RPC ?? "https://ethereum-rpc.publicnode.com",
  },
};

const NETWORK_STORAGE_KEY = "anon_rpc_network";
const BATCH_WINDOW_MS = 10;

export interface AnonRpcState {
  network: AnonNetwork;
  status: "idle" | "connecting" | "ready" | "error";
  error?: string;
  readyMs?: number;
  privateRequests: number; // JSON-RPC calls answered through anon-rpc
  failedRequests: number;
  directRequests: number;  // always 0 — kept so the badge can prove it
  batches: number;
}

function initialNetwork(): AnonNetwork {
  try {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(NETWORK_STORAGE_KEY) : null;
    if (stored === "nox" || stored === "nym") return stored;
  } catch {}
  return process.env.NEXT_PUBLIC_ANON_RPC_NETWORK === "nym" ? "nym" : "nox";
}

let state: AnonRpcState = {
  network: initialNetwork(),
  status: "idle",
  privateRequests: 0,
  failedRequests: 0,
  directRequests: 0,
  batches: 0,
};
const listeners = new Set<() => void>();

function setState(patch: Partial<AnonRpcState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeAnonRpc(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAnonRpcState() {
  return state;
}

// ── Worker lifecycle ────────────────────────────────────────────────────────

let workerPromise: Promise<AnonRpcWorker> | null = null;

function bootstrapProvider(url: string) {
  // Used once, to read the specifier contract. This single read is not
  // anonymized (anon-rpc SPEC: the bootstrap provider is pre-existing).
  return {
    request: async ({ method, params }: { method: string; params?: unknown }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params ?? [] }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.result;
    },
  };
}

function getWorker(): Promise<AnonRpcWorker> {
  if (!workerPromise) {
    const network = state.network;
    const net = ANON_NETWORKS[network];
    setState({ status: "connecting", error: undefined, readyMs: undefined });
    const started = performance.now();
    const promise = import("@anon-rpc/browser-harness").then(({ AnonRpcWorker }) => {
      const worker = new AnonRpcWorker({
        address: net.specifier,
        preExisting: { rpcProvider: bootstrapProvider(net.bootstrapRpc) },
      });
      worker.ready.then(
        () => {
          if (workerPromise === promise) setState({ status: "ready", readyMs: Math.round(performance.now() - started) });
        },
        (err: unknown) => {
          if (workerPromise !== promise) return;
          workerPromise = null; // next call retries with a fresh worker
          setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
        },
      );
      return worker;
    });
    workerPromise = promise;
  }
  return workerPromise;
}

/** Start connecting as soon as the app loads, so the first read is not slow. */
export function startAnonRpc() {
  if (typeof window === "undefined") return;
  getWorker().catch(() => {});
}

export async function setAnonNetwork(network: AnonNetwork) {
  if (network === state.network) return;
  try {
    window.localStorage.setItem(NETWORK_STORAGE_KEY, network);
  } catch {}
  const old = workerPromise;
  workerPromise = null;
  setState({ network, status: "idle" });
  old?.then((w) => w.close()).catch(() => {});
  startAnonRpc();
}

// ── Per-wallet isolation ────────────────────────────────────────────────────

let isolationKey = `session-${Math.random().toString(36).slice(2)}`;

export function setAnonIsolationKey(address: string | undefined) {
  if (address) isolationKey = `wallet-${address.toLowerCase()}`;
}

// ── Batched JSON-RPC over the worker ────────────────────────────────────────

interface Pending {
  id: number;
  method: string;
  params: unknown;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

const queues = new Map<string, Pending[]>();
let nextId = 1;

function rpcError(err: { code: number; message: string; data?: unknown }) {
  return Object.assign(new Error(err.message), { code: err.code, data: err.data });
}

async function flush(url: string) {
  const queue = queues.get(url) ?? [];
  queues.delete(url);
  if (queue.length === 0) return;

  const calls = queue.map(({ id, method, params }) => ({ jsonrpc: "2.0", id, method, params: params ?? [] }));
  try {
    const worker = await getWorker();
    const res = await worker.fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(calls.length === 1 ? calls[0] : calls),
      anonOptions: { isolationKey },
    } as RequestInit);
    if (!res.ok) throw new Error(`Anon-RPC upstream HTTP ${res.status}`);
    const json = await res.json();
    const byId = new Map((Array.isArray(json) ? json : [json]).map((r: { id: number }) => [r.id, r]));

    let answered = 0;
    for (const p of queue) {
      const r = byId.get(p.id) as { result?: unknown; error?: { code: number; message: string; data?: unknown } } | undefined;
      if (!r) p.reject(new Error("Anon-RPC: missing response in batch"));
      else if (r.error) p.reject(rpcError(r.error));
      else {
        answered++;
        p.resolve(r.result);
      }
    }
    setState({
      privateRequests: state.privateRequests + answered,
      failedRequests: state.failedRequests + queue.length - answered,
      batches: state.batches + 1,
    });
  } catch (err) {
    queue.forEach((p) => p.reject(err));
    setState({ failedRequests: state.failedRequests + queue.length });
  }
}

function enqueue(url: string, method: string, params: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let queue = queues.get(url);
    if (!queue) {
      queue = [];
      queues.set(url, queue);
      setTimeout(() => flush(url), BATCH_WINDOW_MS);
    }
    queue.push({ id: nextId++, method, params, resolve, reject });
  });
}

/** viem/wagmi transport that sends every request to `url` through anon-rpc. */
export function anonTransport(url: string) {
  return custom(
    {
      request: async ({ method, params }) => {
        if (typeof window === "undefined") {
          // anon-rpc is browser-only; never fall back to a direct request.
          throw new Error("Anon-RPC is only available in the browser");
        }
        return enqueue(url, method, params);
      },
    },
    { key: "anon-rpc", name: "Anon-RPC", retryCount: 1 },
  );
}

/** Read the latest block through Anon-RPC; used by the badge's live check. */
export async function checkAnonRpc(url: string): Promise<{ blockNumber: bigint; ms: number }> {
  const started = performance.now();
  const hex = (await enqueue(url, "eth_blockNumber", [])) as string;
  return { blockNumber: BigInt(hex), ms: Math.round(performance.now() - started) };
}
