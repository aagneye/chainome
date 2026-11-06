# GenomeChain — Team Work Split

ETHGlobal Mumbai 2026 · 3 tracks, parallel, independent.

---

## Track A — Deploy + Submit
**Owner:** Abhimanyu (needs MetaMask access)

### Steps
1. Create a **fresh** MetaMask wallet (zero funds, dedicated deployer — never export your main wallet)
2. Fund it from WorldChain Sepolia faucet: https://www.alchemy.com/faucets/world-chain-sepolia
3. Create `packages/contracts/.env` (gitignored — never commit):
   ```
   PRIVATE_KEY=0x<fresh_wallet_key>
   WORLDCHAIN_SEPOLIA_RPC=https://worldchain-sepolia.g.alchemy.com/public
   ```
4. Deploy all contracts:
   ```bash
   cd packages/contracts
   npx hardhat run scripts/deploy.ts --network worldchainSepolia
   ```
5. Copy the printed addresses into `packages/frontend/.env.local`:
   ```
   NEXT_PUBLIC_HEALTH_TOKEN=0x...
   NEXT_PUBLIC_GENOME_REGISTRY=0x...
   NEXT_PUBLIC_RECORD_VAULT=0x...
   NEXT_PUBLIC_CONSENT_MANAGER=0x...
   NEXT_PUBLIC_PROTOCOL_REGISTRY=0x...
   NEXT_PUBLIC_LAB_REGISTRY=0x...
   NEXT_PUBLIC_LAB_ATTESTATION=0x...
   NEXT_PUBLIC_STUDY_REGISTRY=0x...
   NEXT_PUBLIC_WLD_APP_ID=app_staging_<your_app_id>
   NEXT_PUBLIC_WLD_ACTION=genome_submission
   ```
6. Update `README.md` contract addresses table with deployed addresses, commit + push
7. Submit project on ETHGlobal: https://ethglobal.com/events/mumbai
   - Link GitHub repo
   - Tag prize tracks: **World** (Best Use of IDKit), **Arkiv** (Build on Arkiv), **Ethereum Foundation**, **Anon RPC**
   - Add demo video / screenshots

### Deploy order (handled by deploy.ts automatically)
HealthToken → LabRegistry → LabAttestation → GenomeRegistry → RecordVault → ConsentManager → ProtocolRegistry → StudyRegistry

---

## Track B — ENS + Definitive Dataset Marketplace
**Owner:** Teammate 1

Prize targets: **ENS** ($10k) + **Definitive** ($5k)

### What to build

#### `packages/contracts/contracts/DatasetRegistry.sol`
- Anyone uploads a dataset (CID + name + description + category)
- Contract deploys a unique ERC-20 token per dataset (or mints from a factory)
- Dataset name registered as ENS subname: `<slug>.genomechain.eth`
- Token holders can access the dataset CID (gated download)

```solidity
struct Dataset {
    uint256 id;
    address creator;
    string  name;        // "brca2-india-cohort"
    string  slug;        // used for ENS: brca2-india-cohort.genomechain.eth
    string  cid;         // IPFS CID of encrypted dataset
    string  description;
    string  category;    // "genomics" | "imaging" | "clinical"
    address tokenAddress;// ERC-20 for this dataset
    uint256 price;       // in GNM to buy 1 dataset token
    uint256 createdAt;
}
```

#### ENS Integration
- Register `genomechain.eth` as parent domain (or use a testnet subdomain)
- Each dataset publish registers `<slug>.genomechain.eth` → dataset token address
- Use ENS `setSubnodeRecord` on the PublicResolver
- Docs: https://docs.ens.domains/contract-api-reference/name-processing

#### Definitive DEX Integration
- Dataset tokens are standard ERC-20 — tradeable on Definitive out of the box
- Add a "Trade on Definitive" link on each dataset card
- Docs: https://docs.definitive.fi

