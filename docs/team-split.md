# GenomeChain — Build Status + 3-Way Split

Snapshot of `dev` = `master` at `af58c99` (2026-11-06, after PRs #9 and #10).
Supersedes the track list in `TEAM_TRACKS.md` (Tracks B and C there are merged).

**Prize tracks we are entering:** World, Arkiv, Ethereum Foundation, Anon RPC. 0G, ENS and Definitive are dropped; the 0G call and the dataset marketplace (`/datasets`, `DatasetRegistry`) were removed.

---

## 1. What is built

| Area | Built | Real or stubbed |
|---|---|---|
| Contracts | HealthToken, GenomeRegistry, RecordVault, ConsentManager, ProtocolRegistry, LabRegistry, LabAttestation, StudyRegistry + MockWorldID | Real Solidity, test suite for each |
| Deploy | `scripts/deploy.ts` for WorldChain Sepolia (4801) / mainnet (480) | Not run yet. **Skips StudyRegistry**. No localhost (31337) support |
| World ID | IDKit on `/verify`, on-chain `verifyProof` in GenomeRegistry | Real (needs a staging app_id) |
| Agent Pass | IDKit gate on `/insights` | Client-only: proof saved to sessionStorage, **never verified server-side** |
| File upload | Lighthouse upload on `/genome` and `/records` | **Uploaded unencrypted to public IPFS**; Lighthouse key exposed as `NEXT_PUBLIC_` |
| Lab attestation | `/api/lab-attest` | Stub unless `LAB_PRIVATE_KEY` set |
| Arkiv | `/api/arkiv-record` | Stub; real path uses an unverified API-key call, server (not patient) would own entity, reads are public |
| Insights | `/api/health-insights` | Labelled demo scores (0G removed) |
| Studies | `/studies` page, `joinStudy` write | List is `MOCK_STUDIES`, not read from chain |
| Publication | `/publication` | Mock JSON, simulated tx |
| Anon RPC | Mentioned in README | Not in code |

Tests and the frontend build were **not run** in this audit (no `node_modules`, `pnpm` not installed locally).

---

## 2. What is left (priority order)

**P0 — demo breaks or the privacy claim is false without it**
1. Encrypt files client-side before upload; move Lighthouse key server-side.
2. Deploy all contracts (including StudyRegistry) and publish addresses.
3. Read studies from chain instead of mock arrays; seed demo data.
4. Golden path works end to end on WorldChain Sepolia.

**P1 — required for sponsor prizes**
5. Arkiv: real SDK write signed by patient wallet, public/encrypted field split, honest `friction.md`.
6. EF Anon-RPC: all chain reads through `@anon-rpc/browser-harness` (Nox mixnet) by default, shown in the demo. Built in `feat/anon-rpc`.
7. World: Agent Pass proof verified in `/api/health-insights`; staging app_id + actions.
8. Lab attestation signed by a real lab key.
9. Ethereum Foundation: write-up of why this needs Ethereum (public verifiability, consent audit trail).

**P2 — polish**
10. Publication page writes a real hash to ProtocolRegistry.
11. Decrypt + view own records.
12. Demo video, slides, ETHGlobal submission, README addresses.

---

## 3. The split

Each person owns **different files**, so all three can work locally in parallel with no merge conflicts.
Shared files (`lib/contracts.ts`, `.env.example`, `Nav.tsx`) are edited **only by the listed owner**; others request changes.

### Abhimanyu — Chain layer (contracts, deploy, lab, World ID config, EF)

Owns: `packages/contracts/**`, `packages/frontend/lib/contracts.ts`, `api/lab-attest/`, `.env.example`, README addresses.

1. **First, to unblock everyone:** make `deploy.ts` work on `localhost` (31337) by deploying `MockWorldID` there; add StudyRegistry to the deploy; write `deployments/<chainId>.json` and a script that prints the `.env.local` block.
2. `scripts/seed.ts`: certify demo lab, publish 3 studies and 1 protocol so pages have real on-chain data.
3. Run all tests green; deploy to WorldChain Sepolia; push addresses.
4. Create the World ID staging app + actions (`genome_submission`, `request_health_insights`); share app_id.
5. Real lab attestation in `/api/lab-attest` with a demo lab key.
6. Ethereum Foundation write-up in `docs/` (what is on-chain and why).
7. Final: ETHGlobal submission form, prize tags (World, Arkiv, EF, Anon RPC).

### Atul — Privacy + data layer (encryption, storage, Arkiv, Anon RPC)

Owns: new `packages/frontend/lib/crypto.ts`, `lib/storage.ts`, `lib/arkiv.ts`, `lib/wagmi.ts`, `app/api/upload/`, `app/api/arkiv-record/`, `docs/arkiv/**`, `app/records/page.tsx`, `app/genome/page.tsx` (upload part only).

1. `lib/crypto.ts`: AES-256-GCM in the browser (WebCrypto); key derived from a wallet signature so the patient can re-derive it.
2. `lib/storage.ts` + `/api/upload`: encrypted upload to Lighthouse with the key server-side; `downloadDecrypted(cid)`.
3. Swap `/genome` and `/records` to `uploadEncrypted()`; add "view my record" (decrypt).
4. Arkiv: `@arkiv-network/sdk`, entity written **by the patient wallet**, only coarse fields public (type, ICD-10 group, year, hasGenome), the rest encrypted; per-study pseudonym instead of shared `anonymousId`; `expiresIn` 10 years.
5. `lib/arkiv.ts`: `writeRecordIndex()`, `queryCohort(filters)`; give aagneye `queryCohort` for the studies page.
6. Rewrite `docs/arkiv/friction.md` + `schema.md` to match what was actually built (remove claims about load tests and `/api/arkiv/query`).
7. Anon RPC: point the wagmi WorldChain transport at Anon RPC; confirm every write in the golden path uses it; short `docs/anon-rpc.md` for the prize.
8. Synthetic demo VCF / SNP file + 2 fake lab reports in `demo-data/` (never real genomes).

### aagneye — App layer (pages, Agent Pass, demo)

Owns: `app/studies/`, `app/dashboard/`, `app/publication/`, `app/insights/`, `app/api/health-insights/`, `app/consent/`, `components/**`.

1. `/studies`, `/dashboard`: replace `MOCK_STUDIES` with `useReadContract` reads (study list, participants, GNM balance).
2. `/publication`: hash result JSON, real `ProtocolRegistry` write, show tx link.
3. Agent Pass: send proof to `/api/health-insights`, verify with World's verify API before returning data.
4. Studies page: show matched-cohort count from Atul's `queryCohort()` (mock until ready).
5. Golden-path walkthrough, fix broken steps, record the 2–4 min demo video + slides.

---

## 4. Interfaces agreed up front (so nobody waits)

| Interface | Owner | Until it exists, use |
|---|---|---|
| `deployments/<chainId>.json` + `.env.local` block | Abhimanyu | local `npx hardhat node` + `deploy --network localhost` |
| `uploadEncrypted(file, signer) → { cid }`, `downloadDecrypted(cid, signer) → Blob` | Atul | current plain Lighthouse upload |
| `writeRecordIndex(record)`, `queryCohort(filters) → { count, pseudonyms[] }` | Atul | return a fixed mock |
| `POST /api/health-insights { genomeCID, agentPassProof }` | aagneye | current stub |
| World ID `app_id` + action names | Abhimanyu | `app_staging_…` from `.env.example` |

---

## 5. Integration plan

1. **Checkpoint 1 — localhost:** Abhimanyu's localhost deploy + seed merged. Everyone points `.env.local` at it.
2. **Checkpoint 2 — feature PRs:** each person opens one PR into `dev` from `feat/<area>`. Merge order: Abhimanyu → Atul → aagneye (pages depend on addresses and `lib/storage`).
3. **Checkpoint 3 — Sepolia:** Abhimanyu deploys + seeds on WorldChain Sepolia, updates env. All three run the golden path together:
   `/` connect → `/verify` World ID → `/genome` encrypted upload → lab attest → `submitGenome` → `/dashboard` GNM → `/records` → `/consent` → `/studies` join → `/insights` Agent Pass → `/publication`.
4. **Freeze:** `dev` → `master`, record demo, submit.

Rules: branch from `dev`, Conventional Commits, PR into `dev`, never commit `.env` or private keys, use only synthetic genome data.
