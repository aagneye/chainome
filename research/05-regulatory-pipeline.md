# Global Regulatory Pipeline for Clinical Research Data

Researched: 2026-11-06. Focus: where blockchain legitimately plugs into the regulatory stack.

---

## ICH GCP E6 — Foundation Standard

ICH E6 (Good Clinical Practice) governs clinical trial conduct across FDA, EMA, Health Canada, PMDA (Japan) and all ICH member jurisdictions. Current operative version: **E6(R2)**. E6(R3) in final stages.

**Key data requirements:**
- Comprehensive audit trails for ALL data changes
- System-to-system data transfer protocols with metadata management
- Risk-based data governance proportionate to trial purpose
- Electronic records standards (tied to 21 CFR Part 11 for US-bound trials)

Sources: [Whitehall Training GCP](https://blog.whitehalltraining.com/good-clinical-practice/requirements) · [IntuitionLabs E6(R3) Guide](https://intuitionlabs.ai/articles/ich-e6-r3-gcp-guidelines-2025)

---

## FDA: Real World Evidence (RWE) Framework

**What it covers:**
- 2018 RWE Framework (mandated by 21st Century Cures Act)
- RWE can support: (a) new indication for approved drug, (b) post-approval study requirements
- Accepted designs: randomized studies using RWD, single-arm with real-world control arms, observational

**21 CFR Part 11** — the hook for blockchain:
- Governs electronic records and signatures in FDA-regulated research
- Requires: authenticity, integrity, and confidentiality of clinical data
- Explicitly approves timestamping as a mechanism for consent versioning
- **A permissioned blockchain audit trail for timestamping data provenance is architecturally compatible with 21 CFR Part 11**

Sources: [FDA RWE Framework PDF](https://fda.gov/media/170950/download) · [Applied Clinical Trials](https://www.appliedclinicaltrialsonline.com/view/fda-maps-strategy-broaden-use-real-world-evidence)

---

## EMA: EU Clinical Trial Regulation 536/2014 + DARWIN EU

**EU CTR 536/2014 (applicable from 2022):**
- Trial must be registered in a **WHO ICTRP primary/partner registry BEFORE the trial starts** — precondition for data to be admissible in a marketing authorisation dossier (Article 25)
- Data from trials not so registered "shall not be considered in the assessment"
- Blockchain registration CANNOT replace this — WHO ICTRP registration is a named legal requirement

**DARWIN EU (Data Analytics and Real World Interrogation Network):**
- EMA's platform for generating RWE supporting regulatory decisions
- Uses common data model + standardised analytics across EU data partners
- First studies completed; calling for new data partners as of 2023

Sources: [EMA DARWIN EU news](https://www.ema.europa.eu/en/news/darwin-eur-has-completed-its-first-studies-calling-new-data-partners) · [EU CTR 536/2014 Article 25](https://www.legislation.gov.uk/eur/2014/536/article/25/data.pdf)

---

## CDISC Standards (SDTM / ADaM) — Required for Submissions

| Jurisdiction | Requirement |
|---|---|
| **FDA (US)** | Mandatory. SDTM + ADaM required for NDA/BLA to CDER/CBER. Studies starting after Dec 17, 2016. Each dataset requires a define.xml. |
| **EMA (EU)** | Encouraged but NOT formally mandated. Voluntary pilot. |
| **PMDA (Japan)** | Mandatory since 2016. |

**What CDISC means for our system:** Patient data contributed to pharma research must ultimately be mappable to SDTM format for FDA submissions. This is a **data standards requirement** our institutional layer must handle.

Sources: [IntuitionLabs CDISC guide](https://intuitionlabs.ai/articles/cdisc-standards-sdtm-adam-guide) · [Datanovia Regulatory Context](https://www.datanovia.com/learn/pharma-clinical/01-regulatory-cdisc-foundations/02-regulatory-context)

---

## Where Blockchain Legitimately Plugs In

**Current status: No formal FDA/EMA acceptance of blockchain for submissions.** No confirmed primary FDA document on DLT in clinical trials found. Pharma-FDA blockchain pilot claims (Pfizer/Oracle, Merck-FDA) could not be verified against primary sources.

### Integration Point Analysis

| Use Case | Feasibility | Blocker |
|---|---|---|
| **On-chain consent audit log** (permissioned chain, 21 CFR Part 11 compatible) | **Plausible** | Must prove equivalent to paper trail; no FDA guidance yet. BlockSent project (Hyperledger Fabric) peer-reviewed in active trial. |
| **RWD provenance (source verification)** | **Strongest use case** — blockchain hashes patient data before sharing | No explicit FDA/EMA guidance; but maps to existing data integrity frameworks |
| **On-chain publication AFTER regulatory approval** | **Possible, supplements ClinicalTrials.gov** | Cannot satisfy legal reporting requirement alone |
| ClinicalTrials.gov registration replacement | ❌ Not feasible | Law names specific registries (WHO ICTRP); blockchain cannot substitute |
| Smart contracts replacing IRB consent | ❌ Not feasible at a hackathon | Requires regulatory reform |

**Scrybe project (arXiv:2109.05649):** Demonstrated permissioned blockchain for data provenance with REDCap integration, explicitly mapped to 21 CFR Part 11. Best technical precedent found.

Sources: [Pistoia Alliance blockchain](https://www.pistoiaalliance.org/?p=13344) · [Frontiers in Blockchain consent](https://www.frontiersin.org/journals/blockchain/articles/10.3389/fbloc.2019.00018/epub) · [Scrybe arXiv](https://arxiv.org/pdf/2109.05649)

---

## Clinical Trial Data Publication Requirements

### US (ClinicalTrials.gov / FDAAA)
- Summary results must be posted within **1 year of primary completion date**
- Practice: median 19 months to ClinicalTrials.gov posting (compliance inconsistent)

### EU (EMA)
- Results summary: within **1 year of trial completion**
- Clinical Study Reports (CSRs): within **30 days** of marketing authorisation conclusion
- EMA is earliest public source for only **5.8%** of pivotal trials; median 523 days (IQR 363–882) before first other publication

### On-Chain Publication — What It Can Do
**Cannot replace** named platforms. But can supplement:
- Publish an immutable hash of posted results ON-CHAIN after required platform posting
- Provides tamper-evident public verification
- Any party can verify: this result was posted at this time, unmodified
- **This is architecturally sound and adds value without conflicting with existing obligations**

Sources: [EUPATI results reporting](https://toolbox.eupati.eu/resources/recording-and-reporting-clinical-trial-results/) · [BMJ Open EMA timing study](https://bmjopen.bmj.com/content/13/5/e068981)

---

## Real World Data (RWD) Market

| Source | 2025 Estimate | Projected |
|---|---|---|
| Meticulous Research | $2.38B | $6.1B by 2032 (14.4% CAGR) |
| MarketsandMarkets | $5.42B | $10.83B by 2030 |
| Grand View Research (US only) | $909M | — |

**Key players:** IQVIA (~25% US market share), Optum, Flatiron Health (Roche), Tempus AI, Evidera, Ontada (McKesson). Top 5 hold ~85% market share.

**Cost per study:** $250K–$2M for single-project RWD; $1–5M for regulatory-grade.

**Critical gap: Patients receive NOTHING for their data** — pharma pays IQVIA/Optum, not the individuals whose records are being analyzed. This is the core economic injustice the ecosystem addresses.

**Data quality problems with existing RWD (EHR + claims):**
1. Missing data — a major unresolved problem across multi-site EHR networks
2. Billing-driven stripping — clinical detail not needed for reimbursement is removed
3. Site variability — different EHR systems, different data elements captured
4. Drug exposure gaps — route and dosage often missing
5. EHR discontinuity — prior treatment history incomplete when patients change providers
6. Selection bias — routine care data has inherent confounding

**This is the quality problem our genome-anchored patient profiles solve.** Patient-contributed longitudinal records with patient-verified completeness > claims data bought from insurers.

Sources: [CB Insights pharma RWD cost](https://www.cbinsights.com/research/pharma-real-world-data-vendors-cost) · [MarketsandMarkets RWE](https://www.marketsandmarkets.com/ResearchInsight/real-world-evidence-solution-market.asp) · [BMC Med Res Methodol 2023 on missing data](https://www.pubmed.ncbi.nlm.nih.gov/36800930/)

---

## Gaps / Follow-Up Research Needed

- Genome data specific regulation: GDPR special category rules, US GINA, country-specific biobank laws
- DARWIN EU: how RWE study outputs are formally submitted as evidence in EMA scientific committee evaluations
- FDA 2023 DLT discussion paper: referenced in secondary sources, could not verify against primary
- EU CTR 536/2014: 2022 go-live changed prior EMA disclosure rules — most sources pre-2022
