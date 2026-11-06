# Chainome — Full Ecosystem Flow

Mapped: 2026-11-06. Architecture derived from research phases 1–7.

---

## The Two Sides

```
PUBLIC CHAIN SIDE                    PRIVATE CHAIN SIDE
(WorldChain, patient-facing)         (Permissioned, institutional)
─────────────────────────────        ──────────────────────────────
Person with World ID                 Pharma / Research Orgs / Hospitals
  │ Orb-verified identity            CROs / Biobanks
  ↓
Genome upload (once)      ←consent tx→   Run federated learning
Medical records (ongoing) ←consent tx→   Run observational studies
                          ←consent tx→   Run clinical trial monitoring
  │                                  │
  │   No raw data ever leaves        │
  │   the patient's encrypted node   │
  ↓                                  ↓
Patient-owned, encrypted          Study outputs (gradients,
data vault                        aggregated models, findings)
                                  │
                                  ↓ CDISC SDTM/ADaM formatting
                                  FDA / EMA submission
                                  IRB approval (prior to trial start)
                                  WHO ICTRP registration (required)
                                  │
                                  ↓ After regulatory approval
                               ClinicalTrials.gov + EU CTR posting
                                  │
                                  ↓ Then:
                               Hash published on WorldChain
                               (tamper-evident supplement, not replacement)
                                  │
                                  ↓ Smart contract routes findings
                               Back to matching patient profiles
```

---

## Layer 1: The Person (Public Chain Entry)

### Inputs

| Input | Frequency | Detail |
|-------|-----------|--------|
| Genome upload | Once | SNP chip ~1–2MB. Incognito Action `genome_submission`: one per nullifier_hash. Smart contract rejects duplicates. |
| Medical records | Ongoing | Bills, prescriptions, lab reports, X-rays, MRI. Photo/PDF → OCR → NLP → structured + encrypted. |

### World ID Sybil Resistance

Incognito Action `genome_submission` → each Orb-verified human gets exactly one `nullifier_hash` for this action → smart contract checks nullifier, rejects if already used → one genome per unique human, global.

This solves the exact Sybil problem that killed Nebula Genomics, EncrypGen, Hu-manity.co. No prior genomic marketplace enforced biological uniqueness at the data submission layer.

### What the Person Gets (Trustable Outputs)

The key question: beyond token rewards, what is the **trustable outcome** derived from the public chain?

1. **Lifetime Health Passport** — Portable, verifiable, cross-provider. Patient holds the encryption key. Any hospital, any country. No more starting from zero.

2. **Genetic Risk Profile** — Polygenic risk scores from SNP chip data:
   - Cardiovascular risk (LDL gene variants, factor V Leiden)
   - Type 2 diabetes susceptibility (TCF7L2, PPARG variants)
   - Cancer susceptibility (BRCA1/2, PALB2, MLH1)
   - Scores update as reference cohorts grow on the platform

3. **Pharmacogenomics Map** — Drug metabolism prediction per genome:
   - CYP2D6 variants → codeine, tramadol, beta-blocker metabolism
   - CYP2C19 variants → clopidogrel, PPIs, SSRIs
   - CYP2C9 variants → warfarin dosing
   - Avoid adverse drug reactions before they happen

4. **Ancestry Health Lineage** — Population-specific disease susceptibility:
   - South Asian genomes: elevated T2D + cardiac risk at lower BMI thresholds
   - African genomes: sickle cell, G6PD variants, differential hypertension risk
   - Each new participant refines their population's reference panel

5. **AI Health Timeline** — All uploaded records compiled into a dated, normalized health story. AI summarizes trends: "Blood pressure trend shows increasing systolic over 3 years." Clinically useful, not just a file dump.

6. **Research Alerts** — FDA/EMA-approved findings routed to matching patients:
   - "Drug X approved for BRCA2 carriers. Your genome has this variant."
   - "New South Asian T2D risk variant identified. Your risk score updated."
   - Findings reach patients, not just journals.

7. **Research Dividends** — Token rewards for uploads. Study participation rewards when pharma runs studies on data matching your profile. Patients currently get $0 from a $2–6B RWD market. This changes that.

8. **Verifiable Consent Audit** — Every institution, every study, every permission granted — on-chain. Revocable in one transaction. Crypto-shredding for GDPR right-to-forget.

---

## Layer 2: WorldChain — Public Layer

**Tech:** OP Stack L2, Chain ID 480, full EVM, 2s block time, ETH gas token.

**PBH (Priority Blockspace for Humans):** Orb-verified users get sequencer priority + gas subsidies. Live since June 2025. Patient uploads never get frontrun.

### Smart Contracts

