# Lab-node image: Node 22 + bcftools/samtools/htslib + CrossMap (GRCh37 → GRCh38 liftover).
# Build from the repo root:  docker build -f packages/pipeline/docker/Dockerfile -t genomechain-pipeline .
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends bcftools samtools tabix python3-pip ca-certificates \
 && pip3 install --no-cache-dir --break-system-packages CrossMap \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/pipeline/package.json packages/pipeline/
RUN pnpm install --frozen-lockfile --filter pipeline...

COPY packages/shared packages/shared
COPY packages/pipeline packages/pipeline

WORKDIR /app/packages/pipeline
ENTRYPOINT ["/app/packages/pipeline/node_modules/.bin/tsx"]
CMD ["src/cli.ts", "--help"]
