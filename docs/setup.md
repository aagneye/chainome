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
| `SWARM_GATEWAY` | Production | Config | `https://<LAB_DOMAIN>/bee` — Caddy-proxied Bee endpoint (reads) |
| `BEE_URL` | Production | Config | `https://<LAB_DOMAIN>/bee` — same endpoint, used by `/api/records` to upload |
| `SWARM_BATCH_ID` | Production | Config | Postage batch ID from local Bee or Swarm team |
| `ARKIV_PRIVATE_KEY` | Production | **Secret** | 0x… Arkiv writer wallet (funded with tGLM) — same value as in `pipeline.env` |
| `NEXT_PUBLIC_CHAIN_ID` | Production | Config | `4801` — chain MiniKit sends transactions on |

> **To add a secret:** `vercel env add <NAME> --environment production` → choose Secret.

> **Do not add `LAB_PRIVATE_KEY` to Vercel.** The lab node on Azure signs `LabAttestation` itself after each pipeline run; that key lives only in `pipeline.env` on the VM. A second copy on Vercel would make the old `/api/lab-attest` route attest again, and it would fail with `AlreadyAttested`.

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
- Swarm batch ID is bought (Sepolia ETH + sBZZ into the Bee node address, then buy a batch — see §5)
- Arkiv writer wallet funded with tGLM (hub.arkiv.network/faucet), and `ARKIV_ACCESS_KEY` copied into `pipeline.env`

**Wallets on the VM** (keys only in `pipeline.env` / the Bee keystore; addresses are public):

| Wallet | Address | Network | Needs |
|---|---|---|---|
| Lab node (signs `LabAttestation`) | `0x851971ac2D06daA3e12Ba9Cf210d027DCdD813c3` | WorldChain Sepolia | `LabRegistry.certifyLab` by the deployer + a little WorldChain Sepolia ETH for gas ([faucet](https://www.alchemy.com/faucets/world-chain-sepolia)) |
| Arkiv writer | `0x1c5D8D938B58991e7a24218408E25eB53F17006b` | Arkiv Rabdi | tGLM from hub.arkiv.network/faucet |
| Bee / Swarm | `0x84429DF4bb5CEc45B2d93E6Abcf5C6dC5f079af4` | Ethereum Sepolia | Sepolia ETH (✅ funded) + sBZZ to buy a postage batch |

---

## 5. Swarm (Ethersphere Bee)

Encrypted VCF segments (AES-256-GCM, per chromosome) are stored on Swarm. Two options:

**Option A — local Bee node on the VM (default):**
```bash
# 1. Start with --with-bee
LAB_DOMAIN=... bash deploy/azure/up.sh --with-bee

# 2. Find Bee wallet address
docker logs chainome-lab-bee-1 2>&1 | grep "ethereum address"

# 3. Fund with Sepolia ETH + sBZZ, then buy a postage batch (run on the VM).
#    Bee's API is only on the compose network, so address the container directly:
BEE=http://$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' chainome-lab-bee-1):1633
curl -s $BEE/chainstate        # currentPrice = cost per chunk per block (24000 at time of writing)
#    amount = currentPrice × blocks to keep the data. Sepolia ≈ 7200 blocks/day, so 1 week ≈ 24000 × 50400 ≈ 1210000000.
#    depth 20 ≈ 4 GB theoretical capacity (one genome is ~70 MB encrypted). Total cost = amount × 2^depth PLUR ≈ 0.13 sBZZ.
curl -s -XPOST $BEE/stamps/1210000000/20   # → {"batchID": "..."}; wait until GET $BEE/stamps shows it "usable": true

# 4. Set SWARM_BATCH_ID in pipeline.env, re-run up.sh
```

**Bee node notes (learned the hard way):**
- **RPC:** Bee syncs postage events with multi-thousand-block `eth_getLogs` pages and retries failures with no back-off. Alchemy's free tier caps `eth_getLogs` at 10 blocks, so Bee loops thousands of times a minute. Use `BEE_RPC=https://rpc.sepolia.ethpandaops.io` (no key) in `pipeline.env`. The first sync takes ~25 min (`GET $BEE/chainstate` → `block` catches up to `chainTip`); batches can only be bought after that.
- **No chequebook:** Bee 2.8.1 deploys its chequebook with a fixed 175k gas limit, but the Sepolia factory needs ~630k, so the deploy always reverts. The compose file sets `BEE_CHEQUEBOOK_ENABLE=false`; uploads use Swarm's free bandwidth allowance.

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

- [x] Bee node funded with Sepolia ETH
- [ ] Send sBZZ to the Bee node (`0x84429DF4bb5CEc45B2d93E6Abcf5C6dC5f079af4`), then buy a postage batch (§5), or get a batch from the Swarm team
- [ ] Fund Arkiv writer wallet (`0x1c5D8D938B58991e7a24218408E25eB53F17006b`) with tGLM
- [ ] Copy `ARKIV_ACCESS_KEY` into `pipeline.env` on the VM (it's already in Vercel)
- [ ] Run `LabRegistry.certifyLab(0x851971ac2D06daA3e12Ba9Cf210d027DCdD813c3, "Chainome Lab Node")` from the deployer wallet
- [ ] Send a little WorldChain Sepolia ETH to the lab wallet `0x851971ac2D06daA3e12Ba9Cf210d027DCdD813c3` (gas for attestations)
- [ ] Set `PIPELINE_DRY_RUN=0` on VM, re-run `up.sh`
- [ ] Add `PIPELINE_API_URL`, `PIPELINE_API_TOKEN`, `BEE_PROXY_TOKEN`, `SWARM_GATEWAY`, `BEE_URL`, `SWARM_BATCH_ID`, `ARKIV_PRIVATE_KEY`, `NEXT_PUBLIC_CHAIN_ID` to Vercel (**not** `LAB_PRIVATE_KEY`), then redeploy
- [ ] Test full flow in World App Sandbox (install test build from World Dev Portal sidebar)
- [ ] Submit to ETHGlobal — tag World, Arkiv, EF Anon-RPC tracks
