# Idea Evaluation — Four Candidate Builds + Bridge-Agent Review

Researched: 2026-11-05 → 2026-11-06. Scores are team judgement informed by the evidence below; they are not measurements.

**Evidence legend:** claims with a link were checked against a source during research. Claims marked ⚠️ come from model knowledge and were **not** independently verified — confirm before putting them on a slide.

---

## How Ideas Were Scored

Weighted toward *finishing*: a finished 7/10 beats an unfinished 10/10.

| Criterion | Weight | Question |
|-----------|--------|----------|
| Feasibility | 30% | Can 3–4 people ship a real, non-faked demo in the hackathon window with existing tools? |
| Wow / novelty | 25% | Does it make something possible that wasn't before? |
| Prize stacking | 20% | How many sponsor tracks does it enter *naturally*? |
| Demo-ability | 15% | Is the value visible in a 4-minute live demo? |
| Local relevance | 10% | Will judges and the crowd in Mumbai feel it? |

`Total = 0.30·Feasibility + 0.25·Wow + 0.20·Prizes + 0.15·Demo + 0.10·Local`

> Note: the scoring assumed a 36-hour build and a generic ETHGlobal sponsor mix. [07-worldchain-market.md](./07-worldchain-market.md) later identified the actual track mix (World, 0G, EF, Arkiv) and the window is 48h — re-check prize-stacking scores against those tracks.

---

## Scorecard

| Idea | Feas. | Wow | Prizes | Demo | Local | **Total** | Verdict |
|------|------:|----:|-------:|-----:|------:|----------:|---------|
| **ProofOfRupee** — ZK credit from UPI income + Anon Aadhaar | 7 | 9 | 9 | 8 | 10 | **8.4** | Build — highest ceiling (deep dive: [09](./09-proofofrupee.md)) |
| **AgentBazaar** — AI agents hire/pay agents via x402 with escrow + judge + reputation | 8 | 8 | 8 | 9 | 6 | **8.0** | Safest route to finals if team is AI/backend-heavy |
| **Wildcard** — ball-by-ball cricket prediction markets | 9 | 4 | 6 | 8 | 10 | **7.1** | Easy to ship, low novelty, legal risk |
| **Ghost Ledger** — voice trading agent with MEV-protected intents + session keys | 5 | 6 | 8 | 7 | 7 | **6.4** | Only with aggressive scope cuts |
| *Bridge-route agent* (sponsor-suggested, see below) | 9 | 3 | 7 | 6 | 4 | **≈5.9** | Weak as described; stronger variants exist |

---

## Context: Past ETHGlobal Finalists

