# GenomeChain — Technical Architecture

ETHGlobal Mumbai 2026

---

## Problem Statement

**The genomic data problem has four compounding failures:**

1. **Representation gap.** ~80% of genome-wide association study (GWAS) participants are of European descent (Sirugo et al., Cell 2019). Drug approvals derived from this data fail or underdose when applied to South Asian, African, and Latin American populations — 4.5 billion people.

2. **Data silos worth $3B annually.** Real-world data brokers (IQVIA, Optum, Flatiron, Tempus AI) buy patient data from insurers and sell it to pharma for $250K–$5M per study. Patients receive $0 from their own medical histories.

3. **The Nebula Genomics failure mode.** Consumer genomic marketplaces (Nebula, EncrypGen, Hu-manity.co) all collapsed to Sybil attacks — users submitted duplicate genomes or fabricated data. Without biological uniqueness enforcement at the submission layer, the data is worthless. No prior platform solved this.

4. **FDA RWE gap.** The FDA's Real-World Evidence Framework (2018, mandated by 21st Century Cures Act §3022) accepts patient-contributed longitudinal records for drug indication expansion. This market is inaccessible without a provenance trail that genome-anchors each record to a verified unique human.

**GenomeChain solves all four simultaneously.**

---

## Solution Overview

A two-layer patient-sovereign data platform:

**Layer 1 — Public consumer app:** Patients upload medical bills, scans, prescriptions, lab reports, and genomic files. Earn GNM tokens. All data encrypted before leaving the device. Encrypted files stored on Lighthouse (IPFS+Filecoin). Only the IPFS CID lands on WorldChain. All transactions broadcast via WorldChain Anon RPC to strip IP metadata.

**Layer 2 — Private research marketplace:** Pharma/research institutions publish studies on-chain via StudyRegistry. Patients browse, verify identity with World ID, and consent to share specific data types. Institutions query consented metadata from Arkiv. Computation runs on 0G Private Computer (TEE) — only aggregate outputs returned, never raw data.

---

## Layer-by-Layer Architecture

### Layer 1: Patient Data Onboarding

**Entry:** Patient installs the World App (13M+ Orb-verified humans, 160+ countries). Orb-verification issues a ZKP tied to `nullifier_hash` — one stable anonymous ID per person per action. The `nullifier_hash` is deterministic per `(appId, action, human)` tuple. Duplicates revert at the EVM level.

**Data types accepted:**

| Type | Size | Reward |
|------|------|--------|
| Whole genome VCF | 100MB–1GB | 500 GNM |
| Medical bill (PDF/photo) | <5MB | 10 GNM |
| Prescription | <2MB | 10 GNM |
| Lab report | <5MB | 10 GNM |
| Medical imaging (DICOM) | 50–200MB | 10 GNM |

**Upload pipeline:**

```
Patient device
  │
  ├─ AES-256 encrypt(file, key=KDF(nullifier_hash))
  │
  ├─ Upload encrypted blob → Lighthouse SDK → IPFS+Filecoin
  │    Returns: CID (46 bytes, e.g. "bafybeig...")
  │
  ├─ POST /api/lab-attest (for genome only)
  │    LabAttestation contract: lab signs genomic authenticity
  │
  ├─ Call GenomeRegistry.submitGenome(CID, worldIDProof) OR
  │   RecordVault.addRecord(CID, recordType)
  │
  └─ Mint GNM tokens to patient wallet
```

**GDPR right to erasure:** To delete a genome: burn the AES key. The encrypted blob on IPFS becomes permanently irrecoverable — no personal data was ever stored on-chain (only the CID of an indecipherable blob). Chain immutability is preserved. Personal data is erased. This satisfies GDPR Art. 17 without chain forks.

**Privacy layer:** All patient transactions broadcast via WorldChain Anon RPC — strips IP address from transaction broadcast so there is no IP→wallet→medical data linkage.

### Layer 2: Research Study Marketplace

**Institution onboarding:** Research institutions register in LabRegistry (on-chain). To publish a study, they call StudyRegistry. Before submitting to ClinicalTrials.gov, the protocol hash is registered on-chain via ProtocolRegistry — cryptographic pre-registration that makes outcome switching detectable.

**Study lifecycle:**

