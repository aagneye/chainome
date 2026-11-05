# Privacy-Preserving Computation for Health Data

Researched: 2026-11-06. Focus: how institutions compute on sensitive patient data without seeing raw records.

---

## Federated Learning — Production State

**What it is:** Models train locally at each institution; only model gradients (not raw records) are shared with a central aggregator. Raw data never leaves the data owner.

### Confirmed Production Deployments in Pharma

**MELLODDY (2022–2024) — Best Evidence:**
- 10 pharma companies: Amgen, AstraZeneca, Bayer, Boehringer Ingelheim, GSK, Janssen, Merck KGaA, Novartis, Servier, Astellas
- 2.6+ billion confidential activity data points federated
- Task: QSAR drug-property prediction
- Result: **Median 5.5% improvement** (up to 9.7%) per partner's models
- **This is the strongest confirmed industry-scale FL in pharma**

Sources: [PMC MELLODDY](https://pmc.ncbi.nlm.nih.gov/articles/PMC11005050/) · [Novartis](https://oak.novartis.com/51249)

**Other confirmed deployments:**
- **Cancer AI Alliance (CAIA):** Multi-cancer-center FL using NVIDIA FLARE + Rhino Federated Computing. Active as of late 2025.
- **FAITE consortium (2025):** J&J, UCB using federated + active learning for biologics property prediction.
- **Eli Lilly TuneLab (Sep 2025):** AI/ML platform trained on $1B+ of Lilly research data shared with biotech partners — federated status unconfirmed.

**Production-ready frameworks:**
- **NVIDIA FLARE** — production-grade (healthcare consortia, national labs) ✅
- Flower — research/prototyping-focused
- Google Health FL — no post-2022 production data found

### Federated Learning on Genomics

**Feasibility:** Technically workable, but naïve FL is NOT sufficient for genomic privacy.

- May 2025 arXiv study: gradient-based membership and label inference attacks succeed on genomic FL
- Differential Privacy or MPC is **required** as an additional layer
- NSF is funding FLAG — open-source federated genomic analysis framework
- December 2024 review in *Genes*: genomics-specific FL applications remain underexplored

**Verdict:** FL for genomics is feasible; FL alone is not sufficient. Stack: FL + DP + Secure Aggregation.

Source: [NIH PMC FL genomics review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11728131/)

---

## Differential Privacy

**What it is:** Mathematical noise added to query outputs or model gradients, guaranteeing individual records cannot be inferred. Privacy budget (ε) controls noise/accuracy trade-off.

**Production in healthcare:**
- Multi-site trial benchmarks and disease surveillance dashboards (hospitals sharing aggregate metrics) — population-level analytics ✅
- Local DP for wearables heart-rate monitoring pipelines (OpenMined)
- Apple uses DP for iOS telemetry (canonical production example outside healthcare)

**NOT production-proven for:** Drug research model training at scale. MELLODDY used FL; DP integration discussed as an add-on, not primary mechanism.

**Known trade-off:** Accuracy cost grows with dataset heterogeneity — a real problem for genomics where data is highly heterogeneous across populations.

**Verdict:** Production-ready for population-level analytics. Not yet production-proven for drug research model training at scale.

Sources: [arXiv 2601.04298](https://arxiv.org/abs/2601.04298) · [University of Vienna review](https://pharminfo.univie.ac.at/publications/more/pure/3e7235f5-c322-44a7-a598-e3d0ad4d1f85/show/publ/)

---

## Homomorphic Encryption (FHE) + Secure Multi-Party Computation (MPC)

| Technology | Healthcare Status | Hackathon-ready? |
|---|---|---|
| **FHE (Zama.ai, etc.)** | Research/developer-tooling stage. FHE on 1M-row genomics = hours to days on current hardware. | ❌ 3–5 years from practical deployment |
| **MPC (Partisia, etc.)** | Production for aggregation step in FL (narrow role). High communication overhead for end-to-end analytics. | ✅ For aggregation only |
| **Secure Enclaves (TEE)** | Most production-ready option for genomic compute today | ✅ |

**Partisia (Aug 2025):** "Hoping to bring MPC to healthcare" — aspirational, not deployed.
**Zama.ai:** Research and developer-tooling stage; healthcare is one of several stated target sectors.

---

## The Recommended Stack

**For training on 1M patient records without seeing individual records — proven approach today:**

```
Federated Learning (data stays local)
  + Secure Aggregation / MPC (aggregator can't see individual gradients)
  + Differential Privacy (bounds inference on final model)
```

**MELLODDY validated this architecture at industry scale.**

**2025 upgrade — Federated Distillation (FLuID):**
- Published *Nature Machine Intelligence* 2025 (UCB / Selvita)
- Transfers knowledge (distillation) rather than raw gradients
- Less leakage surface + better model quality than individual-silo training
- More efficient than standard FL at scale

Sources: [UCB FLuID](https://www.ucb.com/innovation/magazine/detail/article/data-driven-federated-learning-in-drug-discovery-with-knowledge-distillation) · [Selvita](https://selvita.com/our-science/resources/publications/data-driven-federated-learning-in-drug-discovery-with-knowledge-distillation)

**Known ceilings:**
- FL alone: gradient inversion attacks succeed → DP required
- DP: accuracy cost grows with heterogeneity
- Secure aggregation: communication overhead → viable at consortium scale

---

## Existing Blockchain + Clinical Trial Projects

| Project | What | Status |
|---|---|---|
| **Triall.io** | Verial eTMF (blockchain-integrated Trial Master File) in commercial use since 2019. Mayo Clinic pilot (500 patients, 10 sites, pulmonary arterial hypertension). CIX prototype stage (2023 roadmap). | Only confirmed production blockchain system in clinical trials. No 2025 announcements found. |
| Pfizer / Roche / Novartis | Various blockchain experiments claimed | **No confirmed production deployments found.** Claims from Web3 consultancy blogs with no primary source citations. |
| **IBM Watson Health** | 2017–2019 pilots with FDA and CDC | Effectively dead. IBM sold Watson Health to Francisco Partners 2022 → now Merative. |
| Synapse.org (Sage Bionetworks) | 3.6 PB data, 6,000 monthly active users. No blockchain component. | 2025 arXiv preprint proposes evaluating decentralized models — blockchain not confirmed. |
| PrivyCycle | Privacy health app | ETHGlobal Cannes 2025 (hackathon stage only) |
| EMTTR | Drug trial data on Optimism/Ethereum/Filecoin | Optimism RPGF grant recipient |

**Verdict:** Triall.io is the only confirmed blockchain clinical trial system in production (eTMF layer only — not data analytics). Pharma blockchain pilots from 2017–2020 mostly stalled or were never published.

---

## Architecture for Our System

**Patient layer:** No FL needed. Patient contributes their own data with their own consent. Data encrypted at rest.

**Institutional layer:** Pharma/research institutions run FL computations across the distributed patient dataset. Each patient's encrypted data acts as one node.

**Practical implementation for a hackathon:**
- Patient data encrypted on-chain (or off-chain hash on-chain)
- Institution requests computation via smart contract (specifying: purpose, duration, compensation)
- Patient accepts/rejects per smart contract consent
- Computation happens on TEE or simulated FL environment
- Aggregate results (not individual data) returned to institution
- Institution submits results to regulatory authority off-chain
- After approval: results hash published on-chain

**This maps to MELLODDY's proven pattern** but with patient-sovereign data ownership and smart contract consent instead of consortium agreements.
