# GenomeChain

**Patient-sovereign genomic data marketplace on WorldChain.**

ETHGlobal Mumbai 2026 — Nov 5–8.

---

## What It Is

GenomeChain lets patients upload their medical records and genomic data, earn GNM tokens, and consent to share de-identified metadata with research institutions. All files are AES-256 encrypted before leaving the device. Encrypted blobs go to Lighthouse (IPFS+Filecoin). Only the 46-byte CID lands on WorldChain. World ID enforces one genome per unique human at the EVM level — the Sybil-resistance primitive that every prior genomic marketplace lacked.

**Two layers:**
- **Consumer app:** Upload bills, scans, prescriptions, lab reports, genomes → earn GNM. All transactions via Anon RPC (no IP→wallet linkage). Metadata indexed in Arkiv (patient-owned entities, consent-gated, GDPR-native expiry).
- **Research marketplace:** Pharma publishes studies on-chain (StudyRegistry). Patients browse and consent. Institutions query Arkiv for matched cohorts. AI inference runs in 0G Private Computer (TEE) — only aggregate outputs returned.

---

## Prize Tracks

| Track | Integration |
|-------|-------------|
| **World** | World ID Orb verification gating genome submission. `nullifier_hash` enforces one-genome-per-human. PBH for gas subsidies. Anon RPC for IP privacy. |
| **Arkiv** | Medical record metadata stored as owned patient entities. Consent-gated by on-chain ConsentManager. 10-year GDPR expiry. Cross-institution queryable without centralized broker. |
| **0G** | AI inference on encrypted genomic data inside TEE. Raw data never leaves patient control. |
| **EF** | OP Stack L2 (WorldChain). All 7 contracts EVM-standard. |
| **ENS** | Institution profiles in StudyRegistry resolve via ENS. |
| **Definitive** | Genome-anchored RWD with on-chain consent audit trail. |

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
                                         0G Private Computer (TEE)
                                                      │
                                              Aggregate outputs only
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

| Contract | Address |
|----------|---------|
| GenomeRegistry | TBD after deployment |
| RecordVault | TBD after deployment |
| ConsentManager | TBD after deployment |
| HealthToken | TBD after deployment |
| LabRegistry | TBD after deployment |
| LabAttestation | TBD after deployment |
| ProtocolRegistry | TBD after deployment |

Network: WorldChain Sepolia (chain ID 4801) for testnet, WorldChain mainnet (chain ID 480) for production.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contracts | Solidity 0.8.x, Hardhat, TypeChain |
| World ID | `@worldcoin/idkit` (frontend), `IWorldID` interface (Solidity) |
| File storage | Lighthouse SDK (IPFS + Filecoin), AES-256 client-side encryption |
| Metadata DB | Arkiv — `medical_record_v1` entities, patient-owned |
| Privacy RPC | WorldChain Anon RPC |
| Confidential compute | 0G Private Computer (TEE) |
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

---

## Branch Strategy

- `master` — production-ready milestones
- `feature/*`, `fix/*` — working branches

See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow.
