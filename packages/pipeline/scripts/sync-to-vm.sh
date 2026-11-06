#!/usr/bin/env bash
# Copy the pipeline source to the lab VM and rebuild the image.
# Host and user come from deploy/.env (gitignored) — never hard-code them here; this repo is public.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/deploy/.env"
: "${VM_HOST:?set VM_HOST in deploy/.env}" "${VM_USER:?set VM_USER in deploy/.env}"
VM_WORKDIR="${VM_WORKDIR:-/data/biohub/genomechain}"

cd "$ROOT"
tar --exclude=node_modules --exclude=work --exclude=out -czf - \
  package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc .dockerignore packages/shared packages/pipeline deploy/azure \
  | ssh "$VM_USER@$VM_HOST" "mkdir -p $VM_WORKDIR/src && cd $VM_WORKDIR/src && tar -xzf - && chmod +x packages/pipeline/scripts/*.sh \
      && docker build -q -f packages/pipeline/docker/Dockerfile -t genomechain-pipeline . >/dev/null && echo 'synced + image rebuilt'"