```
Institution
  │
  ├─ ProtocolRegistry.registerProtocol(keccak256(protocolJSON))
  │    → immutable timestamp before CT.gov submission
  │
  ├─ StudyRegistry.createStudy(criteria, dataTypes, budget)
  │    → study published on-chain, visible to all patients
  │
Patient
  │
  ├─ Browse studies in WorldApp
  ├─ Verify World ID → join study → ConsentManager.grantConsent(institution, dataTypes, expiry)
  │
Institution
  │
  ├─ Query Arkiv for consented patients matching criteria
  │    (Arkiv checks on-chain consent before serving entity data)
  │
  ├─ Submit query to 0G Private Computer
  │    → TEE processes encrypted data
  │    → Only aggregate outputs returned (e.g., "odds ratio: 1.43, p=0.002")
  │
  └─ Results hash published → ProtocolRegistry.linkResults(nctNumber, resultsHash)
```

---

## Data Flow Diagram

```
                        PATIENT
                           │
              ┌────────────┴─────────────┐
              │  Encrypt (AES-256)        │
              │  Key = KDF(nullifier)     │
              └────────────┬─────────────┘
                           │
              ┌────────────▼─────────────┐
              │   LIGHTHOUSE / IPFS      │
              │   Encrypted blob stored  │
              │   Returns CID            │
              └────────────┬─────────────┘
                           │ CID only
       ┌───────────────────▼──────────────────────────┐
       │              WORLDCHAIN (OP Stack L2)         │
       │  GenomeRegistry   RecordVault   ConsentManager│
       │  ProtocolRegistry StudyRegistry LabRegistry   │
       │  LabAttestation   HealthToken                 │
       │  All txs via Anon RPC (no IP linkage)         │
       └───────────┬──────────────────┬────────────────┘
                   │ metadata entities│ consent grants
       ┌───────────▼──────┐  ┌────────▼────────────────┐
       │      ARKIV        │  │   INSTITUTION            │
       │  Queryable DB     │  │   Queries Arkiv with     │
       │  Owner = patient  │  │   on-chain consent token │
       │  wallet           │  └────────┬────────────────┘
       │  Expiry = 10yr    │           │ encrypted data refs
       └───────────────────┘  ┌────────▼────────────────┐
                               │  0G PRIVATE COMPUTER    │
                               │  TEE inference only     │
                               │  Outputs: aggregates    │
                               └─────────────────────────┘
```

---

## Contract Architecture

All contracts deployed on WorldChain (mainnet: chain ID 480, testnet: Sepolia chain ID 4801).

### 1. `GenomeRegistry.sol`
**Role:** One genome per human, enforced at the EVM level.

- Calls `IWorldID.verifyProof(root, 1, signal, nullifierHash, externalNullifierHash, proof[8])` before any state write (CEI pattern)
- Requires a valid `LabAttestation` for the submitting lab
- Maps `nullifier_hash → CID`
- Reverts with `AlreadySubmitted` on duplicate
- Mints 500 GNM via MINTER_ROLE
- Stores lab attestation reference alongside CID

### 2. `RecordVault.sol`
**Role:** Append-only medical record store per patient.

- Patient calls `addRecord(CID, recordType)` after uploading encrypted file to Lighthouse
- `Record{cid, recordType, uploadedAt}` appended to per-patient array
- Mints 10 GNM per record
- `getRecordCount(address)` and `getRecord(address, index)` for frontend queries

### 3. `ConsentManager.sol`
**Role:** Granular, revocable, on-chain consent per institution.

- `ConsentGrant{active, expiry uint64, dataTypes bytes32, grantedAt}`
- Patient signs: institution address, data types (bitmap), study scope hash, expiry timestamp
- `revokeConsent(institution)` executes withdrawal instantly — compatible with FDA eConsent Guidance (2016) right of withdrawal
- Arkiv checks consent grants before serving entity data to any institution
- 21 CFR Part 11 compatible timestamping

### 4. `HealthToken.sol`
**Role:** ERC-20 GNM token with minting role.

- MINTER_ROLE granted to GenomeRegistry and RecordVault
- 500 GNM for genome upload, 10 GNM per medical record
- Used for governance staking and research revenue distribution

### 5. `LabRegistry.sol`
**Role:** Whitelist of approved labs whose attestations GenomeRegistry will accept.

- Admin registers labs with their attestation signing key
- `isLabApproved(address)` called by GenomeRegistry before accepting attestation
- Labs must be registered before they can attest genomic data

### 6. `LabAttestation.sol`
**Role:** Data authenticity — proves a genome came from a real sequencing run.

