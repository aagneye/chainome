# Healthcare + Genome Records Platform — Research

Researched: 2026-11-06. Problem-first. Sources linked inline.

---

## Concept

Patient-controlled digital health records + genome data marketplace using World ID for unique human verification.

### Core Ideas
- World ID Orb-verified humans contribute genome data once (genome is immutable throughout life) → earn tokens
- Patients compile their own records: bills, X-rays, scan reports, prescriptions from any hospital
- Single platform, properly dated + mapped, AI-generated summaries
- Private chain + proof of stake for access control
- Patient owns data: HIPAA/GDPR/DPDP Act 2023 compliant via crypto-shredding

---

## Why Existing Systems Fail Patients

### HIE / RHIO / CHMIS — Built for Providers, Not Patients

These are **provider-to-provider** data exchange networks. Hospitals and labs share records with each other for treatment continuity. The patient is a passive subject, not an actor. Access controls serve providers' workflows, not patients' rights to their own data.

### India — ABDM / ABHA Numbers

| Metric | Figure | Date |
|--------|--------|------|
| ABHA IDs created | ~900 million | 2026 |
| Health records linked to ABHA | ~100 crore | May 2026 |
| IDs with **zero** linked records | ~45–55% | 2025 estimate |

**Critical gap:** ABHA lets citizens consent to share records between providers but gives patients **no usable consolidated view**. It is a consent layer, not a patient health record vault. Most linked records sit in fragmented hospital systems — patients still can't compile them in one place.

