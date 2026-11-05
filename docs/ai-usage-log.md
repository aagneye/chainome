# AI Usage Log

Tracks all AI tools, prompts, and agent dispatches used throughout this project.
Required for ETHGlobal hackathon submission transparency.

---

## Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| **Claude Code** | Claude Sonnet 4.6 | Primary AI assistant — research, planning, file writing, git ops |
| **Claude Subagents** | Claude Sonnet 4.6 | Parallel research agents dispatched for independent topics |
| **WebSearch** | — | Live web research on problem evidence, regulations, market data |
| **WebFetch** | — | Fetching specific URLs (academic papers, official docs) |
| **GitHub CLI (gh)** | — | PR creation, branch management |
| **Bash/Git** | — | Local git operations, file management |

---

## Session Log

### 2026-11-05 — Session 1: Problem Research

#### Prompt 1
> "we are hacking for ethglobal mumbai, it will start soon, can you check the partner tracks and ideas, we can build for it."

**Tool used:** WebSearch (extended mode)
**Output:** Partner track list — World ($12.5K), 1inch ($7K), 0G ($15K), Hedera ($15K), ENS ($10K), Chainlink ($5K), Uniswap Foundation ($15K), Arc ($15K), Arkiv ($15K), EF ($15K), Definitive ($5K), Whitechain ($15K).

---

#### Prompt 2
> "lets start from a real problem, get to the problem first, learn it deeply, gather evidences first"

**Tool used:** `superpowers:brainstorming` skill invoked
**Output:** Shifted approach from sponsor-first to problem-first research.

---

#### Prompt 3
> "remittances and cross-border payments in India, look for more such problems, build a list of problems first, generally, i will look and see. it should be relevant at this age and time."

**Tools used:** WebSearch ×4 (parallel)
- Query 1: India remittance problems, fees, delays 2025–2026
- Query 2: India cross-border payments friction, freelancers, gig workers
- Query 3: India inward remittance volume, top corridors, NRI
- Query 4: Crypto/blockchain real-world problems India 2025–2026

**Output:** `research/01-problems.md` — 4 problem areas with evidence:
- P1: $135.5B remittance corridor, 3–7% fees, USDT premium 8.5%
- P2: 15M+ freelancers, FIRA compliance pain, 3–7% fees
- P3: AI agent micropayments — no cross-border rails
- P4: 347M denied credit despite UPI history

---

#### Prompt 4 (pasted content)
> User pasted overview of blockchain healthcare companies (Akiri, BurstIQ, Guardtime, BFI, Medicalchain) and shared two URLs: `pmc.ncbi.nlm.nih.gov/articles/PMC6371378/` and `blockchainhealthcaretoday.com/index.php/journal/article/view/507`

**Tools used:** WebFetch ×2 (both URLs), WebSearch ×1 (PMC article lookup)
**Output:** `research/02-blockchain-healthcare.md` — healthcare landscape survey. PMC article CAPTCHA-blocked; journal article partially fetched. Verdict: de-prioritize for 48h hackathon.

---

### 2026-11-06 — Session 2: Repo Setup + Healthcare Ecosystem Research

#### Prompt 5
> "document these proofs and evidences and records properly and commit them, follow proper github commit guidelines and rules for commiting, create a main branch, and create dev, only work on dev, creating branches from dev, and adding prs, only when the work is finished move to main, create this guidelines and write into the repo itself so other team members can follow it, set it as such"

**Tools used:** Bash/Git, Write
**Output:**
- `CONTRIBUTING.md` — branch strategy, Conventional Commits format, PR rules
- `README.md` — updated with project overview
- Branch structure: `main` ← `dev` ← `research/*`
- Commits on `research/problem-evidence` branch

---

#### Prompt 6
> "we are not building for indian market, rather global market look from that angle. i'm rather focused on building an entire ecosystem starting from patient side, world chain or worldapp came on as an option to release such thing as it ensures human identity. and the genomics data of the person can act as a base actually, and they can keep adding their medical records which compile into a comprehensive medical report, on the other side it will have a private network for the medical institutes, pharmas etc... which only they have access to and does all the studies and stuff and publish the results onchain after regulatory approval, so the work itself can go to the regulatory authorities. so we need to learn the regulatory rules and guidelines in that pipeline. new pipeline idea can be derived here. spawn multiple agents to get the task done, and one dedicated agent to manage the github commits and prs, more minute commits needed."