| Event | Scale | Finalist themes | Source |
|-------|-------|-----------------|--------|
| Bangkok 2024 | $750K prize pool (largest at the time), 10 finalists | AI agents, crypto games, DAO tools | [The Block](https://www.theblock.co/post/326975/ethglobal-hackathons-10-finalists-showcase-ai-agents-crypto-games-dao-tools-and-more) |
| Buenos Aires 2025 | 475 teams, $500K | NFT, DeFi, prediction markets | [KuCoin News](https://www.kucoin.com/news/flash/ethglobal-buenos-aires-hackathon-announces-10-winning-projects-in-nft-defi-and-prediction-markets) |
| Taipei 2025 | 226 projects, 8 finalists | — | [ETHGlobal blog](https://mirror.xyz/blog.ethglobal.eth/m04E3bju_aC61N2clXLvNSCxkrvOLZcZ5WLb7RWqn6s) |
| x402 hackathon (EF) | — | Agent payment channels | [KuCoin News](https://www.kucoin.com/news/flash/ethereum-foundation-announces-x402-hackathon-winners-including-x402-sf-and-cheddr-payment-channels-x402) |

**Pattern:** one sharp problem, a live demo that works, several sponsor integrations that each do real work.

---

## Idea Summaries

### 1. ProofOfRupee — 8.4
Users prove "unique Indian adult" (Anon Aadhaar) and "income ≥ ₹50K/month for 6 months" (zkTLS on their bank/UPI web session) without revealing data; a soulbound credit badge unlocks a low-collateral USDC credit line. Full write-up: [09-proofofrupee.md](./09-proofofrupee.md).

- **Strength:** India-specific, technically hard, clear social impact; 4–6 tracks without forcing it.
- **Main risk:** zkTLS support for Indian bank pages — hour-4 go/no-go. Fallback: prove from any HTTPS source you control (same cryptography).
- Note: [01-problems.md](./01-problems.md) rated the credit gap (P4) "Buildable in 48h: Low — needs data". ProofOfRupee's answer is that zkTLS + Anon Aadhaar remove the need for a data partnership.

### 2. AgentBazaar — 8.0
Orchestrator agent decomposes a goal under a budget, discovers specialist agents in an on-chain registry, pays per call via x402, holds larger jobs in escrow until a judge agent scores output, and updates on-chain reputation.

- **Strength:** extremely visual demo (live payment graph); hottest category (see P3 in [01-problems.md](./01-problems.md)).
- **Main risk:** crowded category — must lead with verification (escrow + judge + reputation), not "agents pay each other".

### 3. Wildcard — 7.1
Over-by-over cricket micro-markets, passkey onboarding, parimutuel pools, signed-feed oracle.

- **Legal blocker:** India's Promotion and Regulation of Online Gaming Act 2025 bans real-money online games, including payment processing and advertising for them ([Drishti IAS](https://www.drishtiias.com/daily-updates/daily-news-analysis/promotion-and-regulation-of-online-gaming-act,-2025/print_manually), [Entrackr](https://entrackr.com/news/govt-kills-real-money-gaming-with-gaming-bill-in-lok-sabha-9680680)). Points/testnet only.
- No reliable on-chain cricket oracle ⚠️; novelty is low.

### 4. Ghost Ledger — 6.4
Hindi/English voice agent → structured intents → scoped session key on a smart account → MEV-protected batch auction ⚠️ (e.g. CoW Protocol). Too many moving parts; only viable with 2 order types and no cross-chain.

---

## Bridge-Route Agent (Suggested at the Chainlink Booth) — Unbiased Review

**Pitch as received:** when bridging, prices can move; an agent uses 1inch to compare platforms and Chainlink to log price changes, so the user picks the best network/route.

**Verdict: ≈5.9/10 as described.** Real problem, mostly solved; the agent and Chainlink pieces aren't load-bearing.

| Issue | Evidence |
|-------|----------|
| Route comparison already exists — including from 1inch | 1inch Fusion+ already does cross-chain swaps where competing resolvers fill orders, with hashed-timelock escrow returning funds on failure ([1inch Fusion+](https://1inch.network/fusion-plus-protocol), [1inch blog](https://blog.1inch.com/cross-chain-interoperability-an-intent-based-approach)). Bridge aggregators (LI.FI/Jumper, Bungee, Across) ⚠️ |
| "Price moves mid-bridge" is largely absorbed by intent designs | Fusion mode guarantees a minimum-receive amount; a Dutch auction finds the best price within it ([1inch: how swaps are resolved](https://1inch.com/blog/post/fusion-mode-swap-resolving)) |
| Chainlink is a forced fit | Price feeds are aggregated reference prices — they don't reveal per-chain DEX price differences ⚠️ |
| "Agent" adds little if it only reads a table | Judgement — an agent earns its place by *acting* under user conditions |

**Stronger variants (if the team wants this space):**
1. **Quote auditor** — log quoted vs executed vs Chainlink reference price for every route; on-chain scoreboard of which solvers deliver (Chainlink as neutral referee).
2. **Conditional executor** — "move 1,000 USDC to Base and buy ETH only when total cost < 0.3% and price within 1% of the Chainlink reference"; Chainlink Automation ⚠️ triggers, 1inch Fusion+ executes. ≈7/10.
3. **Remittance path** — cheapest cross-chain stablecoin route to an INR off-ramp (ties to P1 in [01-problems.md](./01-problems.md)); off-ramp is the hard part.

**Recommendation adopted:** don't pivot; fold both sponsors into ProofOfRupee where they do real work — Chainlink price feeds for collateral valuation/liquidation, CCIP ⚠️ for a cross-chain credit badge, 1inch for any-token collateral swaps.

---

## Conclusions

1. **Primary build: ProofOfRupee (8.4).** Highest ceiling and strongest India story.
2. **Fallback: AgentBazaar (8.0)** if zkTLS fails the hour-4 checkpoint or the team is stronger in AI than cryptography. Contracts (pool, badge) carry over.
3. **Health-track alternative: Safe Medicine Ledger (≈7.9, ≈8.5 within a health track)** — see [10](./10-health-security-landscape.md) and [11](./11-medicine-quality-ledger.md).
4. **Rejected:** bridge-route agent as described; Wildcard (legal); Ghost Ledger (scope).
5. **Open item:** re-score prize stacking against the confirmed sponsor list in [07](./07-worldchain-market.md).

Companion PDF (generated during research, pre-dates [07](./07-worldchain-market.md)'s sponsor findings): [assets/ETHGlobal_Mumbai_Idea_Book.pdf](./assets/ETHGlobal_Mumbai_Idea_Book.pdf)
