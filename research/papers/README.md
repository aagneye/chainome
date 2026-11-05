# Research Papers

Academic papers read and cited in this project. All PDFs stored here.

---

## Papers

### [1] Zhuang et al. 2018 — Blockchain for HIE + Clinical Trial Monitoring

**File:** `zhuang-2018-blockchain-hie-clinical-trials.pdf`

**Full citation (APA):**
> Zhuang, Y., Sheets, L., Shae, Z., Tsai, J. J. P., & Shyu, C. R. (2018). Applying blockchain technology for health information exchange and persistent monitoring for clinical trials. *AMIA Annual Symposium Proceedings*, 2018, 1167–1176.

**PMC ID:** PMC6371378
**PubMed ID:** 30815156

**Authors & Affiliations:**
- Yan Zhuang, BS — Informatics Institute, University of Missouri, Columbia, MO, USA
- Lincoln Sheets, MD, PhD — Informatics Institute + School of Medicine, University of Missouri
- Zonyin Shae, PhD — AI Research Lab, Asia University, Taichung, Taiwan
- Jeffrey J. P. Tsai, PhD — AI Research Lab, Asia University, Taichung, Taiwan
- Chi-Ren Shyu, PhD — Informatics Institute + School of Medicine, University of Missouri + Asia University

**Keywords:** Blockchain, Smart Contract, Health Information Exchange, Clinical Trial, Persistent Monitoring

**What it covers:**
- Investigated current workflow of HIE and clinical trials via design thinking with clinicians, trial managers, informaticians, and blockchain professionals
- Identified key problems: poor clinical efficiency, patient privacy risks, data insecurity, poor integration across disparate data sources, centralized storage dependency, patients lack personal access
- FDA audit problem: FDA only receives aggregated reports from clinical trial sponsors, no real-time per-site monitoring capability — data falsification and human entry errors go undetected
- **Proposed solution:** Private blockchain + Smart Contracts to simulate HIE and clinical trial monitoring scenarios
  - Private blockchain connecting multiple EHR databases from different clinical sites
  - RPC server for physically transferring health data outside the blockchain
  - Smart Contract regulations: transactions only accepted if sent directly from clinical sites → ensures data provenance and integrity
  - Multi-level data access privileges for monitoring entities, trial sponsors, clinical sponsors, and participating subjects
- **Consensus mechanism:** Private chain (permissioned) — better than public chain for regulated healthcare settings; customizable user regulations and transaction rules

**Key findings relevant to our project:**
1. HIE systems (CHMIS, RHIO) are built for providers — patients lack personal access and cannot benefit from HIE when visiting hospitals outside their home system
2. FDA's "imprecision medicine" problem: aggregated reporting masks individual-site data quality issues
3. Private blockchain + Smart Contract consent can emulate the workflow protocols for different stakeholder roles
4. Proof-of-concept validates that blockchain audit trails can substitute for traditional EDC manual data entry for data provenance

**Limitations noted:**
- Proof-of-concept/simulation only — not deployed in a live clinical trial
- Gas fee constraints for Ethereum smart contract execution not fully resolved
- Does not address GDPR Right to Erasure vs. blockchain immutability conflict

**Where cited in our research:**
- `research/02-blockchain-healthcare.md` — healthcare blockchain landscape survey
- `research/05-regulatory-pipeline.md` — clinical trial data integrity + FDA audit problem
- `research/06-privacy-compute.md` — private chain + smart contract access control precedent

---

*Add new papers below using the same format.*
