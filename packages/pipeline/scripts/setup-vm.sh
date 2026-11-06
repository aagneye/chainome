#!/usr/bin/env bash
# One-time lab-node setup. Everything lives under $GC_HOME, outside any git repo.
# Downloads: UCSC hg38 FASTA (~0.9 GB gz → 3.1 GB), hg19ToHg38 chain (~0.2 MB),
# GIAB HG002 GRCh38 benchmark VCF (public NIST data) as the demo genome.
set -euo pipefail

GC_HOME="${GC_HOME:-/data/biohub/genomechain}"
IMAGE="${IMAGE:-genomechain-pipeline}"
mkdir -p "$GC_HOME"/{ref,in,work}
cd "$GC_HOME"

echo "free space on $(df -h "$GC_HOME" | awk 'NR==2{print $6": "$4}')"

if [ ! -s ref/hg38.fa ]; then
  curl -fL --retry 3 -o ref/hg38.fa.gz https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.fa.gz
  gunzip ref/hg38.fa.gz
fi
if [ ! -s ref/hg38.fa.fai ]; then
  docker run --rm -v "$GC_HOME/ref:/ref" --entrypoint samtools "$IMAGE" faidx /ref/hg38.fa
fi
if [ ! -s ref/hg19ToHg38.over.chain.gz ]; then
  curl -fL --retry 3 -o ref/hg19ToHg38.over.chain.gz https://hgdownload.soe.ucsc.edu/goldenPath/hg19/liftOver/hg19ToHg38.over.chain.gz
fi

GIAB=https://ftp-trace.ncbi.nlm.nih.gov/ReferenceSamples/giab/release/AshkenazimTrio/HG002_NA24385_son/NISTv4.2.1/GRCh38
if [ ! -s in/HG002_GRCh38.vcf.gz ]; then
  curl -fL --retry 3 -o in/HG002_GRCh38.vcf.gz "$GIAB/HG002_GRCh38_1_22_v4.2.1_benchmark.vcf.gz"
fi

ls -lh ref in
echo "setup done"