**Tools used:** `superpowers:dispatching-parallel-agents` skill, Agent tool ×6 (across two dispatch rounds)

**Round 1 — 3 parallel agents:**

| Agent | Topic | Key Findings |
|-------|-------|-------------|
| Agent A | World ID + genome tokenization | 18M Orb-verified globally; `nullifier_hash` as one-genome-per-person Sybil resistance; SNP chip ~1-2MB practical; Nebula/EncrypGen failed on Sybil attacks — World ID directly solves this |
| Agent B | Patient records + HIE gaps + HIPAA/GDPR | ABDM: 900M ABHA IDs, 45-55% have zero linked records; OCR is real entry point (not FHIR); crypto-shredding for DPDP/GDPR erasure |
| Agent C (GitHub) | Branch + skeleton file setup | Created `research/03-healthcare-genome-records.md` and `research/04-data-heterogeneity.md` skeletons (no Bash access — git ops done by main session) |

**Round 2 — 3 parallel agents:**

| Agent | Topic | Key Findings |
|-------|-------|-------------|
| Agent D | Global regulatory pipeline | FDA RWE Framework, 21 CFR Part 11 compatible with blockchain audit trails; EU CTR 536/2014 (WHO ICTRP required off-chain); CDISC SDTM/ADaM mandatory for FDA; blockchain supplements but cannot replace ClinicalTrials.gov; RWD market $2–6B, patients get $0 |
| Agent E | Privacy-preserving compute | MELLODDY: 10 pharma companies, 2.6B data points, FL+DP+Secure Aggregation proven; FLuID (Nature MI 2025) = federated distillation upgrade; FHE not viable at scale (3–5 years); Triall.io only confirmed blockchain clinical trial system |
| Agent F | WorldChain + market | OP Stack L2, Chain ID 480, PBH live June 2025; developer simulator (no Orb needed); prior marketplaces all failed (Healthbank in liquidation, Hu-manity cold-start, doc.ai pivoted); pharma pays $250K–$5M/study, patients get $0 |

**Output:** `research/03-07` — 5 research files, 3 commits on `research/healthcare-genome-records` branch.

---

#### Prompt 7
> "commit and push all the current branches i have access now"

**Tools used:** Bash/Git, gh CLI
**Output:**
- All 4 branches pushed to `origin`
- PR #1: `research/problem-evidence` → `dev`
- PR #2: `research/healthcare-genome-records` → `dev`

---

#### Prompt 8
> "push and commit it all"

**Tools used:** Bash/Git
**Output:**
- Merged both research branches into `dev` via local git merge (no-ff)
- Resolved `00-index.md` conflict (kept healthcare branch version)
- Merged `dev` into `main`
- Pushed both `dev` and `main` to remote
- 1,110 lines of research across 10 files on `main`

---

#### Prompt 9
> "keep a separate doc to keep track of the prompts and tools used separately, as they said"

**Tools used:** Bash/Git, Write
**Output:** This file (`docs/ai-usage-log.md`)

---

## AI-Generated vs Human-Authored Content

| File | AI-generated | Human-directed |
|------|-------------|---------------|
| `research/01-07-*.md` | Content drafted by AI from web research | Topics, problem framing, ecosystem concept |
| `CONTRIBUTING.md` | Fully AI-generated | Branch strategy concept from human |
| `README.md` | AI-generated | — |
| `docs/ai-usage-log.md` | AI-generated (this file) | Prompted by human |
| Ecosystem architecture | AI synthesized from research | Core concept (patient layer + institutional layer + on-chain publication) from human |

---

## Prompts to Subagents (Summary)

All subagent prompts are detailed, structured research briefs — not freeform. Key pattern:

```
Context: [what we're building + why]
Research Questions: [4-5 specific questions with sub-bullets]
Output format: [structured markdown, word limit, source requirements]
```

Full prompt text available in Claude Code session transcript.

---

## Notes for Submission

- All research is sourced from public web; sources linked inline in research files
- No proprietary data used
- AI was used for research synthesis, file writing, and git operations
- Ecosystem concept, problem selection, and direction decisions made by human
- Code (smart contracts, frontend) not yet written — to be tracked here as built
