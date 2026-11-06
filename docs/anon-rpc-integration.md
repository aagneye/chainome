# Anon-RPC Integration — GenomeChain

**ETHGlobal Mumbai 2026 · Ethereum Foundation · Best Use of Anon-RPC**

GenomeChain routes **every chain read through [EF Anon-RPC](https://github.com/ethereum/anon-rpc) by default**, over the Nox mixnet, with no fallback to a direct RPC.

---

## Why it matters for medical data

A normal RPC provider logs the caller's IP next to every request. For a genome platform that means:

```
home IP → RPC provider logs → wallet address → genome CID / records / study participation
```

The chain data is pseudonymous, but the RPC log is not. Anon-RPC removes the first link: the provider sees a mixnet exit, never the patient's IP.

---

## What we built

| File | What it does |
|---|---|
| `packages/frontend/lib/anonRpc.ts` | One `AnonRpcWorker` per page (from `@anon-rpc/browser-harness@0.4.0`), JSON-RPC batching, per-wallet isolation, status + traffic counters |
| `packages/frontend/lib/wagmi.ts` | WorldChain Sepolia (4801) and mainnet (480) transports are `anonTransport(url)`. No `http()` transport, no `fallback()` |
| `packages/frontend/components/AnonRpcStatus.tsx` | Floating badge: status, network, private vs direct request count, live "Check now" block read, Nox ↔ Nym switch |

```
Page (useReadContract, useBalance)
        │
   wagmi / viem
        │
 anonTransport ── 10 ms batch window → one JSON-RPC batch
        │          isolationKey = wallet address
        ▼
 AnonRpcWorker (null-origin sandboxed iframe, hash-pinned bundle)
        │
 Nox mixnet (Sphinx packets; TLS to the RPC runs inside the worker)
        ▼
 WorldChain RPC  ──►  GenomeRegistry · RecordVault · ConsentManager · StudyRegistry …
```

### Design choices

- **On by default, no silent fallback.** If the mixnet is down, reads fail and the badge turns red. A hidden fallback to a direct RPC would leak the IP exactly when the user is least likely to notice.
- **Batching.** A mixnet round trip costs ~0.5–3 s. Calls made in the same 10 ms window go out as one JSON-RPC batch. Measured on WorldChain Sepolia over Nox: 5 sequential reads 4.3 s, 5 parallel 1.4 s, 5 batched **0.39 s**.
- **Per-wallet isolation.** `anonOptions.isolationKey` is the wallet address (a random session key before sign-in), so two wallets used on one device are not linkable by the network.
- **Worker starts on app load**, so the mixnet is warm before the first page read. Calls made before `ready` are buffered by the harness.
- **Two networks, picked per engine, with one automatic switch.** Nox is the default on Chromium (Android World App, Chrome). On WebKit (every iOS browser, so World App on iPhone) Nox's KPS exchange fails (`kps.exchange.failed` → `TOPOLOGY_FETCH_FAILED`) while Nym works, so WebKit starts on Nym. If the chosen network is not ready in time (Nox 20 s, Nym 60 s) or fails, the app switches once to the other one. Both are anon-rpc networks listed in `ethereum/anon-rpc`, so a switch never sends traffic directly. The user can also pick in the badge.

### Network choice (spike, 2026-11-06, venue wifi, target WorldChain Sepolia)

| Network | Ready | Per request | Result |
|---|---|---|---|
| **Nox** | 3–5 s | 0.4–3 s | ✅ default |
| Nym | ~10 s (spike) – 32 s (in app); ~18 MB bundle | 0.4–0.8 s warm, 5–13 s first | ✅ backup |
| Tor (tor-js) | — | — | ❌ demo gateway unreachable |
| Passthrough | 1 s | 0.4–1 s | reference only, no anonymity |

iOS Simulator (iPhone 15 Pro, Safari = WebKit, same engine as World App on iPhone):

| Network | Result |
|---|---|
| Passthrough | ✅ ready 7 s (sandbox and hash pinning work on WebKit) |
| Nox | ❌ KPS peers dial, every exchange fails; retries forever |
| **Nym** | ✅ ready 10–20 s, reads 0.6–8.5 s; in-app "Check now" read block 36,714,529 |

---

## Traffic that does **not** go through Anon-RPC (disclosed)

| Traffic | Why |
|---|---|
| Transactions (`MiniKit.sendTransaction`) | World App signs and broadcasts them through its own infrastructure; the page never holds the signed tx. |
| `/api/lab-attest` server-side reads/writes | Runs on our server with the lab key, not on the patient's device; the harness is browser-only. |
| One `workerHash()` bootstrap read | Locates the Nox worker bundle on Ethereum Sepolia. The anon-rpc spec makes this read pre-existing and non-anonymized. |
| Lighthouse uploads | File storage, not RPC. |

Everything else the browser asks the chain goes through Anon-RPC; the badge shows `Direct requests: 0`.

---

## Threat model

| Threat | Without | With Anon-RPC |
|---|---|---|
| RPC provider logs IP + wallet + what was read | Linkable | Provider sees mixnet exit only |
| ISP / venue wifi sees which RPC calls you make | Visible | Sphinx packets to mix nodes only |
| Two wallets on one phone linked by IP | Linkable | Separate isolation keys |
| Malicious anon-rpc worker censors or lies | — | **Not solved**: the worker sees requests and could alter answers. Trust is in the specifier contract owner; mitigation is the hash-pinned bundle and a network switch. |
| On-chain analysis | Same | Same — Anon-RPC hides who asks, not what is on-chain |

---

## How to see it

1. `pnpm install && pnpm --filter frontend dev`
2. Open the app; the badge bottom-right goes yellow → **Private RPC on · Nox · 100% private**.
3. Tap the badge → **Check now**: reads the latest WorldChain block through Nox and shows the latency.
4. Open `/dashboard` with a wallet: balance and record reads appear in **Private requests**; **Direct requests** stays 0.

## Known limits / next steps

- Verified on iOS WebKit (Simulator Safari); not yet inside the World App binary itself.
- Transactions could also be routed if the app signs them itself (outside World App).
- Answer verification (light client / proofs) would close the "worker can lie" gap.
