# WorldChain Technical Details + Global Health Data Market

Researched: 2026-11-06.

---

## WorldChain — Technical Specs

**Chain:** OP Stack L2 Ethereum rollup. Part of Optimism Superchain.
- Chain ID: **480**
- Block time: ~2 seconds
- Native gas token: **ETH** (WLD partial gas subsidy for verified users)
- Full EVM compatibility — Solidity contracts deploy unchanged
- Dev tools: ethers.js, viem, Foundry, Hardhat work without modification
- RPC providers: Alchemy, QuickNode, Chainstack (mainnet + Sepolia testnet, archive nodes, debug/trace API)
- Official docs: docs.world.org / world.org/world-chain
- Sepolia testnet available

Sources: [Alchemy PBH mainnet blog](https://www.alchemy.com/blog/world-pbh-mainnet) · [DexTools WorldChain guide](https://dextools.io/tutorials/what-is-world-chain-worldcoin-l2-guide-2026) · [Chainstack WorldChain](https://chainstack.com/chainstack-introduces-world-chain-mainnet-support/)

### PBH — Priority Blockspace for Humans

Live on mainnet since **June 2025**. Applied to all Orb-verified accounts (~13–15M at launch).

- Mechanism: sequencer-enforced, World ID-verified users get priority ordering + inclusion when blockspace is contested
- Plus partial gas subsidies
- **Bots cannot opt in** — check happens at sequencer level, not application layer
- Directly relevant: patient transactions (consent, data submissions) would get priority over bot activity

---

## World ID — Global Orb Coverage

**Verified counts:**
- ~18M Orb-verified as of April 2026 (across 160+ countries)
- 38M+ total users (includes unverified app users)
- 450M+ World ID proof verifications recorded by Oct 2026

**Regional hotspots:**
- Southeast Asia: Thailand, Indonesia, Malaysia, Philippines (expanded April 2025)
- Latin America: Colombia (biggest Orb shop opened Sep 2025), Argentina (500K+ verifications)
- Europe: Italy (market debut Jan 2026)
- India, Brazil: Orb services scaled back ⚠️

**Active regulatory issues:**
| Country | Status |
|---|---|
| Kenya | Suspended Aug 2023, probe closed ~June 2024, relaunch pending |
| Spain | 3-month ban March 2024 (AEPD) — post-ban status unclear |
| Dominican Republic | Suspended Nov 2024 |
| India, Brazil, Germany, France, Hong Kong, South Korea, Colombia, Portugal | Active investigations as of 2026 |

**Key for hackathon:** No Orb required for development.
- **Developer simulator**: simulator.worldcoin.org includes pre-loaded Orb AND Device credentials for testing
- Developers do NOT need a real Orb to test integration
- Limitation: only Orb credentials support on-chain verification; Device credentials work for off-chain/app flows

Source: [World ID simulator docs](https://world-id-docs-630u638fn-main-worldcoin.vercel.app/quick-start/testing)

### WLD Token
- Governance rights over protocol parameters
- Recurring grants to Orb-verified users (biweekly claims)
- Partial gas subsidies for verified users
- **Unknown/contested:** Whether WLD can directly pay gas fees — verify at official docs

---

## Global Health Data Market

### RWE / RWD Market Size

| Source | 2025 Estimate | Projected |
|---|---|---|
| Meticulous Research | $2.38B | $6.1B by 2032 (14.4% CAGR) |
| MarketsandMarkets | $5.42B | $10.83B by 2030 |
| Roots Analysis (pharma RWE only) | $2.2B | $4.5B by 2030 |
| Fortune Business Insights (outlier) | $20.03B | — |

**Conservative mid-range: $2–6B, growing ~14% CAGR**

**What pharma pays per study:**
- Single-project RWD study: **$250K–$2M**
- Regulatory-grade RWE study: **$1–5M**
- Roche acquired Flatiron Health (a RWD company) for **$1.9B in 2018**
- Tempus AI: 40%+ YoY revenue growth from data licensing

**Patients currently receive $0 from this market.** Pharma pays IQVIA/Optum, not individuals.

Sources: [GlobeNewsWire RWE 2026](https://www.globenewswire.com/news-release/2026/01/05/3212898/0/en/Real-World-Evidence-Solutions-Market-Trends-Analysis-Report-2025-2033-Expansion-Driven-by-Rising-R-D-Spend-Growing-Real-World-Data-Volumes-and-Increasing-Regulatory-Acceptance.html) · [CB Insights pharma RWD cost](https://www.cbinsights.com/research/pharma-real-world-data-vendors-cost)

---

## Why Prior Patient Data Marketplaces Failed

| Project | Status | Failure Mode |
|---|---|---|
| **Healthbank** | In liquidation (Swiss commercial register confirms) | Ran out of runway; no pharma demand-side traction |
| **Hu-manity.co** | Last meaningful coverage 2018–2019; inactive | Cold-start: patients won't join without buyers; buyers won't commit without patients |
| **doc.ai** | Acquired by Sharecare (Jan 2021); brand retired ~2023 | Pivoted to enterprise digital health; consumer data marketplace never materialized |
| **Trials.io** | Status unknown | — |
| **EncrypGen** | Near-zero market activity | Token speculation overtook utility; data quality unverified |
| **Nebula Genomics** | Acquired by ProPhase Labs 2021; blockchain aspects defunct by 2025 | Same pattern |

**Common failure pattern:**
1. Got supply side (patients, genomic contributors)
2. Failed to convert pharma buyers to a new procurement model
3. Cold-start chicken-and-egg
4. Token speculation destroyed utility

**What we do differently:**
- World ID ensures data quality and uniqueness (no fake/duplicate submissions — the problem that killed Nebula/EncrypGen)
- Genome as immutable base layer creates longitudinal continuity no current marketplace has
- Institutional private network with existing pharma procurement workflows rather than trying to change how pharma buys

---

## ETHGlobal Mumbai Prize Fit

| Sponsor | Amount | Our Fit |
|---|---|---|
| **World** | $12,500 | World ID Incognito Actions for one-genome-per-person gating. Standard track: Sign In with World ID or Incognito Actions with on-chain/backend proof verification. |
| **0G** | $15,000 | 0G = decentralized AI operating system (storage + compute + DA layer). Encryped patient records + genomic data storage is a direct fit. Active ETHGlobal sponsor: Cannes ($275K total pool), New Delhi ($10K track), Lisbon Aug 2026 ($15K). |
| **Ethereum Foundation** | $15,000 | EF funds public goods: ZK proofs, decentralized identity, protocol infrastructure. Our consent audit trail + data provenance layer fits historical criteria. |
| **Arkiv** | $15,000 | Research needed — unknown fit |

**Maximum potential: $57,500** across 4 tracks (3-track rule applies — pick 3 best).

**Note:** Verify all amounts and criteria at [ethglobal.com/events/mumbai/prizes](https://ethglobal.com/events/mumbai/prizes) before submission. Some figures from pre-event announcements; official prize page is authoritative.

Sources: [0G ETHGlobal Lisbon recap](https://0g.ai/blog/ethglobal-lisbon-2026-recap) · [0G Cannes hackathon](https://thedefiant.io/news/press-releases/0g-labs-sponsors-ethglobal-cannes-hackathon-and-supports-275k-prize-pool) · [ETHGlobal Sydney prizes](https://ethglobal.com/events/sydney/prizes)
