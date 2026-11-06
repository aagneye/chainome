#!/usr/bin/env bash
# Run the pipeline in Docker on the lab node.
#   scripts/run.sh --vcf /gc/in/HG002_GRCh38.vcf.gz --patient 0x… --patient-pubkey … [--nullifier 0x…] [--dry-run]
# Secrets come from $GC_HOME/pipeline.env (BEE_URL, SWARM_BATCH_ID, ARKIV_*, LAB_*), never from the repo.
set -euo pipefail

GC_HOME="${GC_HOME:-/data/biohub/genomechain}"
IMAGE="${IMAGE:-genomechain-pipeline}"
ENV_FILE="$GC_HOME/pipeline.env"
[ -f "$ENV_FILE" ] || touch "$ENV_FILE"

exec docker run --rm --network host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  --env-file "$ENV_FILE" \
  -e REF_GRCH38=/gc/ref/hg38.fa \
  -e CHAIN_37_TO_38=/gc/ref/hg19ToHg38.over.chain.gz \
  -e PIPELINE_THREADS="${PIPELINE_THREADS:-16}" \
  -v "$GC_HOME:/gc" \
  "$IMAGE" src/cli.ts --work /gc/work "$@"
