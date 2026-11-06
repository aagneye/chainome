# Lab node on Azure

The genome flow is: **World App (Chainome mini app) → upload VCF → lab node on Azure → normalize, QC, encrypt per chromosome → Swarm → Arkiv → World Chain attestation**.

```
World App ──HTTPS──► Vercel (Next.js)  ── POST /jobs (service token) ──┐
    │                                                                  ▼
    └──── PUT VCF (≤2 GB, one-time upload URL) ──► Caddy :443 ──► pipeline-api :8080 ──► pipeline (Docker)
                                                     │                                    ├─► Bee :1633 ─► Swarm
                       Vercel /api/records, /api/swarm ─► /bee/* (bearer) ──► Bee         ├─► Arkiv (Rabdi)
                                                                                          └─► LabAttestation
```

Everything runs from `docker-compose.yml` here:

| Service | What it does |
|---|---|
| `caddy` | Automatic HTTPS (Let's Encrypt) for `LAB_DOMAIN`. World App webviews require HTTPS. |
| `pipeline-api` | Job service ([`packages/pipeline/src/server.ts`](../../packages/pipeline/src/server.ts)). Runs one job at a time and deletes the plaintext VCF and work files when each job ends. |
| `bee` (profile `bee`) | Optional local Swarm node (testnet by default). Skip it if the Swarm team gives you a gateway and batch. |

Real secrets live only on the VM in `$GC_HOME/pipeline.env` (mode 600). The template is [`pipeline.env.example`](pipeline.env.example). VM host and user live in the gitignored `deploy/.env`.

## One-time Azure setup

Do these once, by someone with rights on the VM's resource group:

```bash
# 1. a DNS name for the VM's public IP → <label>.<region>.cloudapp.azure.com
az network public-ip update -g <resource-group> -n <public-ip-name> --dns-name <label>

# 2. open HTTP (certificate challenge) and HTTPS
az network nsg rule create -g <resource-group> --nsg-name <nsg-name> -n allow-web \
  --priority 1010 --access Allow --protocol Tcp --direction Inbound --destination-port-ranges 80 443
```

## Deploy / update

```bash
LAB_DOMAIN=<label>.<region>.cloudapp.azure.com bash deploy/azure/up.sh             # without local Bee
LAB_DOMAIN=<label>.<region>.cloudapp.azure.com bash deploy/azure/up.sh --with-bee  # with local Bee
```

`up.sh` copies the pipeline sources to the VM, builds the image and runs `docker compose up -d`. Reference data (GRCh38 FASTA, liftover chain) comes from [`packages/pipeline/scripts/setup-vm.sh`](../../packages/pipeline/scripts/setup-vm.sh).

**Checks:**
- `https://<LAB_DOMAIN>/healthz` shows `mode` and whether Swarm, Arkiv and lab attestation are configured.
- `docker logs chainome-lab-pipeline-api-1` shows job logs.

## Keys and actions checklist

| # | What | Who | Where it goes |
|---|---|---|---|
| 1 | Open ports 80/443 and set a DNS label (commands above) | Azure admin | — |
| 2 | **Arkiv access key** from hub.arkiv.network/access-keys | team | `ARKIV_ACCESS_KEY` in `pipeline.env` **and** in Vercel |
| 3 | **Fund the Arkiv writer wallet** with tGLM (hub.arkiv.network/faucet). Address: see `healthz` / setup notes | team | key already in `pipeline.env` (`ARKIV_PRIVATE_KEY`) |
| 4 | **Swarm storage:** either (a) a gateway URL + postage batch ID from the Swarm team, or (b) fund the local Bee node (Sepolia ETH + sBZZ to its address in `docker logs chainome-lab-bee-1`) and buy a batch | team | `BEE_URL`, `SWARM_BATCH_ID` in `pipeline.env`; Vercel `BEE_URL=https://<LAB_DOMAIN>/bee`, `SWARM_BATCH_ID` |
| 5 | **Certify the lab wallet:** `LabRegistry.certifyLab(<lab address>, "Chainome Lab Node")` from the deployer (owner) account | contract owner | — (`LAB_PRIVATE_KEY` is already in `pipeline.env`) |
| 6 | **App origin** for browser uploads, e.g. `https://chainome.vercel.app` | team | `PIPELINE_ALLOWED_ORIGINS` in `pipeline.env` |
| 7 | **Vercel env:** `PIPELINE_API_URL=https://<LAB_DOMAIN>`, `PIPELINE_API_TOKEN` and `BEE_PROXY_TOKEN` (copy both from `pipeline.env` on the VM), `SWARM_GATEWAY=https://<LAB_DOMAIN>/bee`, `ARKIV_ACCESS_KEY`, `ARKIV_PRIVATE_KEY` (records) | team | Vercel project settings |
| 8 | **World Developer Portal:** allowlist `GenomeRegistry`, `RecordVault`, `ConsentManager`, `StudyRegistry` as contract entrypoints | team | portal |
| 9 | When 2–4 are done: set `PIPELINE_DRY_RUN=0` and rerun `up.sh` | team | `pipeline.env` |

Until step 9, the lab node runs in **test mode**: uploads are normalized, quality-checked and encrypted, and the app shows the result, but nothing is written to Swarm or Arkiv.
