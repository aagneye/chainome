# Blockchain in Healthcare — Research Notes

Researched: 2026-11-06. Explored as adjacent problem space. Verdict at bottom.

---

## Projects Surveyed

### Akiri (US, 2018, $10M Series A)
- Spun out of Health2047 (AMA founding investor).
- **Akiri Switch**: invitation-only, subscription-based private network.
- Does NOT store health data — transmits it between hospitals, payers, apps.
- Blockchain validates **source and destination** of each data transaction.
- Think: secure plumbing. Not a records store.
- Status: coverage mostly from 2017–2018 hype cycle. Active status unclear.

### BurstIQ
- Data management platform for health data siloing + interoperability.
- **BurstChain**: blockchain for access control + security on complex datasets.
- **LifeGraph**: newer branding tying data, consent, AI models together.
- Weak blockchain justification — access control alone doesn't need a chain.

### Guardtime (Estonia)
- **Most legitimate use case in the group.**
- KSI (Keyless Signature Infrastructure): blockchain does NOT hold data.
- It **proves data hasn't been tampered with**.
- Estonia's eHealth Foundation: KSI integrated into Oracle DB for 1M+ patient records.
- Every access event recorded on-chain: what was accessed, what changed.
- Also used for: school management, e-ID, taxation, property registries, online voting.
- Holds up against the "do you actually need blockchain?" test.

### Blockchain For Impact (BFI)
- Founded by Polygon co-founder Sandeep Nailwal. Grew from 2021 Crypto Relief Fund.
- **This is a philanthropy, not a tech product.**
- BFI-Biome: grant program for translational research, biomarker discovery, AMR, diagnostics.
- Partners: **IISc, BITS Pilani, CSIR-CCMB, C-CAMP, Venture Center** — all Indian.
- 2025: earmarked **$200M for scaling healthcare startups + biomedical research**.
- Indian connection is real. Grant money, not ETHGlobal prize money.

### Medicalchain (UK, $24M ICO, 2018)
- Patient-owned health records.
- Hyperledger Fabric: access control to records.
- ERC20 on Ethereum: payments via MedTokens.
- Patient data NOT on-chain — blockchain is a pointer to encrypted off-chain data.
- First app (MyClinic): video consults with record access, pay via MedTokens.
- Status: 2018 ICO era. Likely not active.

---

## Academic Research Reviewed

### [Paper 1] Zhuang et al. 2018 — Blockchain for HIE + Clinical Trial Monitoring
**File:** `research/papers/zhuang-2018-blockchain-hie-clinical-trials.pdf` | PMC6371378

This is the PMC6371378 article that was CAPTCHA-blocked during initial fetch — read from downloaded PDF.

**Problem named:**
- HIE systems (CHMIS, RHIO) built for providers; patients lack personal access
- FDA audit problem: only receives aggregated reports from sponsors — data falsification and human entry errors go undetected between trial sites and sponsors
- Centralized storage creates data insecurity and poor integration across disparate sources

**Proposed solution:** Private blockchain + Smart Contracts for HIE and clinical trial monitoring
- RPC server connects multiple EHR databases from different clinical sites
- Smart Contract ensures transactions only accepted from verified clinical sites → data provenance
- Multi-level access privileges: monitoring entities, trial sponsors, clinical sponsors, subjects

**Key finding for our project:** Private chain + Smart Contract consent is a viable architecture for multi-stakeholder health data access control. Proof-of-concept validated (simulation, not live trial).

**Citation:** Zhuang, Y., Sheets, L., Shae, Z., Tsai, J. J. P., & Shyu, C. R. (2018). Applying blockchain technology for health information exchange and persistent monitoring for clinical trials. *AMIA Annual Symposium Proceedings*, 2018, 1167–1176. PMC6371378.

---

### [Paper 2] view/507 — Blockchain Healthcare Today Journal
- **Indian authors**: institutions in Lucknow, Ghaziabad, Mathura, Aligarh + one in Saudi Arabia.
- **Problem named**: centralized control, privacy breaches, no patient data ownership, can't support decentralized research.
- **Proposed solution**: permissioned blockchain + ZKP authentication + off-chain storage + tokenomics governance.
- **Evidence quality**: simulation only. No real-world deployment. No hard numbers in abstract.
- **Critique**: no governance risk analysis for tokenomics layer, no key management details for ZKP.

### PMC6371378
- Could not access — CAPTCHA blocked automated fetch.
- Likely a systematic review (common for this PMC ID range). Read directly at: https://pmc.ncbi.nlm.nih.gov/articles/PMC6371378/

---

## The Core Skeptic Question

> "Does the problem actually need a blockchain, or would a good audit log and access control do the job?"

| Project | Needs blockchain? |
|---------|-----------------|
| Guardtime | **Yes** — tamper-evidence at scale is the use case |
| Akiri | Possibly not — good PKI + audit log could work |
| BurstIQ | Probably not — access control is solved by other means |
| Medicalchain | Partial — micropayments leg yes, records leg no |
| Academic paper (view/507) | Unclear — ZKP yes, blockchain for access control debatable |

---

## India-Specific Context

**ABDM (Ayushman Bharat Digital Mission)**
- National health IDs launched — but records still siloed across hospitals.
- No working consent layer for data sharing between providers at scale.
- 1.4B people, fragmented records across public + private systems.
- This is the real interoperability problem. No dominant blockchain solution yet.

**BFI Signal**
- $200M + IISc/BITS Pilani partnership = real ecosystem forming around India health + blockchain.
- Grant-funded, not VC. Long time horizon.

---

## Verdict for Hackathon

Healthcare blockchain is a **crowded, slow, hard-to-demo** space.
- Real problem (data silos, consent) requires institutional buy-in — not solvable in 48h.
- Best prize fit is ETH Foundation or 0G (data storage) — not obvious healthcare tracks at ETHGlobal Mumbai.
- BFI money = grants, not hackathon prizes.
- Guardtime's tamper-evidence use case is the only clean blockchain argument, and it's already built.

**Recommendation**: de-prioritize unless team has healthcare domain expertise + a specific ABDM integration angle.
