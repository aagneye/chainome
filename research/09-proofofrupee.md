# ProofOfRupee — Private ZK Credit from Indian Financial Data

Researched: 2026-11-05 → 2026-11-06. Score: **8.4/10** (rubric in [08-idea-evaluation.md](./08-idea-evaluation.md)).

**Evidence legend:** linked claims were checked against a source. ⚠️ = model knowledge, not independently verified.

---

## TL;DR

**Problem:** Hundreds of millions of Indians — gig workers, freelancers, shopkeepers — earn real money through UPI but have no credit history, so banks won't lend to them, and DeFi demands they first lock up more than the loan is worth. Their options are moneylenders, predatory loan apps that harvest contacts and photos, or handing over full bank statements. To get credit, the people with the least power give away the most privacy.

**Solution:** Prove the fact, not the data. Anon Aadhaar proves "unique Indian adult" from UIDAI's signature without revealing name or number; zkTLS proves "income ≥ ₹50K/month for 6 months" straight from the bank's server without revealing a transaction. A contract verifies both, issues a soulbound credit badge, and a pool lends with ~20% collateral instead of 150%+. Defaults are recorded against the person's Aadhaar-derived nullifier, so they can't start over.

**Example:** Priya, a freelance designer in Pune, earns ~₹60K/month via UPI but has no credit history. She scans her Aadhaar QR, logs in to her bank inside the app, and in about a minute proves she's a real adult earning ₹50K+ without revealing her name, clients or balance. She locks ~₹3K and borrows ~₹15K for a drawing tablet. The lender only ever sees "verified person, ₹50K+ band". On-time repayment raises her next limit.

---

## 1. The Problem

### Scale
- **347M lower-middle-income Indians** have paying capacity but no formal credit access (MicroSave study, cited in [01-problems.md](./01-problems.md) P4).
- UPI processed **2,264 crore transactions in March 2026** — enormous behavioural data that doesn't reach credit scores ([01-problems.md](./01-problems.md)).

### Why they're invisible
- Bureaus score *past borrowing*; no loans → no score → no loan ⚠️.
- UPI inflows don't feed bureau scores ⚠️.
- Income verification relies on salary slips and tax returns informal workers don't have ⚠️.

