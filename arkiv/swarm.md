# Swarm in GenomeChain

## What's on Swarm vs Arkiv

| Swarm (bytes) | Arkiv (index) |
|---|---|
| One AES-256-GCM ciphertext file per chromosome (`GCv1` format: magic, nonce, ciphertext, tag) | `genome_segment` entity per chromosome: **`swarmRef`** holds the plain Swarm reference of that ciphertext |
| `manifest.json`: segment refs, hashes, QC, tool versions, each segment key wrapped to the patient | `genome_dataset.manifestRef` holds the manifest's Swarm reference (also attested by the lab and anchored in `GenomeRegistry`) |
| Medical record ciphertext plus a `RecordManifest` JSON | `medical_record.manifestRef` |

**Why plain references to our own ciphertext, not Swarm encryption:** a Swarm *encrypted* reference contains its decryption key, and Arkiv entities are public. We encrypt before upload (`packages/pipeline/src/encrypt.ts`, and `lib/genome-crypto.ts` in the browser), so the reference reveals nothing and is safe to publish.

**Why split per chromosome when Swarm already chunks (4 KB):**
- a patient can share one chromosome;
- a failed upload retries 5 MB, not 1 GB;
- the browser can download and verify a single segment.

## Proof

_Filled in after the first live run:_

- Arkiv entity key: `0x…` → Swarm ref `…` (open: `<gateway>/bytes/<ref>`; it's ciphertext, so expect binary)
- Postage batch ID: `…`, bought by / given by: `…`
- Bee node / service: `…`
- Demo video: Swarm appears at `mm:ss` (the `/genome` "download & verify" click)

## Files that upload to and read from Swarm

| File | Does |
|---|---|
| [`packages/pipeline/src/swarm.ts`](../packages/pipeline/src/swarm.ts) | preflight (node health and batch usable), `bee.data.upload` of each segment and the manifest, with retries |
| [`packages/pipeline/src/verify.ts`](../packages/pipeline/src/verify.ts) | CLI read: download manifest and segment, unwrap key, decrypt, check both hashes |
| [`packages/frontend/app/api/records/route.ts`](../packages/frontend/app/api/records/route.ts) | uploads browser-encrypted medical records; rejects anything that isn't `GCv1` ciphertext |
| [`packages/frontend/app/api/swarm/[ref]/route.ts`](../packages/frontend/app/api/swarm/%5Bref%5D/route.ts) | read proxy (`/bytes/<ref>`) for the browser |
| [`packages/frontend/lib/genome-crypto.ts`](../packages/frontend/lib/genome-crypto.ts) | browser read: download, verify sha256, decrypt with WebCrypto |

## Run one upload and one read yourself

You need Docker, a Bee node URL and a usable postage batch, plus (for the Arkiv step) a funded Rabdi key.

```bash
# 1. lab node image + reference + demo genome (GIAB HG002, GRCh38, public NIST data)
docker build -f packages/pipeline/docker/Dockerfile -t genomechain-pipeline .
GC_HOME=$PWD/.gc bash packages/pipeline/scripts/setup-vm.sh

# 2. secrets (never committed)
cat > .gc/pipeline.env <<EOF
BEE_URL=http://localhost:1633
SWARM_BATCH_ID=<batch id>
ARKIV_ACCESS_KEY=<hub.arkiv.network access key>
ARKIV_PRIVATE_KEY=0x<funded Rabdi key>
EOF

# 3. upload: normalize → encrypt → Swarm → Arkiv
GC_HOME=$PWD/.gc bash packages/pipeline/scripts/run.sh --vcf /gc/in/HG002_GRCh38.vcf.gz \
  --patient 0x<wallet> --patient-pubkey <key from /genome>

# 4. read: chr22 back from Swarm, decrypted, both hashes checked
docker run --rm --network host -v $PWD/.gc:/gc genomechain-pipeline src/verify.ts \
  --manifest <manifestRef printed above> --chrom chr22 --signature 0x<signature from /genome>
```

**What you should see:**
- Step 3 prints 22 `swarm chrN <ref>` lines, then `manifestRef`, the dataset key and the runnable query.
- Step 4 prints `"cipherHashOk": true, "plainHashOk": true` and writes `chr22.decrypted.vcf.gz`, which `bcftools view` reads.

## What got in our way

- **Getting storage:** uploads need a postage batch (prepaid storage bought with BZZ), and for a first-timer it isn't obvious where to get one for a testnet hackathon project. A "hackathon batch" flow or faucet would help.
- **bee-js 13 renamed everything** (`uploadData` → `bee.data.upload`, `uploadFile` → `bee.file.upload`); most examples online still use the old names.
- **Encrypted references vs public indexes:** the warning that an encrypted reference embeds its key is easy to miss, and it decided our whole design.
