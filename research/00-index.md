# Research Index

Problem-first research for ETHGlobal Mumbai 2026. All evidence gathered before ideation.

## Files

| File | Contents | Status |
|------|----------|--------|
| [01-problems.md](./01-problems.md) | 4 problem areas: remittances, freelancers, AI micropayments, credit gap | Complete |
| [02-blockchain-healthcare.md](./02-blockchain-healthcare.md) | Healthcare blockchain landscape + India/ABDM context | Complete |
| [03-healthcare-genome-records.md](./03-healthcare-genome-records.md) | World ID + genome tokenization, patient records platform, ABDM gap | Complete |
| [04-data-heterogeneity.md](./04-data-heterogeneity.md) | Semantic/structural/statistical heterogeneity, standards, demo path | Complete |
| [05-regulatory-pipeline.md](./05-regulatory-pipeline.md) | FDA RWE, EMA EU CTR, ICH GCP, CDISC, where blockchain fits regulatory stack | Complete |
| [06-privacy-compute.md](./06-privacy-compute.md) | Federated learning (MELLODDY), DP, FHE/MPC, blockchain clinical trial precedents | Complete |
| [07-worldchain-market.md](./07-worldchain-market.md) | WorldChain tech (OP Stack L2), global RWD market, prior marketplace failures, prize fit | Complete |
| [10-health-security-landscape.md](./10-health-security-landscape.md) | Health-tech security incidents (AIIMS, CoWIN, 23andMe) + where blockchain helps | Complete |

## Working Hypothesis

**Global patient-sovereign health data ecosystem:**

```
PATIENT LAYER (WorldChain, World ID gated)
  World ID Orb → unique human, global Sybil resistance
  Genome upload (once, SNP chip ~1-2MB) → immutable base
  Medical records (ongoing) → bills, scans, prescriptions
  Combined = Comprehensive Medical Profile, patient-owned

  ↓ smart contract consent layer

INSTITUTIONAL LAYER (private permissioned network)
  Pharma / research institutions
  FL + DP + Secure Aggregation on consented patient data
  No raw patient data ever leaves the patient node

  ↓ off-chain regulatory submission (FDA/EMA/ICH, CDISC SDTM/ADaM)

REGULATORY GATE
  FDA: 21 CFR Part 11 compatible audit trail on-chain
  EU CTR: WHO ICTRP registration (required off-chain, can't replace)
  Results published to ClinicalTrials.gov / EU CTR (legal requirement)

  ↓ after regulatory approval

ON-CHAIN PUBLICATION
  Results hash published on WorldChain (immutable, publicly verifiable)
  Anyone can verify: what was studied, who approved, what the finding was
```

**Key insights from research:**
- Patients receive $0 from a $2–6B pharma RWD market today
- World ID `nullifier_hash` via Incognito Action solves the Sybil problem that killed Nebula Genomics, EncrypGen, Hu-manity.co
- FL+DP+Secure Aggregation is proven at pharma scale (MELLODDY: 10 companies, 2.6B data points)
- Blockchain supplements regulatory pipeline (can't replace ClinicalTrials.gov); best fit = provenance + post-approval publication
- WorldChain: OP Stack L2, full EVM, PBH live June 2025, developer simulator available (no Orb needed for testing)

**Prize ceiling: ~$57,500** (World $12.5K + 0G $15K + EF $15K + Arkiv $15K — pick best 3 per rules).

## Next Steps

- [x] Concept direction locked: Chainome — global patient-sovereign health data ecosystem
- [x] Full ecosystem flow mapped → `docs/ecosystem-flow.md` + `docs/ecosystem-flow.html`
- [ ] Map to specific sponsor track criteria (World, 0G, EF, Arkiv)
- [ ] `feature/` branch from `dev` → start building