### What they do today — and the harm
- **Predatory loan apps** harvested borrowers' contacts, location, photos and videos and used them for blackmail and harassment; Telangana police identified 122 instant-loan apps while investigating suicides in Dec 2020 ([Arunachal Times/IANS](https://arunachaltimes.in/?p=203650), [The Quint](https://www.thequint.com/amp/story/news/india/suicides-data-theft-and-south-indias-instant-loan-scam)).
- The Home Ministry asked states to act after multiple suicides (2022), and MeitY banned 232 lending and betting apps on 5 Feb 2023 ([Outlook Business](https://www.outlookbusiness.com/news/home-ministry-asks-states-uts-to-take-urgent-action-against-predatory-chinese-lending-apps-news-233572), [The Register](https://www.theregister.com/2022/11/01/india_lending_app_crackdown_ordered/)).
- Sharing full statements exposes everything and PDFs are easy to forge ⚠️.

---

## 2. What Exists — and the Gap

| System | What it does | Gap | Source |
|--------|--------------|-----|--------|
| Credit bureaus | Score past borrowing | Useless with no history | ⚠️ |
| **Account Aggregator** (RBI) | Consent-based sharing between FIPs and regulated FIUs; ~338M accounts linked by Aug 2026; 17 licensed AAs | Lender receives **raw** transactions; regulated FIUs only; not composable on-chain | [Business Today](https://www.businesstoday.in/markets/story/one-financial-dashboard-rbi-to-make-bank-demat-data-viewable-in-one-place-560149-2026-10-07), [DFS](https://financialservices.gov.in/account-aggregator-framework), [HyperVerge](https://hyperverge.co/blog/account-aggregator-framework-rbi/) |
| ULI / OCEN | Lender data/credit rails | Still data-sharing, regulated lenders only | ⚠️ |
| DeFi credit (Goldfinch, Maple, TrueFi) | Under-collateralised on-chain loans | Mostly institutional borrowers; several suffered defaults — underwriting is the hard part | ⚠️ |
| Aave / Compound | Over-collateralised loans | 150%+ collateral — useless for the credit-poor | ⚠️ |

**Answer to "why not Account Aggregator?":** AA shares your transactions with the lender. We share a yes/no predicate. The proof is portable — any lender, regulated or on-chain, can verify it without seeing data. The two can complement each other.

---

## 3. Core Insight

> **Prove the fact, not the data.**

A lender needs three answers — real unique adult? income above a band? stable? — not 400 transactions.

---

## 4. Solution Architecture

```
[Web app: passkey smart account (ERC-4337 + paymaster)]
   ├─ Anon Aadhaar ─────► proof: age ≥ 18, India, nullifier
   └─ zkTLS (Reclaim…) ─► proof: income predicates from bank/UPI page
          ▼
[CreditVerifier]  verifies both, binds to wallet + nullifier
          ▼
[CreditBadge]  soulbound: income band, unique-human flag, 90-day expiry
          ▼
[LendingPool]  limit = f(band); collateral valued by Chainlink price feeds
          ▼
[Reputation]  repayments/defaults recorded against nullifier
```

### Layer 1 — Identity: Anon Aadhaar
- Verifies the RSA signature on the **Aadhaar Secure QR** inside a Circom circuit, producing a Groth16 proof; supports selective disclosure (age > 18, pincode, state, gender) ([Anon Aadhaar](https://anon-aadhaar.pse.dev/learn), [docs](https://documentation.anon-aadhaar.pse.dev/blog/tags/ssi)).
- Outputs a **nullifier** that prevents duplicate use and lets an app recognise the same user across sessions ([how it works](https://documentation.anon-aadhaar.pse.dev/docs/how-does-it-work)).
- Solidity verifier available; an on-chain issuer can mint a 30-day credential ([docs blog](https://documentation.anon-aadhaar.pse.dev/blog/tags/privado)).
- ⚠️ **Caveats from the project's own docs:** still under development, not for production ([intro](https://documentation.anon-aadhaar.pse.dev/docs/intro)); the nullifier derivation means the issuer (government) could potentially link a user to on-chain actions ([blog](https://documentation.anon-aadhaar.pse.dev/blog)). Use **test mode + sample QRs** in the demo.

### Layer 2 — Income: zkTLS
- Reclaim uses an HTTP proxy that observes the TLS handshake and data transfer, letting a user prove specific content appeared on a page without revealing the rest (TLSNotary uses garbled circuits; DECO uses MPC) ([Stanford seminar](https://crypto.stanford.edu/seclab/sem-24-25/karamchati.html), [Reclaim blog](https://blog.reclaimprotocol.org/posts/what-is-reclaimprotocol), [BlockEden explainer](https://blockeden.xyz/blog/2026/01/13/zktls-verifiable-web-data-zero-knowledge-proofs/)).
- **Trust assumption:** the proxy/attestor layer; some sites block known proxies ([BlockEden](https://blockeden.xyz/blog/2026/01/13/zktls-verifiable-web-data-zero-knowledge-proofs/)).

| Predicate | Why |
|-----------|-----|
| Avg monthly inflow ≥ ₹X over 6 months | Income level |
| No month below ₹Y | Stability |
| ≥ N distinct senders | Resists circular-money faking |
| Account age ≥ 12 months | Not a fresh mule account |

### Layers 3–7
| Layer | Design |
|-------|--------|
| Credential | Soulbound badge / attestation; income band + unique-human flag; **90-day expiry** |
| Credit policy | ₹25K+ → 100 USDC @ 40% collateral; ₹50K+ → 200 @ 20%; ₹1L+ → 500 @ 15%; history lowers collateral (illustrative) |
| Lending pool | USDC; Chainlink price feeds value collateral + trigger liquidation; 1inch for any-token collateral |
| Reputation | Repayment/default recorded against nullifier; defaults permanently flagged |
| Portability | Chainlink CCIP ⚠️ — prove once, borrow on any chain |

---

## 5. Threat Model

| Attack | Defence | Status |
|--------|---------|--------|
| Circular money to fake income | Distinct-sender count, exclude self-transfers, 6-month window, net inflow | MVP: avg inflow only; distinct senders = stretch |
| Proving someone else's account | Prove inside ZK that bank-holder name hash = Aadhaar name hash | **Stretch / known limit** — requires custom circuit work ⚠️ |
| Sybil (many wallets) | Anon Aadhaar nullifier → one credit line per Aadhaar | MVP |
| Proof replay | Bind proof to wallet address + time window | MVP |
| Stale income | 90-day badge expiry | MVP |
| Borrow and vanish | Partial collateral, permanent nullifier flag, small starting limits | MVP |
| Colluding zkTLS witness | Multi-attestor / TEE providers; state as trust assumption | Disclose |

---

## 6. Regulatory Reality

- Public lending in India requires RBI regulation; a USDC DeFi pool lending to Indian users is a grey area, and crypto carries heavy tax treatment (30% on gains + 1% TDS) ⚠️.
- **Positioning:** a *privacy-preserving credit credential layer*. The demo uses an on-chain pool; the real path is regulated NBFCs/banks accepting the ZK credential instead of raw statements.
- **DPDP fit:** the DPDP Rules were notified in Nov 2025 with an ~18-month phased timeline ([Tribune India](https://www.tribuneindia.com/news/business/government-notifies-dpdp-rules-to-empower-citizens-protect-privacy), [Uniqus](https://uniqus.com/digital-personal-data-protection-act-timelines/)). Minimal-data predicates are a natural fit.

---

## 7. Hackathon Scope

**MVP:** Anon Aadhaar proof (test mode) · one zkTLS income predicate · verifier + badge + pool · gasless onboarding · "what the lender sees" panel.

**Stretch:** distinct-sender predicate · repayment-driven limits · Chainlink feeds + CCIP · 1inch collateral swap · name-binding inside ZK.

**Go/no-go at hour 4:** can the chosen zkTLS provider prove from an Indian bank/UPI page? If not, prove from a mock HTTPS portal and say so.

---

## 8. Judge Q&A

| Question | Answer |
|----------|--------|
| Why not Account Aggregator? | AA shares raw data with regulated lenders; we share predicates, portable on-chain. Complementary. |
| What if they don't repay? | Collateral + permanent nullifier flag + small starting limits — microfinance logic. |
| Can't income be faked? | Data comes from the bank's server (unforgeable); distinct senders + 6-month window resist circular flows. |
| Is this legal? | Demo pool is illustrative; the product is a credential regulated lenders can accept; DPDP-aligned. |
| Why blockchain? | Credential must be verifiable by any lender without trusting us, unforgeable and portable. A private DB would be another bureau. |

---

## Conclusions

1. The credit gap is real and large (347M per MicroSave) and current alternatives either exclude these users or extract their privacy.
2. ZK predicates over UIDAI- and bank-signed data are a genuinely new capability, not a reskin of Account Aggregator.
3. The two biggest technical risks are **zkTLS coverage of Indian bank pages** and **Anon Aadhaar's non-production status** — both acceptable for a hackathon if disclosed.
4. The two biggest product risks are **regulatory (RBI lending rules)** and **account binding** — handled by positioning as a credential layer and listing name-binding as future work.
