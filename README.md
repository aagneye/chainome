# Chainome

**Patient-sovereign genomic data marketplace on WorldChain.**

ETHGlobal Mumbai 2026 · [Live App](https://chainome.vercel.app) · WorldChain Sepolia (chain ID 4801)

---

## What It Does

Chainome lets patients own their genome and medical records, earn GNM tokens, and choose which research institutions can access their data.

1. **Sign in** with World App — World ID proves you're a unique human (one genome per person, enforced on-chain)
2. **Upload** your VCF genome file — a certified lab node on Azure normalizes, encrypts per chromosome, and stores it on Swarm
3. **Earn** 500 GNM tokens — a smart contract attestation links your genome to your wallet
4. **Join studies** — research institutions publish studies on-chain; you consent and earn more GNM

All blockchain reads go through **EF Anon-RPC** (no IP→wallet linkage). Metadata lives on **Arkiv** (Rabdi testnet). Encrypted files live on **Swarm**.

---

## Prize Tracks

| Track | How we use it |
|-------|--------------|
| **World — Mini App** | MiniKit v2 walletAuth + sendTransaction. World ID Orb enforces one genome per human at the EVM level. Runs natively inside World App. |
| **Arkiv + Swarm** | Genome datasets, per-chromosome segments, sealed health features and medical records as typed Arkiv entities pointing at AES-256-GCM ciphertext on Swarm. |
| **EF Anon-RPC** | Every chain read is routed through WorldChain Anon RPC — no IP→wallet linkage, GDPR Art. 9 compliant for medical data. |

---

## Repo Structure

```
packages/
  frontend/   — Next.js mini app (runs in World App)
  contracts/  — Solidity contracts (Hardhat)
  pipeline/   — Genome processing pipeline (Node + Docker)
  shared/     — Types, Arkiv schemas, encryption utils
deploy/
  azure/      — Docker Compose, Caddy config, deploy script for lab node
docs/
  setup.md    — Full credentials and deployment checklist
```

---

## Quick Start (Local Dev)

### 1. Prerequisites

- Node.js 22+
- pnpm 9+ (`npm i -g pnpm`)
- Docker (for pipeline)

### 2. Clone and install

```bash
git clone https://github.com/aagneye/chainome.git
cd chainome
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example packages/frontend/.env.local
```

Open `packages/frontend/.env.local` and fill in:

```env
# Required to run locally
NEXT_PUBLIC_WLD_APP_ID=app_2913c2d5c136350fcea3a2933aba6364
NEXT_PUBLIC_CHAIN_ID=4801

# Contract addresses (already deployed — copy these in)
NEXT_PUBLIC_GENOME_REGISTRY=0x6f5b65B4709f0020AAa75eeB5e3D279C773eDF91
NEXT_PUBLIC_RECORD_VAULT=0x2Ee90d11C216E024209892cFf158C1A362e82598
NEXT_PUBLIC_CONSENT_MANAGER=0xa1D0A76Abf4399e55F47205783E5e5F3b1ceC671
NEXT_PUBLIC_HEALTH_TOKEN=0x62cD9Ce37C52C43eB8DA2C4CCcb263ae07f34E48
NEXT_PUBLIC_LAB_ATTESTATION=0xE6583D2ABa77909692e6d2466BD8D980D19d5a9c
NEXT_PUBLIC_STUDY_REGISTRY=    # fill if deploying StudyRegistry

# Server-side secrets (ask a teammate for these values)
WLD_SIGNER_PRIVATE_KEY=        # World ID RP signing key
ARKIV_ACCESS_KEY=              # from hub.arkiv.network/access-keys
PIPELINE_API_URL=              # https://<lab-domain>
PIPELINE_API_TOKEN=            # long random token (matches VM)
BEE_PROXY_TOKEN=               # long random token (matches VM)
SWARM_GATEWAY=                 # https://<lab-domain>/bee
```

### 4. Run the frontend

```bash
pnpm --filter frontend dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** To use World App features (sign in, send transactions), open the app inside World App or install the [World ID Sandbox](https://developer.world.org) test build on your phone.

---

## Deployed Contracts (WorldChain Sepolia)

| Contract | Address |
|----------|---------|
| HealthToken (GNM) | `0x62cD9Ce37C52C43eB8DA2C4CCcb263ae07f34E48` |
| LabRegistry | `0x95FdD2510830F0A481d568E26E60AC2C302742ff` |
| LabAttestation | `0xE6583D2ABa77909692e6d2466BD8D980D19d5a9c` |
| GenomeRegistry | `0x6f5b65B4709f0020AAa75eeB5e3D279C773eDF91` |
| RecordVault | `0x2Ee90d11C216E024209892cFf158C1A362e82598` |
| ConsentManager | `0xa1D0A76Abf4399e55F47205783E5e5F3b1ceC671` |
| ProtocolRegistry | `0x5EE1F97560379D16215Da1D79DBD0877dd2b6Fa0` |

Explorer: https://worldchain-sepolia.explorer.alchemy.com

---

## Running Contract Tests

```bash
cd packages/contracts
npx hardhat test
```

To redeploy (only needed if contracts change):

```bash
# Set PRIVATE_KEY in packages/contracts/.env first
npx hardhat run ignition/modules/Deploy.ts --network worldchain-sepolia
```

---

## Genome Pipeline (Lab Node on Azure)

The pipeline runs on a Docker-based Azure VM. Full setup: [`deploy/azure/README.md`](deploy/azure/README.md)

**What it does:**
1. Receives VCF upload from the frontend (up to 2 GB)
2. Normalizes to GRCh38 build, runs QC
3. Encrypts each chromosome segment with AES-256-GCM
4. Uploads ciphertext to Swarm, metadata to Arkiv
5. Signs a `LabAttestation` on WorldChain

**To deploy/update the lab node:**

```bash
# Requires VM SSH access and deploy/.env with VM_HOST, VM_USER
LAB_DOMAIN=<label>.<region>.cloudapp.azure.com bash deploy/azure/up.sh
```

Health check: `GET https://<LAB_DOMAIN>/healthz`

---

## World ID Configuration

| Field | Value |
|-------|-------|
| App ID | `app_2913c2d5c136350fcea3a2933aba6364` |
| RP ID | `rp_9caa8f923120ac6e` |
| Signer address | `0x287EFeC50aAc24ddd0E78a2264858d83E7da67D5` |
| Mini App URL | `https://chainome.vercel.app` |
| Portal | https://developer.world.org |

---

## Deployment & CI/CD

- **Production:** https://chainome.vercel.app
- **Auto-deploy:** Push to `main` → GitHub Actions → Vercel production
- **Full credentials checklist:** [`docs/setup.md`](docs/setup.md)

### Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — auto-deploys to Vercel |
| `master` | Staging |
| `dev` | Integration — merge feature branches here |
| `feat/*` | Feature work |

Merge order: `feat/*` → `dev` → `master` → `main`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Wagmi, Viem |
| World ID | MiniKit v2 (`@worldcoin/minikit-js`) |
| Smart contracts | Solidity 0.8, Hardhat |
| File storage | Swarm (`@ethersphere/bee-js`) — AES-256-GCM encrypted |
| Metadata | Arkiv Rabdi testnet (`@arkiv-network/sdk`) |
| Privacy RPC | EF Anon-RPC (WorldChain) |
| Pipeline | Node 22 + bcftools + Docker on Azure |
| Token | ERC-20 GNM with MINTER_ROLE |

---

## Docs

- [`docs/setup.md`](docs/setup.md) — full credentials, env vars, CI/CD, pre-demo checklist
- [`deploy/azure/README.md`](deploy/azure/README.md) — lab node setup on Azure
- [`docs/genome-pipeline.md`](docs/genome-pipeline.md) — pipeline technical details
- [`docs/anon-rpc-integration.md`](docs/anon-rpc-integration.md) — Anon-RPC integration
- [`arkiv/schema.md`](arkiv/schema.md) — Arkiv entity schema