#### `packages/frontend/app/datasets/page.tsx`
- Browse datasets by category
- Each card: name (ENS slug), description, creator, price in GNM, token supply
- "Buy Access" button — transfers GNM, receives dataset token
- "Publish Dataset" flow — drag-drop file → IPFS → register on-chain → ENS subname minted

#### Test file: `packages/contracts/test/DatasetRegistry.test.ts`
- publishDataset stores fields correctly
- each dataset gets unique token address
- token minted to creator on publish
- buyer receives token after purchase

### Branch suggestion
Work on `feat/dataset-marketplace` branch, PR to master when done.

---

## Track C — Agent Pass + Polish
**Owner:** Teammate 2 (or Claude)

Prize targets: **World Agent Pass** ($5k) + **Arkiv** (5th prize file)

### What to build

#### World ID Agent Pass on `/insights`
Before releasing AI health insights, require a fresh World ID Agent Pass proof.
This gates AI-generated risk scores behind "prove you're human" — the ideal Agent Pass use case.

- Add `IDKitWidget` with `action="request_health_insights"` on `/insights` page
- Show a "Unlock AI Insights" button that opens the Agent Pass modal
- On success: store `agent_pass_proof` in sessionStorage, then fetch insights
- In `/api/health-insights` route: validate the agent pass proof before returning data
- Reference: https://docs.world.org/world-id/id/agent-pass

#### `docs/arkiv/how-you-use-arkiv.md`
Required 5th Arkiv prize file. Answer:
- What schema do you write? (medical_record_v1 entity structure)
- What queries do institutions run? (SQL-like filter examples)
- Code snippet showing `arkiv_createEntity` JSON-RPC call
- Code snippet showing `arkiv_queryEntities` for study participant matching
- Why testnet? (link to any entity ID written during hackathon)

#### Demo flow polish
Walk through the golden path and fix any broken steps:
1. `/` → connect wallet → redirect to `/verify`
2. `/verify` → World ID Orb simulation → redirect to `/genome`
3. `/genome` → upload synthetic VCF → lab attestation → submitGenome
4. `/dashboard` → GNM balance shows → nav to `/studies`
5. `/studies` → browse studies → join one → earn tokens
6. `/insights` → Agent Pass → unlock risk scores

Fix any `useReadContract` calls that break without deployed contract addresses (add `enabled: !!address && !!CONTRACTS.x.address` guards).

#### Branch suggestion
Work on `feat/agent-pass-polish` branch, PR to master when done.

---

## Repo Structure (reference)

```
ethglobal_mumbai_2026/
├── packages/
│   ├── contracts/
│   │   ├── contracts/        # Solidity contracts
│   │   ├── scripts/          # deploy.ts, demo-attest.ts
│   │   └── test/             # Hardhat test suites
│   └── frontend/
│       ├── app/              # Next.js 14 app router pages
│       ├── components/       # Shared React components
│       └── lib/              # contracts.ts, wagmi.ts
├── docs/
│   ├── architecture.md       # Full technical spec
│   ├── ecosystem-flow.html   # Interactive architecture diagram
│   ├── idkit-integration-debrief.md
│   └── arkiv/                # Arkiv prize submission files
└── README.md
```

## Running locally

```bash
pnpm install
cd packages/contracts && npx hardhat test   # run all 55+ tests
cd packages/frontend && pnpm dev            # start dev server on :3000
```

## Contracts already built and tested

| Contract | Purpose |
|----------|---------|
| HealthToken.sol | ERC-20 GNM reward token |
| GenomeRegistry.sol | World ID gated genome CID storage |
| RecordVault.sol | Per-wallet medical record CIDs |
| ConsentManager.sol | IRB consent grants per institution |
| ProtocolRegistry.sol | Clinical trial pre-registration |
| LabRegistry.sol | Certified genomics lab whitelist |
| LabAttestation.sol | Lab-signed genome authenticity proofs |
| StudyRegistry.sol | Research study marketplace |

All tests passing. Deploy script ready. Waiting on PRIVATE_KEY.
