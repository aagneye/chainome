# Anonymous RPC Integration — GenomeChain

**ETHGlobal Mumbai 2026 · Prize Track: WorldChain Anonymous RPC**

---

## Why Anon RPC matters for medical data

Standard Ethereum RPC nodes log the sender's IP address alongside every transaction. For a genomic data platform this is a critical privacy leak:

```
IP address → wallet address → genome CID → medical profile
```

A network observer (ISP, RPC provider, or on-path attacker) can link a patient's home IP to their on-chain medical submissions. This breaks the privacy guarantee even if the on-chain data is pseudonymous.

WorldChain Anonymous RPC strips IP metadata before the transaction reaches the node. The node never sees the sender's IP — only the signed transaction payload.

---

## What we built

**File:** `packages/frontend/lib/wagmi.ts`

```typescript
// WorldChain Sepolia Anon RPC — strips IP from tx broadcast
const ANON_RPC  = "https://anon-rpc.worldchain-sepolia.g.alchemy.com/public";
const PUBLIC_RPC = "https://worldchain-sepolia.g.alchemy.com/public"; // fallback

export const wagmiConfig = createConfig({
  chains: [worldChainSepolia, worldChain],
  transports: {
    // Primary: Anon RPC. Fallback: public RPC if anon unavailable.
    [worldChainSepolia.id]: fallback([http(ANON_RPC), http(PUBLIC_RPC)]),
    [worldChain.id]: http("https://worldchain-mainnet.g.alchemy.com/public"),
  },
});
```

All `useReadContract` calls and wagmi-broadcast transactions go through the Anon RPC endpoint by default. The fallback ensures the app stays functional if the Anon RPC endpoint is temporarily unavailable.

With MiniKit (`sendTransaction`), the World App itself broadcasts transactions through its own RPC infrastructure — which uses the same privacy-preserving layer at the protocol level.

---

## Data flow with Anon RPC

```
Patient device
    │
    ▼
World App (MiniKit)
    │  sendTransaction — World App's own RPC (privacy at protocol level)
    ▼
wagmi useReadContract
    │  → Anon RPC (strips IP) → WorldChain node
    │  → Fallback: Public RPC if Anon RPC down
    ▼
WorldChain Sepolia (4801) / WorldChain Mainnet (480)
    │
    ▼
GenomeRegistry / RecordVault / StudyRegistry ...
```

---

## Threat model addressed

| Threat | Without Anon RPC | With Anon RPC |
|--------|-----------------|---------------|
| ISP logs IP + wallet | ✗ Linkable | ✓ IP stripped |
| RPC provider surveillance | ✗ Logs IP | ✓ No IP seen |
| On-path attacker | ✗ IP visible | ✓ Encrypted relay |
| On-chain analysis | Same (chain is public) | Same |

Anon RPC does not hide the transaction content (which is public on-chain) — it hides the network identity of the sender.

---

## Medical data relevance

GenomeChain stores:
- Genome CIDs (uniquely identifying biological data)
- Medical record CIDs (bills, scans, prescriptions)
- Study participation records

All of these are sensitive under GDPR Article 9 (special category data). Without Anon RPC, submitting a genome from your home WiFi creates a permanent IP→genome linkage in RPC provider logs. With Anon RPC, that linkage is severed at the transport layer.

---

## Production path

For mainnet:
1. Update `worldChain` transport to use Anon RPC mainnet endpoint when available
2. Add `NEXT_PUBLIC_ANON_RPC` env var so endpoint can be rotated without code changes
3. Consider Tor-over-RPC for highest-risk submissions (genome upload)

---

*GenomeChain — ETHGlobal Mumbai 2026*
