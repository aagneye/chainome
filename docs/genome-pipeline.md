# Genome data pipeline: VCF → Swarm + Arkiv + World Chain

This document covers how Chainome gets a whole genome into the system and back out: what was built, why it's shaped this way, what we measured, and what's still open.

## 1. The problem we hit

| Constraint | Consequence |
|---|---|
| A whole-genome **VCF is ~1 GB** (we cap input at **2 GB**); raw reads (CRAM/BAM ~12–100 GB) are out of scope | can't go through a browser upload or into a contract |
| An **Arkiv entity holds ≤ 128 KiB of bytes**, `str` ≤ 128 bytes, lifetime ≤ ~182.5 days | Arkiv can index a genome but can't store one |
| **Arkiv entities are public** | anything health-related in an entity must be pointers, hashes, or encrypted |
| **VCFs are inconsistent**: GRCh37 vs GRCh38, `1` vs `chr1`, multi-allelic rows, left/right-shifted indels, sample names and `##commandline` lines that identify people, no distinction between "reference" and "not called" | the same variant looks different across patients, so study queries miss it |
| The old code uploaded **plaintext** to Lighthouse with a **public** API key, and the Arkiv route called an endpoint that doesn't exist | nothing was actually encrypted or indexed |

## 2. Design

```
                     certified lab node (Azure VM, Docker)                         patient (browser)
VCF ≤2 GB ─► detect ─► normalize ─► QC ─► PGx panel ─► split ─► encrypt ─┬─► Swarm  ◄── download & verify
            (build,   (GRCh38,     (Ti/Tv,  (sealed to   (per     (AES-GCM │   (ciphertext +     (WebCrypto,
             naming)   norm, PASS,  het/hom, patient)     chrom)   per seg) │    manifest.json)    sha256 x2)
                       anonymize)   gVCF?)                                  ├─► Arkiv  ◄── /genome panel
                                                                            │   (dataset, segments, features)
                                                                            └─► World Chain: LabAttestation(manifestRef)
                                                                                 then patient: GenomeRegistry.submitGenome(manifestRef)
```

### Where each piece of data lives

| Data | Where | Readable by |
|---|---|---|
| Genome bytes, per chromosome | Swarm, AES-256-GCM ciphertext (`GCv1` = magic, nonce, ciphertext, tag) | patient; institutions only via an access grant |
| `manifest.json` (segment refs, hashes, QC, tool versions, **wrapped** keys) | Swarm | anyone, but contains no secrets |
| Dataset, segment and record index | Arkiv (Rabdi) | anyone: pointers, hashes, QC numbers |
| Health findings (CYP2C19, CYP2C9, SLCO1B1, TCF7L2) | Arkiv `genome_features.summary`, **sealed to the patient** | patient only |
| Proof the lab processed this exact manifest | World Chain `LabAttestation` | anyone |
| One genome per human | World Chain `GenomeRegistry` (World ID nullifier) | anyone |

### Key decisions

1. **Swarm for bytes, Arkiv for the index.** This follows Arkiv's limits and also qualifies for the Arkiv + Swarm bonus.
2. **Encrypt ourselves, upload *without* Swarm encryption.** A Swarm encrypted reference embeds its key, and our references go into public Arkiv entities. Plain references to our own ciphertext reveal nothing.
3. **Split per chromosome, even though Swarm already chunks (4 KB).** This lets a patient share one chromosome, a failed upload retry 5 MB instead of 1 GB, segments process in parallel, and the browser verify one segment.
4. **Patient key from a wallet signature.** The patient signs a fixed message (no transaction); HKDF over the signature gives an X25519 key pair. There's no new secret to back up, and the private key is never stored. Each segment has its own random data key (DEK), wrapped to the patient's public key (ephemeral ECDH → HKDF-SHA256 → AES-GCM).
5. **The lab node does the heavy work.** That matches reality (sequencing labs produce the VCFs) and the existing `LabAttestation` contract: the lab signs over the manifest's Swarm reference, and the patient submits the same string to `GenomeRegistry`.
6. **Health findings are sealed, not indexed.** A public "CYP2C19 poor metabolizer" attribute next to a wallet would be a medical-privacy leak. Study matching on such traits needs patient consent (access grants), not public attributes.

## 3. The normalization pipeline (what it actually runs)

`packages/pipeline/src/normalize.ts`, bcftools 1.16, samtools 1.16.1, CrossMap 0.7.3:

