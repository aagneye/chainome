# GenomeChain

**Patient-sovereign genomic data marketplace on WorldChain.**

ETHGlobal Mumbai 2026 — Nov 5–8.

---

## What It Is

GenomeChain lets patients upload their medical records and genomic data, earn GNM tokens, and consent to share de-identified metadata with research institutions. All files are AES-256 encrypted before leaving the device. Encrypted blobs go to Lighthouse (IPFS+Filecoin). Only the 46-byte CID lands on WorldChain. World ID enforces one genome per unique human at the EVM level — the Sybil-resistance primitive that every prior genomic marketplace lacked.

**Two layers:**
- **Consumer app:** Upload bills, scans, prescriptions, lab reports, genomes → earn GNM. All transactions via Anon RPC (no IP→wallet linkage). Metadata indexed in Arkiv (patient-owned entities, consent-gated, GDPR-native expiry).
- **Research marketplace:** Pharma publishes studies on-chain (StudyRegistry). Patients browse and consent. Institutions query Arkiv for matched cohorts and see only the data types each patient consented to.

---

## Prize Tracks

| Track | Integration |
|-------|-------------|
| **World — IDKit + Mini App** | World ID Orb gating genome submission (`nullifier_hash` = one-genome-per-human). MiniKit walletAuth + verify replace RainbowKit/IDKit — runs natively inside World App. Agent Pass gates AI health insights. |
| **Arkiv** | Medical record metadata stored as patient-owned Arkiv entities. Consent-gated by on-chain ConsentManager. 10-year GDPR expiry. Cross-institution queryable without centralized broker. 5/5 prize files in `docs/arkiv/`. |
| **Ethereum Foundation** | `ProtocolRegistry.sol` pre-registers clinical trial protocols on-chain before CT.gov. Detects outcome switching cryptographically. All contracts EVM-standard on WorldChain (OP Stack L2). |
| **Anon RPC** | Every patient transaction broadcast through WorldChain Anon RPC (`wagmi.ts`). IP stripped before hitting node — breaks IP→wallet→medical record linkage. GDPR Art. 9 at transport layer. |

---

## Architecture

```
Patient → encrypt(AES-256) → Lighthouse/IPFS → CID on WorldChain
                                                      │
                                              Arkiv metadata entity
                                              (owner = patient wallet)
                                                      │
                                         Institution queries (with consent)
                                                      │
                                         Only consented data types shared
```

Contracts (all on WorldChain): `GenomeRegistry`, `RecordVault`, `ConsentManager`, `HealthToken`, `LabRegistry`, `LabAttestation`, `ProtocolRegistry`.

---

## Quick Start

```bash
git clone <repo>
cd ethglobal_mumbai_2026
pnpm install

# Run contract tests
cd packages/contracts
npx hardhat test

# Deploy to WorldChain Sepolia (chain ID 4801)
npx hardhat run ignition/modules/Deploy.ts --network worldchain-sepolia

# Run frontend
cd packages/frontend
pnpm dev
```

---

## Contract Addresses

| Contract | Address (WorldChain Sepolia) |
|----------|------------------------------|
| HealthToken (GNM) | `0x62cD9Ce37C52C43eB8DA2C4CCcb263ae07f34E48` |
| LabRegistry | `0x95FdD2510830F0A481d568E26E60AC2C302742ff` |
| LabAttestation | `0xE6583D2ABa77909692e6d2466BD8D980D19d5a9c` |
| GenomeRegistry | `0x6f5b65B4709f0020AAa75eeB5e3D279C773eDF91` |
| RecordVault | `0x2Ee90d11C216E024209892cFf158C1A362e82598` |
| ConsentManager | `0xa1D0A76Abf4399e55F47205783E5e5F3b1ceC671` |
| ProtocolRegistry | `0x5EE1F97560379D16215Da1D79DBD0877dd2b6Fa0` |

Network: WorldChain Sepolia (chain ID 4801) · Explorer: https://worldchain-sepolia.explorer.alchemy.com

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contracts | Solidity 0.8.x, Hardhat, TypeChain |
| World ID | `@worldcoin/idkit` (frontend), `IWorldID` interface (Solidity) |
| File storage | Lighthouse SDK (IPFS + Filecoin), AES-256 client-side encryption |
| Metadata DB | Arkiv — `medical_record_v1` entities, patient-owned |
| Privacy RPC | WorldChain Anon RPC |
| Frontend | Next.js, Wagmi, Viem |
| Token | ERC-20 GNM with MINTER_ROLE |

---

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — full technical architecture
- [`docs/ecosystem-flow.html`](docs/ecosystem-flow.html) — interactive data flow diagram
- [`docs/arkiv/schema.md`](docs/arkiv/schema.md) — Arkiv entity schema
- [`docs/arkiv/why-arkiv.md`](docs/arkiv/why-arkiv.md) — Arkiv prize submission
- [`docs/arkiv/reach.md`](docs/arkiv/reach.md) — user reach and pilot plan
- [`docs/arkiv/friction.md`](docs/arkiv/friction.md) — integration friction report
- [`docs/arkiv/how-you-use-arkiv.md`](docs/arkiv/how-you-use-arkiv.md) — Arkiv usage walkthrough (5th prize file)
- [`docs/anon-rpc-integration.md`](docs/anon-rpc-integration.md) — Anonymous RPC integration + threat model
- [`docs/ens-integration.md`](docs/ens-integration.md) — ENS subname architecture for datasets
- [`docs/idkit-integration-debrief.md`](docs/idkit-integration-debrief.md) — World IDKit debrief (prize submission)
- [`TEAM_TRACKS.md`](TEAM_TRACKS.md) — team work split and remaining tasks

---

## Branch Strategy

- `master` — production-ready milestones
- `feature/*`, `fix/*` — working branches

See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow.
