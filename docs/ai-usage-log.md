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
| **Claude Code (desktop app)** | Claude Opus 5.5 | Session 3 — ideation, scoring, health-track research, PDFs, research commits |
| **Headless Google Chrome** | — | Printing HTML to the two companion PDFs (Session 3) |

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

### 2026-11-05 → 2026-11-06 — Session 3: Ideation, Scoring + Health-Track Research

Run by a second team member in the Claude Code desktop app (Claude Opus 5.5). No subagents were dispatched; all research ran in the main session.

#### Prompt 10
> "Hey we are at ETH Global and we wanna build something thats going to win us this event mention some of the past winers ideas and also something that we can make ourselves. it needs to be extraordinary."

**Tools used:** WebSearch ×2 (past ETHGlobal finalists; event sponsors/prizes)
**Output:** Past-finalist patterns (Bangkok 2024, Buenos Aires 2025, Taipei 2025) and four candidate ideas: ProofOfRupee, AgentBazaar, Ghost Ledger, Wildcard.

---

#### Prompt 11
> "Expand the ideas you curated make sure they are worthy to be built and possible at the same time rate each of them out of 10 as well. Make them into a pdf"

**Tools used:** `anthropic-skills:pdf` skill, Write (HTML), headless Chrome (print to PDF), Read (render check)
**Output:** `ETHGlobal_Mumbai_Idea_Book.pdf` (9 pages) — feasibility-weighted rubric; ProofOfRupee 8.4, AgentBazaar 8.0, Wildcard 7.1, Ghost Ledger 6.4. Python PDF libraries couldn't be installed (venue wifi timed out), so the PDF was printed from HTML.

---

#### Prompts 12–13 (ProofOfRupee explanations)
> (pasted ProofOfRupee summary) "Explain this idea with the help of a simple example so that i understand the whole process"

**Tools used:** None (model knowledge)
**Output:** Step-by-step walkthrough using an example user (Priya, a freelance designer).

---

#### Prompt 14
> "...one from chainlink ... a simple problem about bridging ... we find the best network with the help of an agent one from one inch ... chainlink for the price change logging ... i want your unbiased opinion on it."

**Tools used:** None (model knowledge)
**Output:** Rated ≈5.9/10 as described (existing aggregators and intent-based bridges already cover it; Chainlink a forced fit). Proposed stronger variants and folding both sponsors into ProofOfRupee instead.

---

#### Prompt 15
> "another track that we are looking into is blockchain + health tech so what i want from you is not the ideas but context about how many security issues that are very very relevant in todays world and in the upcoming developing economy..."

**Tools used:** WebSearch ×3 (DPDP Rules 2025, Coldrif death toll, ABHA account count)
**Output:** 10 health-tech security problem areas with incidents, developing-economy amplifiers, and a "where blockchain helps" filter.

---

#### Prompt 16
> "can you rank them out of 10 from the hackathons persepective just select the top 5"

**Tools used:** None
**Output:** Top 5: counterfeit medicines 8.4, credentials/prescriptions 8.2, scheme fraud 7.4, consent 7.3, AI provenance 7.3.

---

#### Prompts 17–27 (counterfeit-medicine problem refinement)
Human-led questioning that shaped the medicine-ledger concept:
- "Explain this idea with an eg" · "give it in one paragraph" · "in two lines for each tell me the problem, the solution" · "Lets take a very simple eg in a paragrap"
- "so right now there isn't an existing system solving this issue"
- "...pharmas or the cros ... human trials ... will there still be a chance of poisoning or am i entirely wrong"
- "including this point also reform the problem and the idea" → "or just remove the point and give me the original problem and the solution"
- "Who conducts the safety tests for these companies"
- "I don't get the solution can you explain it a bit more"

**Tools used:** None (model knowledge)
**Output:** Problem/solution wording, the exam analogy, the trials-vs-batch-testing clarification, and the who-tests breakdown.

---

#### Prompt 28
> "So i want the core problem and solution as a pdf and below that you can provide an example related this in the pdf itself so that it is better to understand"

**Tools used:** Write (HTML), headless Chrome, Read (render check), Bash (spacing fix + re-print)
**Output:** `Safe_Medicine_Ledger.pdf` (2 pages).

---

#### Prompts 29–33 (adoption and enforcement)
- "will individual labs be willing to test this out and wouldn't this mean that it turns out to be an imposing layer..."
- "is there an FDA rule currently that might be there but none of them are following..."
- "since they already aren't following the rules would it actually matter if we build another verification thing like this"
- "is it possible to talk to the government about this and start from them..."
- "as a hackathon level project what would you rate this"

