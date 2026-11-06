# Chainome

**Patient-sovereign genomic data marketplace on WorldChain.**

ETHGlobal Mumbai 2026 · [Live App](https://chainome.vercel.app) · WorldChain Sepolia (chain ID 4801)

---

## What It Does

Chainome gives patients full ownership of their genome. No hospital, insurer, or Big Pharma company can access your genetic data without your explicit on-chain consent — and you earn tokens every time a researcher uses it.

**Flow:**

1. **Sign in** — World App wallet auth (SIWE). World ID proves you are a unique human; one genome per verified person is enforced at the smart contract level.
2. **Upload** — submit a VCF genome file. A certified lab node on Azure normalises it to GRCh38, encrypts each chromosome segment with AES-256-GCM, and stores ciphertext on Swarm.
3. **Attest** — the lab node signs a `LabAttestation` on WorldChain Sepolia, committing the genome hash + patient address to the chain. This makes the file tamper-proof and links it to exactly one wallet.
4. **Earn** — 500 GNM tokens are minted to your wallet. The `GenomeRegistry` records the Swarm reference and Arkiv metadata pointer.
5. **Consent** — research institutions publish studies on-chain. You browse, consent, and earn more GNM. Your raw data never leaves Swarm without your key.

All chain reads go through **EF Anon-RPC** (no IP→wallet linkage). All metadata lives on **Arkiv** (Rabdi testnet). All encrypted files live on **Swarm**.

---

## Partner Tracks

### World — Mini App (`$12,500`)

**What we built:** Chainome runs entirely inside World App as a Mini App.

| Requirement | How we meet it |
|-------------|----------------|
| Uses MiniKit | `@worldcoin/minikit-js` v2 — `walletAuth` for SIWE sign-in, `sendTransaction` for minting GNM and recording `LabAttestation` on-chain |
| World ID verification | Device-level ZK proof via `IDKitWidget` — proves uniqueness before genome submission. Prevents one person registering multiple genomes (Sybil resistance). |
| Runs in World App | Mini App URL registered at `https://chainome.vercel.app`, App ID `app_2913c2d5c136350fcea3a2933aba6364` |
| Meaningful use of World ID | The `GenomeRegistry.submitGenome()` contract call requires a valid World ID nullifier — duplicate submissions revert on-chain |

**Key files:**
- [`packages/frontend/components/MiniKitProvider.tsx`](packages/frontend/components/MiniKitProvider.tsx) — installs MiniKit, connects page to World App native layer
- [`packages/frontend/app/page.tsx`](packages/frontend/app/page.tsx) — `walletAuth` sign-in flow
- [`packages/frontend/app/verify/page.tsx`](packages/frontend/app/verify/page.tsx) — World ID ZK verification step

**World ID config:**

| Field | Value |
|-------|-------|
| App ID | `app_2913c2d5c136350fcea3a2933aba6364` |
| RP ID | `rp_9caa8f923120ac6e` |
| Signer address | `0x287EFeC50aAc24ddd0E78a2264858d83E7da67D5` |
| Mini App URL | `https://chainome.vercel.app` |

---

### Arkiv — Decentralised Metadata (`$15,000`)

**What we built:** Every genome dataset, per-chromosome segment, sealed health feature, and medical record is stored as a typed Arkiv entity on the Rabdi testnet.

**Why Arkiv instead of a database:** Arkiv gives us queryable, schema-typed, content-addressed metadata that is decentralised — no central server holds the index. Researchers query Arkiv to discover available datasets (without accessing the raw data). Patients can prove provenance of their records without revealing content.

**Schema types we define:**

| Entity type | What it stores |
|-------------|----------------|
| `GenomeDataset` | Patient address, Swarm root reference, build (GRCh38), QC stats, submission timestamp |
| `ChromosomeSegment` | Per-chromosome Swarm chunk reference, encryption nonce, byte range |
| `SealedHealthFeature` | Derived phenotype (e.g. BRCA1 risk score) — sealed, only readable by consenting researcher |
| `MedicalRecord` | Hospital record hash + Swarm ciphertext reference |

**Key file:** [`packages/shared/src/arkiv.ts`](packages/shared/src/arkiv.ts) — SDK integration, schema definitions, entity creation helpers

**Arkiv config:**
```
RPC:   https://rpc.rabdi.db-chain.testnet.arkiv.network
Key:   ARKIV_ACCESS_KEY (set in Vercel + pipeline.env on VM)
```

---

### Ethereum Foundation — Anon-RPC (`$15,000`)

**What we built:** Every single blockchain read in Chainome is routed through the WorldChain Anon RPC endpoint — zero IP-to-wallet linkage.

**Why this matters for genomic data:** Genomic data is a special category under GDPR Article 9. If a patient's IP address is linked to a wallet that holds genome records, that is a data breach under EU law — even if the genome itself is encrypted. By routing all RPC calls through Anon-RPC, we ensure no observer can correlate a patient's IP address with their on-chain identity.

**How it works technically:**
- The frontend configures Wagmi with the WorldChain Anon RPC URL as the transport
- No direct calls to Alchemy/Infura/public RPC — 100% of `eth_call`, `eth_getLogs`, `eth_getBalance` go through Anon-RPC
- The `AnonRpcStatus` component in the UI shows a live indicator confirming the private RPC is active

**Key file:** [`packages/frontend/components/AnonRpcStatus.tsx`](packages/frontend/components/AnonRpcStatus.tsx) — live status indicator, RPC health check

**Compliance claim:** Chainome is GDPR Art. 9 compliant for the network layer by design — no configuration required.

---

## Lab Attestation System

The lab attestation makes every genome submission tamper-proof and uniquely tied to one patient wallet.

### How it works

When the pipeline processes a VCF file, it:

1. Computes `sha256(vcf_file)` — the genome hash
2. Signs `keccak256(patient_address | genome_hash | timestamp)` using EIP-191 personal_sign with the lab's private key
3. Records the attestation on the `LabAttestation` smart contract on WorldChain Sepolia

**Tamper-proof guarantee:** Any edit to the VCF file — even one byte — changes the sha256 hash. The smart contract signature no longer matches. The patient's wallet holds the only valid attestation for their exact file.

**Uniqueness guarantee:** The `GenomeRegistry` contract checks the World ID nullifier on submission. One World ID = one nullifier = one genome. A second submission with the same nullifier reverts.

### Test attestation (included in repo)

```
lab_attestation/
  test_genome.vcf                 ← 18-SNP synthetic GRCh38 genome (safe to use for demo)
  attestation.json                ← signed attestation for test_genome.vcf
  sign.ts                         ← sign any VCF with real LAB_PRIVATE_KEY + patient address
  verify.ts                       ← verify any attestation + VCF pair
```

**Verify the test attestation:**
```bash
cd lab_attestation
node --input-type=module << 'EOF'
import { ethers } from "../node_modules/ethers/dist/ethers.js";
import crypto from "crypto";
import fs from "fs";
const att = JSON.parse(fs.readFileSync("attestation.json","utf8"));
const fileBytes = fs.readFileSync("test_genome.vcf");
const computed = "0x" + crypto.createHash("sha256").update(fileBytes).digest("hex");
const mh = ethers.solidityPackedKeccak256(["address","bytes32","uint256"],[att.patient,att.file.sha256,att.timestamp]);
const rec = ethers.verifyMessage(ethers.getBytes(mh), att.signature);
console.log("File integrity:", computed === att.file.sha256 ? "✓ PASS" : "✗ FAIL");
console.log("Signature    :", rec.toLowerCase() === att.labSigner.toLowerCase() ? "✓ VALID" : "✗ INVALID");
EOF
```

**Sign a real patient file:**
```bash
LAB_PRIVATE_KEY=0x... PATIENT=0x<wallet_address> npx ts-node lab_attestation/sign.ts path/to/genome.vcf
```

---

## Deployed Contracts (WorldChain Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| HealthToken (GNM) | [`0x62cD9Ce37C52C43eB8DA2C4CCcb263ae07f34E48`](https://worldchain-sepolia.explorer.alchemy.com/address/0x62cD9Ce37C52C43eB8DA2C4CCcb263ae07f34E48) | ERC-20 reward token, MINTER_ROLE gated |
| LabRegistry | [`0x95FdD2510830F0A481d568E26E60AC2C302742ff`](https://worldchain-sepolia.explorer.alchemy.com/address/0x95FdD2510830F0A481d568E26E60AC2C302742ff) | Allowlist of certified lab nodes |
| LabAttestation | [`0xE6583D2ABa77909692e6d2466BD8D980D19d5a9c`](https://worldchain-sepolia.explorer.alchemy.com/address/0xE6583D2ABa77909692e6d2466BD8D980D19d5a9c) | On-chain genome hash + patient signature |
| GenomeRegistry | [`0x6f5b65B4709f0020AAa75eeB5e3D279C773eDF91`](https://worldchain-sepolia.explorer.alchemy.com/address/0x6f5b65B4709f0020AAa75eeB5e3D279C773eDF91) | Patient genome records + World ID check |
| RecordVault | [`0x2Ee90d11C216E024209892cFf158C1A362e82598`](https://worldchain-sepolia.explorer.alchemy.com/address/0x2Ee90d11C216E024209892cFf158C1A362e82598) | Medical records with consent gating |
| ConsentManager | [`0xa1D0A76Abf4399e55F47205783E5c5F3b1ceC671`](https://worldchain-sepolia.explorer.alchemy.com/address/0xa1D0A76Abf4399e55F47205783E5e5F3b1ceC671) | Per-study opt-in/opt-out |
| ProtocolRegistry | [`0x5EE1F97560379D16215Da1D79DBD0877dd2b6Fa0`](https://worldchain-sepolia.explorer.alchemy.com/address/0x5EE1F97560379D16215Da1D79DBD0877dd2b6Fa0) | Research protocol metadata |

---

## Repo Structure

```
packages/
  frontend/         Next.js 14 Mini App (Vercel, runs in World App)
  contracts/        Solidity 0.8 contracts (Hardhat, WorldChain Sepolia)
  pipeline/         Genome processing pipeline (Node 22 + bcftools + Docker)
  shared/           Types, Arkiv schemas, AES-256-GCM encryption utils
deploy/
  azure/            Docker Compose + Caddy config for lab node VM
docs/
  setup.md          Full credentials, env vars, CI/CD, pre-demo checklist
lab_attestation/    Tamper-proof genome signing + synthetic test genome (see above)
```

---

## Quick Start (Local Dev)

### Prerequisites

- Node.js 22+
- pnpm 9+ (`npm i -g pnpm`)
- Docker (for pipeline)

### Install

```bash
git clone https://github.com/aagneye/chainome.git
cd chainome
pnpm install
```

### Environment variables

```bash
cp .env.example packages/frontend/.env.local
```

Minimum required to run the frontend locally:

```env
NEXT_PUBLIC_WLD_APP_ID=app_2913c2d5c136350fcea3a2933aba6364
NEXT_PUBLIC_CHAIN_ID=4801

# Already deployed — paste these in
NEXT_PUBLIC_GENOME_REGISTRY=0x6f5b65B4709f0020AAa75eeB5e3D279C773eDF91
NEXT_PUBLIC_RECORD_VAULT=0x2Ee90d11C216E024209892cFf158C1A362e82598
NEXT_PUBLIC_CONSENT_MANAGER=0xa1D0A76Abf4399e55F47205783E5e5F3b1ceC671
NEXT_PUBLIC_HEALTH_TOKEN=0x62cD9Ce37C52C43eB8DA2C4CCcb263ae07f34E48
NEXT_PUBLIC_LAB_ATTESTATION=0xE6583D2ABa77909692e6d2466BD8D980D19d5a9c

# Server-side secrets
WLD_SIGNER_PRIVATE_KEY=        # World ID RP signing key (from developer.world.org)
ARKIV_ACCESS_KEY=              # from hub.arkiv.network/access-keys
PIPELINE_API_URL=              # https://<lab-domain>
PIPELINE_API_TOKEN=            # long random token (matches VM pipeline.env)
BEE_PROXY_TOKEN=               # long random token (matches VM pipeline.env)
SWARM_GATEWAY=                 # https://<lab-domain>/bee
```

Full env var reference: [`docs/setup.md`](docs/setup.md)

### Run

```bash
pnpm --filter frontend dev
# → http://localhost:3000
```

To test World App features (walletAuth, sendTransaction), open the app inside World App:
- Go to [developer.world.org](https://developer.world.org) → your app → **Test in World App** → scan QR with phone

---

## Genome Pipeline

The lab node is a Docker stack on Azure. Full setup: [`deploy/azure/README.md`](deploy/azure/README.md)

**Pipeline steps:**
1. Frontend POSTs VCF to `/api/upload` → receives a signed one-time upload URL
2. VCF uploaded directly to pipeline API (up to 2 GB)
3. `bcftools norm` normalises to GRCh38
4. Per-chromosome segments encrypted with AES-256-GCM (unique key + nonce per segment)
5. Ciphertext chunks uploaded to Swarm; Swarm references saved
6. Metadata entity (GenomeDataset + ChromosomeSegments) written to Arkiv
7. Lab node signs `LabAttestation` → `sendTransaction` to WorldChain Sepolia
8. `HealthToken.mint(patient, 500 GNM)` called with MINTER_ROLE

**Pipeline is in dry-run mode** (`PIPELINE_DRY_RUN=1`) until a Swarm postage batch is purchased. Steps 1–4 run; step 5 is skipped. Set `PIPELINE_DRY_RUN=0` after funding the Bee node.

**Deploy/update lab node:**
```bash
LAB_DOMAIN=<label>.<region>.cloudapp.azure.com bash deploy/azure/up.sh
```

---

## Running Contract Tests

```bash
cd packages/contracts
npx hardhat test
```

Redeploy (only if contracts change):
```bash
# Set PRIVATE_KEY in packages/contracts/.env first
npx hardhat run ignition/modules/Deploy.ts --network worldchain-sepolia
```

---

## CI/CD

- Push to `main` → GitHub Actions → `vercel --prod` → https://chainome.vercel.app
- Full workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

| Branch | Purpose |
|--------|---------|
| `main` | Production (auto-deploys) |
| `master` | Staging |
| `dev` | Integration |
| `feat/*` | Feature branches |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mini App frontend | Next.js 14, Tailwind CSS |
| Wallet / World ID | MiniKit v2 (`@worldcoin/minikit-js`), IDKit |
| Chain interaction | Wagmi, Viem, ethers.js |
| Smart contracts | Solidity 0.8, Hardhat, OpenZeppelin SDK |
| Blockchain | WorldChain Sepolia (chain ID 4801) |
| Privacy RPC | EF Anon-RPC (WorldChain) |
| File storage | Swarm (`@ethersphere/bee-js`) — AES-256-GCM encrypted |
| Metadata | Arkiv Rabdi testnet (`@arkiv-network/sdk`) |
| Genome pipeline | Node 22 + bcftools + Docker on Azure |
| Attestation | EIP-191 personal_sign, keccak256 commitment |
| Hosting | Vercel (frontend), Azure VM (pipeline) |

---

## Further Reading

- [`docs/setup.md`](docs/setup.md) — full credentials, env vars, pre-demo checklist
- [`deploy/azure/README.md`](deploy/azure/README.md) — lab node deployment
- [`docs/genome-pipeline.md`](docs/genome-pipeline.md) — pipeline technical deep-dive
- [`docs/anon-rpc-integration.md`](docs/anon-rpc-integration.md) — Anon-RPC integration details
- [`arkiv/schema.md`](arkiv/schema.md) — Arkiv entity schema reference
- [`lab_attestation/`](lab_attestation/) — attestation signing and verification