| Contract | Role |
|----------|------|
| `GenomeRegistry` | Incognito Action gate: `nullifier_hash` → one genome CID. Rejects duplicates. |
| `RecordVault` | Per-patient list of (CID, timestamp, record_type). Patient key never leaves device. |
| `ConsentManager` | Patient signs consent tx: institution, data types, study types, expiry. Generates time-limited access token. Revocable. 21 CFR Part 11 compatible audit trail. |
| `TokenDistributor` | Reward calculation + distribution. Upload rewards + study participation. |

### Storage Architecture

- **Genome/DICOM files:** Encrypted on IPFS + Filecoin (CT ~153MB, MRI ~99MB)
- **Bills, PDFs:** Arweave (one-time pay, permanent)
- **On-chain:** Only the content hash (CID) + access metadata
- **GDPR compliance:** Crypto-shredding — destroy patient key → on-chain encrypted blob irrecoverable

---

## Layer 3: Private Institutional Network

### How Existing Private Health Networks Operate

**Hyperledger Fabric / Besu** — permissioned blockchain used in production healthcare:
- PBFT consensus: Byzantine fault tolerant, deterministic finality, no mining
- Institutions = known validator nodes. Each has verified identity.
- 2–4 second finality, enterprise-grade throughput

**Triall.io** — only confirmed production blockchain clinical trial system:
- ClinicalTrials.gov + blockchain audit trail in live trials
- Hyperledger-based
- Proof that the architecture is regulatorily viable

**Current RWD brokers (what we displace):**
- IQVIA, Optum, Flatiron Health, Tempus AI
- Buy patient data from insurance companies → sell to pharma
- Patients get $0. Pharma pays $250K–$5M per study.
- Our platform: patients get paid directly, institution buys access to consented data

### Federated Learning Process

```
Institution → sends model to patient node
Patient node → computes gradients locally on own data
                (raw data never transmitted)
Gradients → Gaussian noise added (ε-differential privacy)
Noised gradients → Secure Aggregation protocol
                   (institution coordinator never sees individual gradients)
Aggregated update → back to institution as improved model
```

**MELLODDY proof (best available evidence):**
- 10 pharma companies: Bayer, Novartis, Pfizer, Sanofi, Boehringer Ingelheim, Janssen, Merck KGaA, Amgen, AstraZeneca, AbbVie
- 2.6 billion data points
- FL + DP + Secure Aggregation deployed at industry scale
- Published results: improved predictive models vs. siloed training

**FLuID (Nature MI, 2025):** Federated distillation upgrade by UCB/Selvita. Transfers knowledge not raw gradients. Reduces leakage surface further.

### Study Types

| Study Type | Description |
|-----------|-------------|
| Pharmacogenomics | SNP variants → drug response/toxicity prediction. Requires genome + medication history. |
| Population genomics | Disease risk variants by ancestry. Grows population-specific reference panels. |
| RWE clinical studies | FDA RWE Framework 2018: observational studies on longitudinal records for new drug indications. |
| Clinical trial monitoring | Blockchain audit trail per site per Zhuang 2018 (PMC6371378). Smart contracts ensure data provenance. |

---

## Layer 4: Regulatory Gate

### FDA Rules for Patient-Contributed RWD

**21 CFR Part 11:**
- Governs electronic records in FDA-regulated research
- Requires audit trails, access controls, timestamps, e-signatures
- Explicitly approves timestamping for consent versioning
- **Permissioned blockchain audit trail is architecturally compatible** (Scrybe project, arXiv:2109.05649)

**FDA RWE Framework (2018), mandated by 21st Century Cures Act:**
- Accepts RWE for: (a) new drug indications, (b) post-approval study requirements
- Patient-contributed longitudinal records with genome anchoring > claims data quality
- Quality problems with existing RWD: missing data, billing-driven stripping, site variability, drug exposure gaps, EHR discontinuity

**CDISC SDTM / ADaM:**
- Mandatory for all FDA NDA/BLA submissions (studies after Dec 2016)
- Japan (PMDA): mandatory since 2016
- EMA: encouraged but not formally mandated
- **Our institutional layer must handle SDTM transformation** before regulatory submission

**IRB / Ethics Approval:**
- Cannot be replaced by smart contracts
- Required before patient recruitment begins
- All jurisdictions — plan for 1–6 month timeline

### EU Requirements

**EU CTR 536/2014:**
- Trial must register in WHO ICTRP **before trial starts** — legal precondition (Art. 25)
- Blockchain registration cannot substitute named legal requirement
- DARWIN EU: EMA's RWE platform. Our platform could feed as a data partner.