| Step | Command | Why |
|---|---|---|
| Detect | header `##contig` chr1 length (248956422 = GRCh38, 249250621 = GRCh37), `##reference`, first record | VCFs often mislabel or omit the build |
| First sample, rename | `bcftools view -s <first>` → `bcftools annotate --rename-chrs` (`1`→`chr1`, `MT`→`chrM`) | one patient per file; UCSC-style names |
| Liftover (GRCh37 only) | `CrossMap vcf hg19ToHg38.over.chain.gz` + `bcftools sort` | everything lands in GRCh38 |
| Normalize | `bcftools norm -m -any -f hg38.fa --check-ref w` | split multi-allelic rows, left-align indels |
| Filter | `bcftools view -f PASS,.` → `bcftools annotate -x INFO` → `bcftools sort` | keep confident calls; INFO is caller-specific noise |
| Anonymize | `bcftools reheader -h` with a header holding only `fileformat/contig/FILTER/FORMAT/ALT/reference`, sample → `SAMPLE` | drops `##commandline`, `##source`, file paths, sample IDs |
| QC | `bcftools stats -s -` → records, SNPs, indels, Ti/Tv, het/hom | Ti/Tv ≈ 2.0–2.1 (WGS) or 2.8–3.0 (WES); het/hom 1.0–2.5 |
| Ref-call detection | symbolic `<*>`/`<NON_REF>` alleles, or > 5% `0/0` rows | variant-only VCF means a missing variant is *assumed* reference, not confirmed. GIAB HG002 has exactly one stray `0/0` row, so a single-row test is wrong |
| PGx panel | `samtools faidx` checks each panel REF base against GRCh38, then `bcftools query -r` | a coordinate typo becomes `ref_mismatch`, not a wrong call |
| Split | `bcftools view -r chrN` for chr1–22, X, Y, M; alt/random contigs dropped and counted | |
| Encrypt | Node `crypto` AES-256-GCM stream, sha256 of plaintext and ciphertext | |

**23andMe** raw files are detected and converted with `bcftools convert --tsv2vcf`. This needs a GRCh37 FASTA (`REF_GRCH37`), which isn't downloaded by default.

