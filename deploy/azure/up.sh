#!/usr/bin/env bash
# Deploy/refresh the lab node on the Azure VM. Host comes from deploy/.env (gitignored).
#   LAB_DOMAIN=<label>.eastus.cloudapp.azure.com bash deploy/azure/up.sh [--with-bee]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/deploy/.env"
: "${VM_HOST:?}" "${VM_USER:?}" "${LAB_DOMAIN:?set LAB_DOMAIN}"
GC_HOME="${VM_WORKDIR:-/data/biohub/genomechain}"
PROFILE=""; [ "${1:-}" = "--with-bee" ] && PROFILE="--profile bee"

cd "$ROOT"
tar --exclude=node_modules --exclude=work --exclude=out -czf - \
  package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc .dockerignore packages/shared packages/pipeline deploy/azure \
  | ssh "$VM_USER@$VM_HOST" "mkdir -p $GC_HOME/src && cd $GC_HOME/src && tar -xzf - && \
      test -f $GC_HOME/pipeline.env || { echo 'missing $GC_HOME/pipeline.env (see deploy/azure/pipeline.env.example)'; exit 1; }; \
      export BEE_PROXY_TOKEN=\$(grep ^BEE_PROXY_TOKEN= $GC_HOME/pipeline.env | cut -d= -f2); \
      GC_HOME=$GC_HOME LAB_DOMAIN=$LAB_DOMAIN GC_UID=\$(id -u) GC_GID=\$(id -g) \
        docker compose -f deploy/azure/docker-compose.yml $PROFILE up -d --build && \
      docker compose -f deploy/azure/docker-compose.yml ps"
