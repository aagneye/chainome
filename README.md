# GenomeChain

**Patient-sovereign genomic data marketplace on WorldChain.**

ETHGlobal Mumbai 2026 — Nov 5–8.

---

## What It Is

GenomeChain lets patients store their whole genome and medical records, earn GNM tokens, and consent to share them with research institutions.
- A certified lab node normalizes the patient's VCF (≤2 GB) to GRCh38, splits it per chromosome and encrypts each segment to the patient's key.
- Ciphertext lives on **Swarm**, the queryable index on **Arkiv**, and one manifest reference on **World Chain**.
- World ID enforces one genome per unique human at the EVM level, the Sybil-resistance primitive that every prior genomic marketplace lacked.

**Two layers:**
- **Consumer app:** genomes via the lab pipeline; bills, scans, prescriptions and lab reports encrypted in the browser → earn GNM. All transactions go through Anon RPC (no IP→wallet linkage). The index lives in Arkiv: public pointers and hashes, with health findings sealed to the patient.
- **Research marketplace:** Pharma publishes studies on-chain (StudyRegistry). Patients browse and consent. Institutions query Arkiv for matched cohorts. AI inference runs in 0G Private Computer (TEE) — only aggregate outputs returned.

---

## Prize Tracks

| Track | Integration |
|-------|-------------|
| **World** | World ID Orb verification gating genome submission. `nullifier_hash` enforces one-genome-per-human. PBH for gas subsidies. Anon RPC for IP privacy. |
| **Arkiv (+ Swarm bonus)** | Genome datasets, per-chromosome segments, sealed health features and medical records as typed Arkiv entities pointing at encrypted bytes on Swarm. `/genome` reads them live. Consent grants expire with consent. See [`arkiv/`](arkiv/). |
| **0G** | AI inference on encrypted genomic data inside TEE. Raw data never leaves patient control. |
| **EF** | OP Stack L2 (WorldChain). All 7 contracts EVM-standard. |
| **ENS** | Institution profiles in StudyRegistry resolve via ENS. |
| **Definitive** | Genome-anchored RWD with on-chain consent audit trail. |

---

## Architecture

```
VCF ≤2 GB ──lab node (packages/pipeline, Docker)──────────────────────────────────────────
  detect build → GRCh38 (liftover if 37) → bcftools norm/PASS → anonymize header → QC
  → PGx panel (sealed to patient) → split per chromosome → AES-256-GCM per segment
        │                                   │                                  │
   Swarm: ciphertext + manifest.json   Arkiv: dataset / segment /         World Chain:
   (plain refs, safe to publish)       features entities (Rabdi)          LabAttestation(manifestRef)
                                            │                          → GenomeRegistry.submitGenome
                                  /genome reads Arkiv → downloads from Swarm → decrypts in browser
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
| Genome pipeline | `packages/pipeline`: Node 22 + bcftools 1.16 / samtools / CrossMap in Docker, run on the lab node |
| File storage | Swarm (`@ethersphere/bee-js` 13): AES-256-GCM ciphertext only, per-chromosome segments |
| Encryption | per-file data keys wrapped to the patient's X25519 key (derived from a wallet signature), `packages/shared/src/keys.ts` |
| Metadata DB | Arkiv Rabdi testnet (`@arkiv-network/sdk` 1.0): `genomechain.*` schemas in `packages/shared/src/arkiv.ts` |
| Privacy RPC | WorldChain Anon RPC |
| Confidential compute | 0G Private Computer (TEE) |
| Frontend | Next.js, Wagmi, Viem |
| Token | ERC-20 GNM with MINTER_ROLE |

---

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — full technical architecture
- [`docs/ecosystem-flow.html`](docs/ecosystem-flow.html) — interactive data flow diagram
- [`docs/genome-pipeline.md`](docs/genome-pipeline.md): genome data pipeline, covering design, normalization steps, measurements and status
- [`arkiv/schema.md`](arkiv/schema.md): entities, the fields we query, owners, expiry
- [`arkiv/how-you-use-arkiv.md`](arkiv/how-you-use-arkiv.md), [`arkiv/why-arkiv.md`](arkiv/why-arkiv.md), [`arkiv/reach.md`](arkiv/reach.md), [`arkiv/friction.md`](arkiv/friction.md): Arkiv judging criteria
- [`arkiv/swarm.md`](arkiv/swarm.md): Arkiv + Swarm bonus (what lives where, how to run an upload and a read)

---

## Arkiv: writer wallet and a query you can run

- **Writer wallet (lab node):** _filled in after the first live run_
- **Query** (read-only, no key needed beyond an Arkiv access key):

```bash
pnpm --filter pipeline run query -- --dataset <dataset entity key>
pnpm --filter pipeline run query -- --patient <patient wallet>
```

It returns one row per chromosome (`chrom`, `variants`, `swarmRef`), the same data `/genome` shows.

---

## Genome pipeline (lab node)

```bash
docker build -f packages/pipeline/docker/Dockerfile -t genomechain-pipeline .
bash packages/pipeline/scripts/setup-vm.sh          # GRCh38 FASTA, liftover chain, GIAB HG002 demo VCF
bash packages/pipeline/scripts/run.sh --vcf /gc/in/HG002_GRCh38.vcf.gz \
  --patient 0x<wallet> --patient-pubkey <from /genome> [--nullifier <World ID nullifier>] [--dry-run]
```

On GIAB HG002 (156 MB gz, ~1 GB VCF), the pipeline finishes in about 60 s on 16 threads: 4,096,123 variants, Ti/Tv 2.09, het/hom 1.58, and 22 encrypted segments totalling 67 MB.

---

## Branch Strategy

- `master` — production-ready milestones
- `feature/*`, `fix/*` — working branches

See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow.