Sources: [FreePressJournal](https://www.freepressjournal.in/india/over-76-crore-indians-now-have-abha-id-under-ayushman-bharat-digital-mission-up-rajasthan-lead) · [IndianPharmaPost](https://www.indianpharmapost.com/policy/ayushman-bharat-digital-mission-crosses-9395-crore-abha-ids-20877) · [Eka Care on ABDM](https://info.eka.care/services/abdm-enabling-ecosystems)

---

## What Exists Today (India) and Where Gaps Are

| App | What it does | Gap |
|-----|-------------|-----|
| **Eka Care** | ABDM-compliant PHR, links to ABHA | Requires hospital-side ABDM participation — most hospitals don't have it |
| **Driefcase** | "India's first smart health locker," ABDM-approved | Centralized storage, no AI normalization |
| **MyHealthRecord (MoHFW)** | Government PHR, prescription/lab storage | No AI summarization, paper → digital pipeline missing |
| **1mg / HealthifyMe** | Medicine ordering / fitness | Not health record vaults |

**Four genuine gaps no app solves:**
1. AI summarization of raw patient documents (bills, PDFs, scanned reports)
2. Cross-hospital record linking with semantic normalization (without ABDM hospital-side participation)
3. Patient-compiled records from paper/photo → OCR → structured timeline
4. Blockchain-based access control with **patient as sole key holder**

Source: [Entrepreneur India on PHR apps](https://www.entrepreneur.com/en-in/entrepreneurs/lost-your-health-records-again-dont-fret-theyre-one/434004)

---

## Privacy and Legal

### HIPAA (US)
Technical safeguards required: audit controls, access control, encryption in transit + at rest, automatic logoff. Not binding in India but sets the benchmark.

### GDPR — Right to Be Forgotten vs. Blockchain Immutability
Direct conflict. Three solutions:
1. **Store only hashes on-chain; personal data off-chain** — destroy off-chain data, on-chain hash becomes meaningless orphan ✅ Preferred
2. **Crypto-shredding** — destroy the encryption key; on-chain encrypted blob is irrecoverable ✅ Practical
3. Chameleon hash / mutable blockchains — niche, academic, not production-ready ❌

Sources: [Linklaters / Spanish AEPD technical note](https://techinsights.linklaters.com/post/102jo4a/spanish-aepd-harmonising-blockchain-with-the-gdprs-right-to-be-forgotten) · [Aaron Hall on erasure](https://aaronhall.com/blockchain-immutability-vs-gdpr-right-to-erasure)

### India — DPDP Act 2023
- Covers all digital personal data including health data
- Does **not** create a separate sensitive health data category (known criticism)
- Requires explicit, specific, informed consent per processing purpose
- Hospitals = data fiduciaries; patients = "data principals" with rights (access, correction, erasure) — not ownership in legal title sense
- No HIPAA equivalent; patchwork of sectoral rules (ABDM's Health Data Management Policy is one layer)
- Unknown: how DPDP interacts with self-uploaded records where patient is both creator and principal

Sources: [Cyril Amarchand Mangaldas](https://corporate.cyrilamarchandblogs.com/2024/06/mind-your-meds-and-metrics-navigating-the-indian-health-data-protection-labyrinth/) · [Tsaaro analysis](https://tsaaro.com/blogs/privacy-and-healthcare-the-impact-of-the-dpdp-act-2023-and-india%E2%80%99s-sectoral-healthcare-regulations)

---

## Technical Storage Architecture

### DICOM File Sizes (Typical)

| Modality | Size per study |
|----------|---------------|
| X-ray (CR) | ~14 MB |
| MRI | ~99 MB |
| CT | ~153 MB (up to ~1 GB uncompressed) |

Source: [PMC DICOM size table](https://pmc.ncbi.nlm.nih.gov/articles/PMC3705002/table/Tab2)

### Off-Chain Storage Options

| Option | Healthcare Fit |
|--------|---------------|
| IPFS | Content-addressed, no persistence guarantee. Needs Filecoin or Pinata. Free layer impractical for >100 MB DICOM. |
| **Filecoin** | Economic model for large files. ETHGlobal HackFS 2021 precedent: OpenVessels (medical images on Filecoin). Storage deals need renewal. ✅ |
| **Arweave** | One-time pay, permanent. Good for smaller docs (bills, reports). 200-year claim backed by endowment model. ✅ |
| Private S3 | Simplest/cheapest; loses decentralization. |

**Recommended architecture:** Encrypted files on IPFS+Filecoin or Arweave. Only content hash + access control metadata on-chain. Crypto-shredding for DPDP/GDPR erasure compliance.

ETHGlobal precedent: [OpenVessels — medical images on Filecoin (HackFS 2021)](https://ethglobal.com/showcase/medical-images-uploaded-to-filecoin-by-openvessels-ie6gn)

---

## World ID + Genome Data Marketplace

### How World ID / Orb Works
- Orb photographs both irises → produces **IrisCode** (numerical hash) → raw image discarded on-device
- ZKP issued: apps verify "unique human" without receiving any biometric data
- IrisCode compared globally against all existing entries → prevents duplicate registrations
- **18M Orb-verified users across 160+ countries** as of Apr 2026; 39M+ total World Network
- SDK: `@worldcoin/idkit` (React/Next.js) or `@worldcoin/idkit-core` (plain JS)
- Key identifier: `nullifier_hash` — stable per-app, per-user, no PII exposed
- **Two modes:** Sign In with World ID (OAuth-style) or Incognito Actions (anonymous, configurable max verifications per nullifier)

Sources: [CoinTelegraph](https://cointelegraph.com/explained/what-is-worldcoin-and-how-does-it-help-preserve-world-id) · [KuCoin](https://www.kucoin.com/news/flash/world-id-protocol-upgrade-reaches-18-million-users-across-160-countries)

### ⚠️ Critical: India Orb Status
**Orb verification in India has been paused since December 2023** due to regulatory concerns. No confirmed reinstatement as of Nov 2026. Hackathon participants in Mumbai may need pre-verified test accounts or World's staging environment.

Source: [TechCrunch Dec 2023](https://techcrunch.com/2023/12/20/worldcoin-is-no-longer-offering-orb-verification-in-india-brazil-and-france)

---

### Genomic Data + Blockchain — Precedent Landscape

| Project | Model | Status |
|---------|-------|--------|
| **Nebula Genomics** | Sequence genome, sell data access, researchers pay | Acquired by ProPhase Labs 2021 ($14.6M); blockchain aspects defunct by 2025 |
| **EncrypGen** | DNA token marketplace for de-identified data | Still technically operating, near-zero market activity |
| **GenomesDAO** | GENE token, pharma pays to query contributor data | Research-stage, minimal traction |

**Why they failed:** Token speculation overtook utility; data quality unverified; regulatory friction; sequencing costs dropped making contributed data less valuable.

### Data Size Reality

| Type | Size | On-chain? |
|------|------|-----------|
| Whole genome (WGS) | ~200GB raw, ~50GB compressed | Off-chain only (IPFS/Filecoin CID pointer) |
| Exome sequencing | ~8–12GB | Off-chain only |
| **SNP chip** | ~1–2MB | ✅ Practical for hackathon |
| Epigenomics | Variable | Off-chain only |

**Hackathon approach:** SNP chip data as the genome type. IPFS/Filecoin for storage. On-chain: only the content hash + access control metadata.

### Privacy Technology Readiness

| Approach | Status | Hackathon-ready? |
|----------|--------|-----------------|
| ZKP for genomic traits ("I have BRCA1 variant") | Research-stage (Governome, Cell Reports Methods 2025) | ❌ Not in 48h |
| Homomorphic encryption | Production for identity, NOT genomics at scale | ❌ Not in 48h |
| **Secure enclaves (TEE)** | Most production-ready for genomic compute | ✅ or mock it |
| Off-chain encrypted + on-chain access control | Standard pattern | ✅ |

### World ID as the Sybil Resistance Layer

**The core insight:** World ID's `nullifier_hash` per Incognito Action is exactly the primitive needed for one-genome-per-person enforcement.

```
Incognito Action: "genome_submission"
→ Each Orb-verified human gets exactly one nullifier for this action
→ Smart contract: has this nullifier already submitted? If yes, reject.
→ No PII exposed. Person stays anonymous on-chain.
```

**Without World ID — Sybil attack vectors:**
- One person generates 100 wallets → submits 100 synthetic/duplicate genomes → claims 100x token rewards
- No biometric-linked identity = data quality collapse = economic model breaks
- This is exactly what killed prior genomic data marketplaces

**This combination is novel:** No existing project uses Orb verification for genomic data integrity enforcement.

Sources: [USPTO patent filing on health data tokenomics](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11003791) · [Chainscore tokenomics guide](https://www.chainscorelabs.com/guides/healthcare-and-medical-data-management/health-data-marketplaces/how-to-design-a-tokenomics-model-for-health-data-incentives)

### India Legal: DPDP Act 2023 + Genomics
- Genomic data = personal data under DPDP (not explicitly named but covered by definition)
- No specific genomic data law in India (unlike HIPAA/GDPR genomic carve-outs)
- Research exemption exists but requires explicit consent
- Sensitive data category for biometrics is contested in statute
- Secondary use requires fresh consent

Sources: [LiveLaw](https://www.livelaw.in/articles/genetic-data-processing-dpdpa-548278) · [KSK Law](https://ksandk.com/data-protection-and-data-privacy/genetic-data-consent-dpdp-compliance/)

---

## ETHGlobal Mumbai Prize Fit

| Sponsor | Amount | Angle |
|---------|--------|-------|
| World | $12,500 | World ID as unique-human proof for one-genome-per-person |
| ENS | $10,000 | Patient identity / health record namespace |
| 0G | $15,000 | Decentralized storage for health data |
| Ethereum Foundation | $15,000 | Core infrastructure |

**Max potential: ~$52,500** if all four track criteria are met.

---

## Verdict

**The gap is real and specific:** ABDM created a consent infrastructure but not a patient-facing record aggregation layer. The ~45–55% of ABHA holders with zero linked records is the addressable population. No existing Indian app handles the full pipeline: paper/photo → OCR → structured timeline → patient-owned encrypted storage with cross-hospital continuity. Technical stack (FHIR R4, IPFS+Filecoin, crypto-shredding) is mature enough to build on in 48h.