**ICH GCP E6(R2/R3):**
- International baseline: FDA, EMA, Health Canada, PMDA simultaneously
- Audit trails, risk-based data governance, system-to-system transfer protocols
- Our blockchain audit trail maps directly to E6 requirements

### Where Blockchain Fits

| Use Case | Feasibility |
|----------|-------------|
| On-chain consent audit log (21 CFR Part 11) | Plausible — Scrybe precedent |
| RWD provenance / source verification | Strongest use case |
| Post-approval results hash on-chain | Sound, supplements legal obligations |
| Replace ClinicalTrials.gov registration | Not feasible — law names specific registries |
| Replace IRB consent | Not feasible — requires regulatory reform |

### Publication Timeline (Legal Requirements)

- **US:** Summary results on ClinicalTrials.gov within 1 year of primary completion
- **EU:** Results within 1 year, CSRs within 30 days of marketing authorisation
- **Our role:** After these postings, publish an immutable hash on WorldChain as tamper-evident supplement

---

## Layer 5: On-Chain Publication + Return to Patient

### What Gets Published

After the required ClinicalTrials.gov/EU CTR posting, a WorldChain event records:
- Keccak-256 hash of the official posting
- Study metadata: type, population criteria (genome-matched), institution, approval authority
- Finding tags: gene variants, drug names, ICD-10 codes, ancestry groups affected

Smart contract routes findings to matching patient profiles automatically.

### Findings Return to Patients

| Finding Type | What Patient Receives |
|-------------|----------------------|
| Genomic match | "Drug X approved for BRCA2 carriers. Your profile matches. See study NCT###." |
| Risk score update | Polygenic risk scores recalculated from new population data. |
| Pharmacogenomics update | Medication interaction profile updated. Physician alert generated. |
| Study reward | Token distribution pro-rated by data contribution quality. |

### "Every Ancestry Gets Mapped"

Current state: ~80% of GWAS data is from European populations. South Asian, African, Latin American, Indigenous, and Middle Eastern genomes are systematically underrepresented.

**How the platform changes this:**

1. World ID operates in 160+ countries, 18M Orb-verified globally
2. Each new participant adds to their population's reference panel
3. As South Asian / African / Latin American cohorts grow:
   - Population-specific polygenic risk scores become available
   - Disease variants unique to those populations get discovered
   - Risk thresholds recalibrated (e.g., T2D risk appears at lower BMI in South Asians)
4. Every new participant improves accuracy for everyone who shares their ancestry

**Generational tracking:**
- Parent + child both on platform → shared genomic haplotypes identifiable (with consent)
- Hereditary disease patterns surface across generations
- Family health story = longitudinal multigenerational dataset
- Over decades: largest consented, patient-sovereign longitudinal health cohort in history

---

## New Pipeline Design

This ecosystem creates a closed loop that didn't exist before:

```
PATIENT                INSTITUTION            REGULATOR
   │                        │                    │
   │ genome + records        │                    │
   │ (encrypted, owned)      │                    │
   ├──consent tx────────────▶│                    │
   │                        │ FL study           │
   │                        │ (no raw data)      │
   │                        │                    │
   │                        ├──SDTM/ADaM────────▶│
   │                        │                    │ review
   │                        │                    │ approve
   │                        │◀──approval──────────┤
   │                        │                    │
   │                        ├──ClinicalTrials.gov─┤
   │                        │  posting (legal)    │
   │                        │                    │
   │                        ├──hash on WorldChain─┤
   │◀──matched findings─────┤                    │
   │◀──updated risk scores──┤                    │
   │◀──token rewards────────┤                    │
   │                        │                    │
```

**Key properties of this pipeline:**
1. Patients own their data throughout — never transferred, only accessed with consent
2. Study quality is higher than existing RWD (genome-anchored, patient-verified completeness)
3. Regulatory compliance is maintained (blockchain supplements, doesn't replace obligations)
4. Findings return to the population that generated them
5. World ID enforces one-genome-per-human — first time this has been true at global scale
6. Every ancestry contributes and receives — no more 80% European bias

---

## Implementation Priority (Hackathon)

For 48h demo:

1. **World ID gate + genome registry** (core novel primitive)
2. **Record upload → IPFS → CID on-chain** (shows the data flow)
3. **Consent transaction** (shows institutional access model)
4. **Mock FL computation + result publication** (shows the loop closing)
5. **Patient dashboard** (shows the trustable outputs — health timeline, risk scores)

Skip for hackathon:
- Real CDISC SDTM transformation (institutional layer detail)
- Actual regulatory submission (5 year process)
- Production FL stack (mock with aggregated result)

---

*See also: `research/05-regulatory-pipeline.md`, `research/06-privacy-compute.md`, `research/07-worldchain-market.md`*
