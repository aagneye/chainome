# Chainome — Full Setup & Credentials Guide

ETHGlobal Mumbai 2026 · Nov 5–8  
App: **https://chainome.vercel.app** · Chain: WorldChain Sepolia (4801)

---

## 1. What's already done

| Item | Status | Notes |
|------|--------|-------|
| Contracts deployed (WorldChain Sepolia) | ✅ | Addresses in README |
| Vercel project linked | ✅ | `prj_9ffqhkIbbNMbJ99flfKMtiWWEn5n` / org `team_dLk6gXoeWIilzwoTJy7PmQcr` |
| CI/CD (GitHub Actions → Vercel prod) | ✅ | Push to `main` → auto-deploy |
| World ID Relying Party registered | ✅ | RP ID `rp_9caa8f923120ac6e` |
| World ID Mini App URL set | ✅ | `https://chainome.vercel.app` |
| Azure lab node Docker + Caddy | ✅ | `deploy/azure/` — teammate set up |
| `NEXT_PUBLIC_WLD_APP_ID` in Vercel | ✅ | `app_2913c2d5c136350fcea3a2933aba6364` |
| `WLD_SIGNER_PRIVATE_KEY` in Vercel | ✅ | Secret — from World Dev Portal key download |
| `ARKIV_ACCESS_KEY` in Vercel | ✅ | From hub.arkiv.network/access-keys |

---

## 2. World ID Configuration

| Field | Value |
|-------|-------|
| App ID | `app_2913c2d5c136350fcea3a2933aba6364` |
| RP ID | `rp_9caa8f923120ac6e` |
| Signer address (public) | `0x287EFeC50aAc24ddd0E78a2264858d83E7da67D5` |
| Mini App URL | `https://chainome.vercel.app` |
| Portal | https://developer.world.org |

**`WLD_SIGNER_PRIVATE_KEY`** — the private key downloaded when registering the RP. Set as a Vercel Secret (never commit). Used by Next.js API routes to sign World ID proof requests.

---

## 3. Vercel environment variables

All set via `vercel env add <NAME>` or the Vercel dashboard.

| Variable | Scope | Type | Description |
|----------|-------|------|-------------|
| `NEXT_PUBLIC_WLD_APP_ID` | Production | Config | `app_2913c2d5c136350fcea3a2933aba6364` |
| `WLD_SIGNER_PRIVATE_KEY` | Production | **Secret** | World ID RP signing key (from key file) |
| `ARKIV_ACCESS_KEY` | Production | **Secret** | Rabdi testnet access key — `ark_live_...` from hub.arkiv.network |
| `PIPELINE_API_URL` | Production | Config | `https://<LAB_DOMAIN>` — Azure VM public HTTPS URL |
| `PIPELINE_API_TOKEN` | Production | **Secret** | Matches `PIPELINE_API_TOKEN` in `pipeline.env` on the VM |
| `BEE_PROXY_TOKEN` | Production | **Secret** | Matches `BEE_PROXY_TOKEN` in `pipeline.env` on the VM |
| `SWARM_GATEWAY` | Production | Config | `https://<LAB_DOMAIN>/bee` — Caddy-proxied Bee endpoint |
| `SWARM_BATCH_ID` | Production | Config | Postage batch ID from local Bee or Swarm team |
| `ARKIV_PRIVATE_KEY` | Production | **Secret** | 0x… lab writer wallet (funded with tGLM) |
| `LAB_PRIVATE_KEY` | Production | **Secret** | Signs `LabAttestation` on WorldChain after pipeline runs |

> **To add a secret:** `vercel env add <NAME> --environment production` → choose Secret.

---

## 4. Azure lab node

Full instructions: [`deploy/azure/README.md`](../deploy/azure/README.md)

**What runs on the VM:**
- `caddy` — TLS termination via Let's Encrypt, reverse proxy to pipeline-api and Bee
- `pipeline-api` — job service (`packages/pipeline/src/server.ts`): issues one-time upload URLs, runs the VCF pipeline, writes results to Swarm + Arkiv + WorldChain
- `bee` (optional profile) — local Swarm node (testnet)

**Secrets on the VM** live in `$GC_HOME/pipeline.env` (chmod 600, never committed). Template: `deploy/azure/pipeline.env.example`.