**Tools used:** WebSearch ×2 (Coldrif plant inspection violations; Revised Schedule M MSME deadline)
**Output:** Lab-payment pool and risk-based sampling design; evidence that the rules exist but aren't verifiably followed (Coldrif plant: 39 critical + 325 major violations, untested propylene glycol); the "gatekeeper" requirement and the sample-swap fix; government adoption path; score ≈7.9 (≈8.5 in a health track).

---

#### Prompts 34–35 (ProofOfRupee deep dive)
> "You want the highest overall score and you're strong in ZK and cryptography — Lets expand on this problem and its potential solution" · "the problem the solution and then a simple eg all in about three paragraphs total"

**Tools used:** None (model knowledge)
**Output:** Full ProofOfRupee write-up (existing systems incl. Account Aggregator, seven layers, threat model, regulation, judge Q&A) and a three-paragraph summary.

---

#### Prompt 36
> "https://github.com/aagneye/ethglobal_mumbai_2026. clon this repo. fetch all the branches and commits first ... create branch from dev and work on it and then open pr to dev ... commit allthese research we have done with proper evidences and citatiosn clearly and concljsions"

**Tools used:** Bash/Git, WebSearch ×20 (verifying previously uncited claims), Write ×4, Edit, gh CLI
**Output:**
- Branch `research/ideation-evaluation` from `dev`; 5 Conventional Commits; PR #5 → `dev`
- `research/08-idea-evaluation.md`, `09-proofofrupee.md`, `10-health-security-landscape.md`, `11-medicine-quality-ledger.md`, plus both PDFs in `research/assets/`
- 82 linked citations; 35 claims flagged ⚠️ as unverified
- Verification corrected two earlier claims: Star Health "31M" figure unsourced (Reuters: "millions"); cough syrup export testing reportedly relaxed Oct 2024
- Removed a stray merge-conflict marker from `research/00-index.md`

---

#### Prompt 37
> "Yes, log it" (in reply to: add this session to the AI usage log?)

**Tools used:** Bash/Git, Edit, gh CLI
**Output:** This Session 3 section, on branch `docs/ai-usage-log-session-3`.

---

### 2026-11-06 — Session 4: Genome data pipeline (Swarm + Arkiv)

**Tool:** Claude Code desktop app (Claude Opus 5.5), with one Explore subagent for the code survey.

**Human direction:**
- Whole-genome data must work end to end. The input is a VCF of about 1 GB, kept under 2 GB.
- Arkiv can't hold that much, so use Swarm for the bytes, split into chunks.
- Run the heavy processing on the team's Azure GPU VM, and keep VM details out of the public repo.

**What the AI did:**
- Researched the Arkiv SDK 1.0, bee-js 13 and IDKit docs, plus the ETHGlobal Arkiv and Swarm prize rules.
- Proposed the design (Swarm ciphertext, Arkiv index, World Chain anchor; per-chromosome segments; keys derived from a wallet signature), which the human approved in plan mode.
- Wrote `packages/shared`, `packages/pipeline` (Docker on the VM) and the `/genome` and `/records` changes.
- Rewrote `arkiv/*.md` to match the code, and wrote `docs/genome-pipeline.md`.
- Ran the pipeline on GIAB HG002 on the VM and verified the decrypt round trip.

**Issues the AI caught and fixed while testing:**
- `head` under `pipefail` made the run fail.
- `bcftools stats` needs `-s -` for per-sample het/hom.
- A single stray `0/0` row in HG002 made the file look like a gVCF.
- Entities are public, so health findings are now sealed to the patient instead of indexed.
- The frontend didn't build: Next 14 can't read a TS config, x402 optional deps were missing, and `CONTRACTS.x.address` was used on plain strings.

**Not done in this session:** the live Swarm upload and Arkiv write. They need a postage batch and a funded Rabdi key.

---

## AI-Generated vs Human-Authored Content

| File | AI-generated | Human-directed |
|------|-------------|---------------|
| `research/01-07-*.md` | Content drafted by AI from web research | Topics, problem framing, ecosystem concept |
| `CONTRIBUTING.md` | Fully AI-generated | Branch strategy concept from human |
| `README.md` | AI-generated | — |
| `docs/ai-usage-log.md` | AI-generated (this file) | Prompted by human |
| Ecosystem architecture | AI synthesized from research | Core concept (patient layer + institutional layer + on-chain publication) from human |
| `research/08-11-*.md` | Drafted by AI from session discussion + web verification | Track choices (health tech), sponsor input (Chainlink/1inch booth), critical questions that shaped the medicine ledger (testing, enforcement, government path) |
| `research/assets/*.pdf` | AI-generated | Requested by human |
| Idea scores (/10) | AI judgement on an AI-proposed rubric | Human asked for ratings; not yet re-scored against confirmed tracks |

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
- Genome pipeline, shared crypto/schemas, `/genome` + `/records` storage flow: AI-written under human direction (Session 4), see `docs/genome-pipeline.md`