**Not in scope yet:** CRAM/BAM/FASTQ (would need alignment and variant calling, e.g. DeepVariant or Parabricks on the VM's T4 GPUs), and gVCF-aware merging.

## 4. Measured on the lab node

Demo genome: **GIAB HG002 GRCh38 v4.2.1 benchmark VCF** (NIST, public; 156 MB gz, ~1 GB uncompressed).

| Metric | Value |
|---|---|
| Wall time (16 threads) | ~60 s for normalize → QC → features → split → encrypt |
| Variants | 4,096,123 (3,463,511 SNPs, 632,055 indels) |
| Ti/Tv · het/hom | 2.09 · 1.58 (both in the normal WGS range) |
| Ref calls | variant-only (`hasRefCalls=false`) |
| Segments | 22 (chr1–chr22; this benchmark has no X/Y) |
| Ciphertext | 67.0 MB total (chr1 = 5.3 MB) |
| PGx | CYP2C19 normal, CYP2C9 normal, SLCO1B1 normal; TCF7L2 rs7903146 `1/1` → T2D marker "elevated" |
| Round trip | chr22 decrypted with the patient key: `cipherHashOk: true`, `plainHashOk: true`, and `bcftools view` reads it |

All seven panel REF bases matched GRCh38 at run time.

## 5. Code map

| Area | Path |
|---|---|
| Shared Arkiv schemas | `packages/shared/src/arkiv.ts` |
| Key derivation and wrapping | `packages/shared/src/keys.ts` |
| Manifest format | `packages/shared/src/manifest.ts` |
| Pipeline CLI | `packages/pipeline/src/cli.ts` |
| Detect, normalize, QC, split | `packages/pipeline/src/normalize.ts` |
| PGx panel | `packages/pipeline/src/features.ts` |
| Encryption | `packages/pipeline/src/encrypt.ts` |
| Swarm upload | `packages/pipeline/src/swarm.ts` |
| Arkiv writes and read-back | `packages/pipeline/src/arkiv.ts` |
| Lab attestation | `packages/pipeline/src/attest.ts` |
| Runnable Arkiv query | `packages/pipeline/src/query.ts` |
| CLI download, decrypt, verify | `packages/pipeline/src/verify.ts` |
| Docker image | `packages/pipeline/docker/Dockerfile` |
| VM scripts | `packages/pipeline/scripts/{setup-vm,run,sync-to-vm}.sh` |
| `/genome` page | `packages/frontend/app/genome/page.tsx` + `components/GenomePanel.tsx` |
| Arkiv read (server, access key stays server-side) | `packages/frontend/lib/arkiv-server.ts`, `app/api/genome/route.ts` |
| Swarm read proxy | `packages/frontend/app/api/swarm/[ref]/route.ts` |
| Browser crypto | `packages/frontend/lib/genome-crypto.ts`, `lib/use-patient-key.ts` |
| Records (browser-encrypted → Swarm → Arkiv) | `packages/frontend/app/records/page.tsx`, `app/api/records/route.ts` |

## 6. Running it

- **Lab node:** see the "Genome pipeline" section of the README.
- **Configuration:** secrets go in `$GC_HOME/pipeline.env` on the VM and `.env.local` for the app. `.env.example` lists the names. VM host and user live in `deploy/.env`, which is gitignored; this repo is public.

| Variable | Used by |
|---|---|
| `BEE_URL`, `SWARM_BATCH_ID` | pipeline and `/api/records` (upload) |
| `SWARM_GATEWAY` / `NEXT_PUBLIC_SWARM_GATEWAY` | `/api/swarm/[ref]` (read) |
| `ARKIV_ACCESS_KEY`, `ARKIV_PRIVATE_KEY` | pipeline, `/api/records`, `/api/genome` |
| `LAB_PRIVATE_KEY`, `NEXT_PUBLIC_LAB_ATTESTATION`, `WORLDCHAIN_SEPOLIA_RPC` | pipeline attestation step |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | required for `next build` (prerender fails without it) |

## 7. Other fixes made along the way

- **`next.config.ts` → `next.config.mjs`:** Next 14.2 doesn't support a TypeScript config.
- **Fresh-install build failure:** there was no lockfile, so a fresh install pulled a wagmi connector that imports optional `@x402/*` packages. These are aliased to empty modules in `next.config.mjs`, and `pnpm-lock.yaml` is now committed.
- **`CONTRACTS.<name>.address` / `.abi` on plain address strings** (consent, insights, records): these crashed at runtime. Call sites now use the address plus the matching ABI constant. `insights` called `getRecordCount`, which isn't in the frontend ABI; it now uses `recordCount`.
- **Removed:** the Lighthouse plaintext upload, `NEXT_PUBLIC_LIGHTHOUSE_API_KEY`, and the fake `/api/arkiv-record` route.

## 8. Tests

Vitest in each package; run them all with `pnpm -r test`, or a single package with `pnpm --filter <pkg> test`.

| Package | Tests | Covers |
|---|---|---|
| `shared` | 33 | key derivation pinned to a known value (a silent change would orphan every patient's data); wrap/unwrap round trip; wrong key, tampered ciphertext and swapped ephemeral key all rejected; sealed payloads; schema names and the 31-attribute limit; health features never indexed; chromosome ordering |
| `pipeline` (unit) | 79 | CPIC-style rules for CYP2C19, CYP2C9, SLCO1B1 and TCF7L2; `callFeatures` with REF-mismatch and gVCF handling; streaming AES-GCM (sizes, hashes, fresh nonces, tamper and wrong-key failure, no plaintext leak); shell quoting, `pipefail`, pool concurrency, retry; config validation; 23andMe, gzip, non-VCF and >2 GB detection; Swarm (preflight, no Swarm encryption, retries); Arkiv writes (batches of 10, `key()` links, expiry, sealed features); attestation (skip, score, `isValid` check) |
| `pipeline` (integration) | 6 | synthetic genome through real bcftools: build detection, `1`→`chr1`, multi-allelic split, indel left-alignment, LowQual dropped, INFO removed, `JOHN_DOE` / `##commandline` removed, QC counts, per-chromosome split, encrypt → decrypt → `bcftools view` |
| `frontend` | 48 | MiniKit send → userop poll → tx hash (pending, transient errors, failure, timeout), calldata/chain, refuses outside World App, `signMessage`; `/api/userop` validation and proxying; browser round trip; **cross-package**: WebCrypto decrypts exactly what the Node pipeline wrote; wrong key, tampering and non-GenomeChain payloads rejected; `/api/swarm` ref validation and proxying; `/api/genome` validation and errors; `/api/records` refuses plaintext, validates input, enforces 25 MB and writes the right Swarm and Arkiv payloads; `getGenomeForPatient` mapping |

The integration tests need bcftools, so they're skipped on machines without it. Run them in the lab image:

```bash
docker run --rm --entrypoint /app/packages/pipeline/node_modules/.bin/vitest genomechain-pipeline run
```

Last run on the lab VM: 85/85 pipeline tests passed, including integration.

**What the tests caught:**
- The het/hom QC check was applied to small VCFs, so a valid 5-variant file failed QC. It's now only judged above 10,000 variants, like Ti/Tv.
- Two test-data mistakes (Arkiv keys must be 32-byte hex) and a module-cache isolation issue.

**Not covered here:**
- The pre-existing Hardhat contract tests: 28 pass, 37 fail. All 37 failures share one cause: `@nomicfoundation/hardhat-chai-matchers` isn't registered on the `chai` instance the tests import (`Invalid Chai property: emit / revertedWithCustomError`, bigint vs number). This predates this work, and the contracts are unchanged.
- Live Swarm and Arkiv networks (the SDKs are mocked in unit tests).

## 9. Uploading from the app (lab node on Azure)

Patients upload from World App on `/genome`:

1. `POST /api/genome/jobs` (Vercel) asks the lab node for a job.
2. The browser **PUTs the VCF straight to the lab node** with a one-time, job-bound upload URL (HMAC token, 1 h). A 1–2 GB file can't pass through Vercel, which caps request bodies at ~4.5 MB.
3. `/genome` polls `GET /api/genome/jobs/<id>` and shows the pipeline step live. When the job is done it reloads the genome from Arkiv.

The job service is [`packages/pipeline/src/server.ts`](../packages/pipeline/src/server.ts). It runs one job at a time and deletes the plaintext input and work directory when a job ends. Deployment (Caddy TLS, job service, optional Bee node) and the keys/actions checklist are in [`deploy/azure/README.md`](../deploy/azure/README.md).

**Verified on the Azure VM (test mode):** HG002 uploaded with its job token (156 MB); 4,096,123 variants, 22 encrypted segments in ~65 s; afterwards 0 plaintext inputs and 0 work dirs were left. A request without the service token got 401; a forged upload token got 403.

## 10. World App (MiniKit) notes

wagmi on `dev` has no connectors, so every wallet action goes through MiniKit:

- **Writes:** `lib/minikit-tx.ts` → `MiniKit.sendTransaction({ chainId, transactions: [{ to, data }] })`. MiniKit v2 resolves with a **user-operation hash**, so `waitForUserOp` polls `/api/userop/<hash>` (a proxy of `developer.world.org/api/v2/minikit/userop/<hash>`) until it has a transaction hash. Pages use `useMiniKitTx()`; `isSubmitted` = accepted by World App, `isSuccess` = confirmed on chain.
- **Patient key:** `MiniKit.signMessage(KEY_DERIVATION_MESSAGE)` → HKDF → X25519.
- **World ID signal:** `/verify` binds the proof to the MiniKit address, the same address `submitGenome` is called with (the contract checks `signal`).
- **Proof encoding:** `submitGenome` now decodes IDKit's proof with `decodeAbiParameters("uint256[8]")`. The old `proof.split(",")` produced a 1-element array, so the call could never succeed.

**Check on a real device before the demo:**
1. **Allowlist the contracts** in the Developer Portal (Mini App → Permissions → Contract Entrypoints): `GenomeRegistry`, `RecordVault`, `ConsentManager`, `StudyRegistry`. Otherwise World App rejects with `invalid_contract`.
2. **World Chain Sepolia (4801):** the MiniKit docs only show mainnet (480) in their examples. Confirm `sendTransaction` works on 4801, or set `NEXT_PUBLIC_CHAIN_ID`.
3. **Signature determinism:** World App wallets are smart accounts. Sign `KEY_DERIVATION_MESSAGE` twice and check that `/genome` shows the same public key both times. If it differs, the derived key isn't stable. `GenomePanel` detects this ("different key than the one your lab encrypted to") rather than failing per segment.

## 11. Status and what's left

| Item | Status |
|---|---|
| Normalize → QC → PGx → split → encrypt on real WGS data | ✅ verified on the VM |
| Decrypt round trip + hash checks | ✅ verified on the VM (CLI) |
| Frontend typecheck + `next build` | ✅ |
| Unit + integration tests (shared 33, pipeline 99, frontend 54) | ✅ all passing |
| App upload → Azure lab node → pipeline | ✅ live over HTTPS (Let's Encrypt, ports 80/443 open, DNS label set) in test mode; 156 MB upload processed in 69 s end to end; ⏳ live Swarm/Arkiv writes need the Arkiv access key, funded wallets and a Swarm batch |
| Wallet actions via MiniKit (`/genome`, `/records`, `/consent` writes; patient key via `MiniKit.signMessage`; `/verify` + `/insights` address) | ✅ typechecked + unit-tested, ⏳ not yet run in World App |
| Swarm upload / Arkiv write against live networks | ⏳ needs a postage batch + Bee URL, and a funded Rabdi key + access key |
| `arkiv/*.md` and README "proof" values (entity keys, batch ID, writer wallet) | ⏳ filled in after the first live run |
| `/genome` panel against live Arkiv data | ⏳ after the live run |
| LabAttestation from the pipeline | ⏳ contracts not deployed yet; the lab wallet must be in `LabRegistry` |
| `/consent` → Arkiv `access_grant` (re-wrap keys to the institution) | 🔜 schema done, UI not built |
| `/insights` reading sealed `genome_features` instead of the stub | 🔜 `openFeatures()` helper exists, page not switched |
| Patient as Arkiv `$owner` (`changeOwnership`) | 🔜 |
| CRAM/BAM input (variant calling on the VM's T4 GPUs) | future |
