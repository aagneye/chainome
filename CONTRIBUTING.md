# Contributing Guide

## Branch Strategy

```
main
 └── dev
      ├── feature/<short-name>
      ├── research/<topic>
      ├── fix/<short-name>
      └── chore/<short-name>
```

- **`main`** — production-ready only. Never commit directly. Merge from `dev` via PR when a milestone is complete.
- **`dev`** — integration branch. All work lands here first via PR.
- **`feature/*`** — new features, branched from `dev`.
- **`research/*`** — discovery, evidence gathering, problem definition. Branched from `dev`.
- **`fix/*`** — bug fixes, branched from `dev`.
- **`chore/*`** — tooling, config, cleanup. Branched from `dev`.

## Workflow

```
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# ... do work ...

git push origin feature/your-feature-name
# Open PR → dev
```

**Never push directly to `main` or `dev`.** All changes go through PRs.

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `research` | Evidence gathering, problem analysis, market research |
| `chore` | Build tools, deps, config — no production code |
| `refactor` | Code restructure, no behavior change |
| `test` | Adding or fixing tests |

### Rules

- Summary line: **max 72 chars**, lowercase, no period at end
- Use imperative mood: "add X", not "added X" or "adds X"
- Scope is optional but useful: `feat(contracts):`, `research(remittance):`
- Body: explain **why**, not what. The diff shows what.
- Reference issues/PRs in footer: `Closes #12`, `Refs #8`

### Examples

```
research(remittance): add India cross-border payment evidence

docs: add contributing guide and branch strategy

feat(contracts): add x402 micropayment handler

fix(ui): correct exchange rate display on mobile

chore: init repo structure
```

## Pull Request Rules

1. **Target branch is always `dev`**, never `main`.
2. PR title follows the same format as commit messages.
3. Write a short description: what changed and why.
4. At least one teammate reviews before merge.
5. Squash commits on merge to keep `dev` history clean.
6. Delete the branch after merge.

## Moving to Main

A PR from `dev` → `main` happens only when:
- A complete, working milestone is ready (e.g., hackathon submission)
- All team members agree it's ready
- PR title: `release: <milestone name>`

## File Structure

```
/
├── CONTRIBUTING.md       # this file
├── README.md             # project overview
├── research/             # problem evidence, market research
├── docs/                 # technical specs, design docs
├── contracts/            # smart contracts
├── frontend/             # UI
└── backend/              # API, services
```