**To deploy/update the lab node:**
```bash
# Set LAB_DOMAIN and VM creds in deploy/.env (gitignored)
LAB_DOMAIN=<label>.<region>.cloudapp.azure.com bash deploy/azure/up.sh
# With local Bee node:
LAB_DOMAIN=<label>.<region>.cloudapp.azure.com bash deploy/azure/up.sh --with-bee
```

**Health check:** `GET https://<LAB_DOMAIN>/healthz` — shows mode + whether Swarm/Arkiv/attestation are configured.

**Pipeline is in dry-run mode** (`PIPELINE_DRY_RUN=1`) until Swarm batch + Arkiv key are funded. Set `PIPELINE_DRY_RUN=0` and re-run `up.sh` once:
- Swarm batch ID is bought (Sepolia ETH + sBZZ into Bee node address, then `bee postage buy`)
- Arkiv writer wallet funded with tGLM (hub.arkiv.network/faucet)

---

## 5. Swarm (Ethersphere Bee)

Encrypted VCF segments (AES-256-GCM, per chromosome) are stored on Swarm. Two options:

**Option A — local Bee node on the VM (default):**
```bash
# 1. Start with --with-bee
LAB_DOMAIN=... bash deploy/azure/up.sh --with-bee

# 2. Find Bee wallet address
docker logs chainome-lab-bee-1 2>&1 | grep "ethereum address"

# 3. Fund with Sepolia ETH + sBZZ (bridged), then buy a postage batch
curl -s -XPOST http://localhost:1633/stamps/10000000/17  # → returns batchID

# 4. Set SWARM_BATCH_ID in pipeline.env, re-run up.sh
```

**Option B — Swarm team gateway:**
Set `BEE_URL=<gateway>` and `SWARM_BATCH_ID=<batch>` in `pipeline.env` — no local Bee needed.

The frontend reads Swarm via `SWARM_GATEWAY=https://<LAB_DOMAIN>/bee` (Caddy-proxied, bearer-auth with `BEE_PROXY_TOKEN`).

---

## 6. Arkiv (Rabdi testnet)

Queryable metadata (genome datasets, per-chromosome segments, sealed health features, medical records) lives on the Arkiv Rabdi testnet.

```
RPC:        https://rpc.rabdi.db-chain.testnet.arkiv.network
Access key: ark_live_... (from hub.arkiv.network/access-keys)
```

- `ARKIV_ACCESS_KEY` — set in Vercel + `pipeline.env` on the VM
- `ARKIV_PRIVATE_KEY` — lab writer wallet; fund with tGLM at hub.arkiv.network/faucet
- Schemas defined in `packages/shared/src/arkiv.ts`

---

## 7. GitHub Actions CI/CD

Workflow: `.github/workflows/deploy.yml` — triggers on push to `main`.

**GitHub secrets required** (repo Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | Personal access token from vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `team_dLk6gXoeWIilzwoTJy7PmQcr` |
| `VERCEL_PROJECT_ID` | `prj_9ffqhkIbbNMbJ99flfKMtiWWEn5n` |

---

## 8. Branch strategy

| Branch | Purpose | Rule |
|--------|---------|------|
| `main` | Production (Vercel auto-deploys) | Never push directly |
| `master` | Staging | Never push directly |
| `dev` | Integration | Merge feature branches here |
| `feat/*` | Feature work | Branch from `dev`, PR back to `dev` |

Merge chain: `feat/*` → `dev` → `master` → `main`

---

## 9. Remaining checklist before demo

- [ ] Fund Swarm batch (Sepolia ETH + sBZZ → Bee node) or get gateway from Swarm team
- [ ] Fund Arkiv writer wallet with tGLM
- [ ] Set `PIPELINE_DRY_RUN=0` on VM, re-run `up.sh`
- [ ] Run `LabRegistry.certifyLab(<lab_address>, "Chainome Lab Node")` from deployer wallet
- [ ] Add `PIPELINE_API_URL`, `PIPELINE_API_TOKEN`, `BEE_PROXY_TOKEN`, `SWARM_GATEWAY`, `SWARM_BATCH_ID`, `ARKIV_PRIVATE_KEY`, `LAB_PRIVATE_KEY` to Vercel
- [ ] Test full flow in World App Sandbox (install test build from World Dev Portal sidebar)
- [ ] Submit to ETHGlobal — tag World, Arkiv, EF Anon-RPC tracks