- Lab calls `attest(patientAddress, genomeCID, labId, labSignature)` after sequencing
- Attestation stored on-chain: `{patient, cid, labId, timestamp, signature}`
- GenomeRegistry checks `hasAttestation(patient)` before accepting genome submission
- Prevents fabricated/synthetic data from being accepted as real genomes

### 7. `ProtocolRegistry.sol`
**Role:** Protocol pre-registration for scientific integrity.

- Institution calls `registerProtocol(keccak256(protocolJSON))` before ClinicalTrials.gov submission
- Timestamp is immutable — proves protocol existed before data collection began
- After CT.gov submission: `linkStudy(protocolHash, nctNumber)`
- After study completion: `linkResults(protocolHash, resultsHash)`
- Any endpoint change creates a new hash — original preserved. Outcome switching is cryptographically detectable.
- ClinicalTrials.gov registration still required (FDAAA §801); this is a complement, not a replacement

---

## Privacy Architecture

**Five-layer privacy model:**

| Threat | Mitigation |
|--------|-----------|
| IP→wallet→medical data linkage | WorldChain Anon RPC strips IP from tx broadcast |
| Raw genomic data exposure | AES-256 encryption before upload; key never leaves device |
| Cross-institution patient re-identification | Partial nullifier (first 16 chars) in Arkiv — not full nullifier_hash |
| GDPR erasure on immutable chain | Crypto-shredding: burn AES key → encrypted blob irrecoverable |
| Inference from compute | 0G Private Computer TEE: only aggregate outputs returned |

**Crypto-shredding in detail:** The AES-256 key is derived from the World ID `nullifier_hash` via KDF. The `nullifier_hash` is never stored anywhere — it exists transiently during the client-side encryption step. To exercise GDPR Art. 17 (right to erasure), the patient destroys their local key material. The encrypted blob on IPFS remains but becomes permanently unreadable — no key exists or can be derived. The CID on-chain points to gibberish. Personal data is erased without touching the chain.

---

## Prize Track Mapping

| Prize | Why GenomeChain Qualifies |
|-------|--------------------------|
| **World** (Best use of World ID) | Core primitive: `nullifier_hash` enforces one-genome-per-human at EVM level. 160+ country coverage addresses GWAS diversity gap. PBH for gas subsidies on patient uploads. |
| **Arkiv** (Best use of Arkiv DB) | Medical record metadata stored as owned entities. Patient wallet = owner. Consent checked on-chain. Expiry enforces GDPR. Cross-institution queryable without centralized broker. |
| **0G** (Best use of 0G compute) | AI inference on encrypted genomic data inside TEE. Pharma gets aggregate outputs; raw data never leaves patient control. |
| **EF** (Ethereum Foundation) | WorldChain is OP Stack L2. All contracts EVM-standard. Demonstrates Ethereum's privacy-preserving infrastructure for real-world healthcare use cases. |
| **ENS** (Ethereum Name Service) | Institution profiles and study identifiers resolve via ENS. Human-readable names for pharma institutions in StudyRegistry. |
| **Definitive** | Real-world data provenance use case. Genomic + medical records with on-chain consent audit trail exceed FDA RWE Framework quality standards. |

---

## Known Limitations and Future Work

**Hackathon scope:** The demo uses a synthetic VCF excerpt (small file) to demonstrate the full upload→encrypt→Lighthouse→CID→WorldChain flow. Full whole-genome sequencing (100MB–1GB) requires the same pipeline with no architectural changes — only file size differs.

**Arkiv integration:** Arkiv entity schema is designed and documented; the full SDK integration is a post-hackathon milestone. The architecture is designed for it.

**0G compute:** TEE integration is architecturally planned. The hackathon demo shows the consent-and-query flow; actual TEE execution is scoped for post-hackathon.

**Lab attestation:** The `LabAttestation` contract and `LabRegistry` are deployed and tested. The hackathon demo simulates a lab attestation via the `/api/lab-attest` route. Production integration requires certified sequencing labs.

**CDISC transformation:** Patient records are stored in raw structured form. Transformation to CDISC SDTM/ADaM format for FDA submission is a pipeline step handled by the institutional layer, not GenomeChain. This is by design — GenomeChain is not a LIMS.

**Future work:**
- Full Arkiv SDK integration with on-chain consent gate
- 0G Private Computer TEE integration for genomic AI inference
- Pilot with Apollo, Fortis, AIIMS hospitals for patient record onboarding
- ENS subnames for institution profiles in StudyRegistry
- Paymaster integration for gasless patient uploads (PBH sponsorship)
