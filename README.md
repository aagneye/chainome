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
- **Research marketplace:** Pharma publishes studies on-chain (StudyRegistry). Patients browse and consent. Institutions query Arkiv for matched cohorts and see only the data types each patient consented to.

---

## Prize Tracks

| Track | Integration |
|-------|-------------|
| **World — Mini App** | World ID Orb gating genome submission (`nullifier_hash` = one-genome-per-human). MiniKit walletAuth + verify replace RainbowKit/IDKit — runs natively inside World App. Agent Pass gates AI health insights. |
| **Arkiv (+ Swarm bonus)** | Genome datasets, per-chromosome segments, sealed health features and medical records as typed Arkiv entities pointing at encrypted bytes on Swarm. `/genome` reads them live. Consent grants expire with consent. See [`arkiv/`](arkiv/). |
| **EF Anon-RPC** | Every chain read goes through WorldChain Anon RPC — no IP→wallet linkage. GDPR Art. 9 compliance for medical data. See `docs/anon-rpc-integration.md`. |

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
| World ID | MiniKit (`@worldcoin/minikit-js`), `IWorldID` interface (Solidity) |
| Genome pipeline | `packages/pipeline`: Node 22 + bcftools 1.16 / samtools / CrossMap in Docker, run on the lab node |
| File storage | Swarm (`@ethersphere/bee-js` 13): AES-256-GCM ciphertext only, per-chromosome segments |
| Encryption | per-file data keys wrapped to the patient's X25519 key (derived from a wallet signature), `packages/shared/src/keys.ts` |
| Metadata DB | Arkiv Rabdi testnet (`@arkiv-network/sdk` 1.0): `genomechain.*` schemas in `packages/shared/src/arkiv.ts` |
| Privacy RPC | WorldChain Anon RPC — strips IP from all chain reads |
| Frontend | Next.js, Wagmi, Viem |
| Token | ERC-20 GNM with MINTER_ROLE |

---

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — full technical architecture
- [`docs/ecosystem-flow.html`](docs/ecosystem-flow.html) — interactive data flow diagram
- [`docs/genome-pipeline.md`](docs/genome-pipeline.md) — genome data pipeline, normalization steps, measurements
- [`docs/anon-rpc-integration.md`](docs/anon-rpc-integration.md) — Anonymous RPC integration + threat model
- [`arkiv/schema.md`](arkiv/schema.md) — Arkiv entity schema
- [`arkiv/why-arkiv.md`](arkiv/why-arkiv.md) — Arkiv prize submission
- [`arkiv/reach.md`](arkiv/reach.md) — user reach and pilot plan
- [`arkiv/friction.md`](arkiv/friction.md) — integration friction report
- [`arkiv/how-you-use-arkiv.md`](arkiv/how-you-use-arkiv.md) — Arkiv usage walkthrough (5th prize file)
- [`arkiv/swarm.md`](arkiv/swarm.md) — Arkiv + Swarm bonus (what lives where, how to run uploads/reads)
- [`TEAM_TRACKS.md`](TEAM_TRACKS.md) — team work split and remaining tasks

---

## Genome pipeline (lab node)

```bash
docker build -f packages/pipeline/docker/Dockerfile -t genomechain-pipeline .
bash packages/pipeline/scripts/setup-vm.sh          # GRCh38 FASTA, liftover chain, GIAB HG002 demo VCF
bash packages/pipeline/scripts/run.sh --vcf /gc/in/HG002_GRCh38.vcf.gz \
  --patient 0x<wallet> --patient-pubkey <from /genome> [--nullifier <World ID nullifier>] [--dry-run]
```

On GIAB HG002 (156 MB gz, ~1 GB VCF), pipeline finishes in ~60s on 16 threads: 4,096,123 variants, Ti/Tv 2.09, het/hom 1.58, 22 encrypted segments totalling 67 MB.

---

## Branch Strategy

- `master` — production-ready milestones
- `feature/*`, `fix/*` — working branches

See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow.
