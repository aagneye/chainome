# Arkiv schema

GenomeChain writes five entity types to the **Rabdi testnet** (chain `7794095`, RPC `https://rpc.rabdi.db-chain.testnet.arkiv.network`) through `@arkiv-network/sdk` 1.0.1 named schemas. The source of truth is [`packages/shared/src/arkiv.ts`](../packages/shared/src/arkiv.ts), which the lab pipeline (writes) and the web app (reads) both import.

**Rule:** Arkiv entities are public. They hold **pointers, hashes and coarse metadata only**:
- Genome bytes are AES-256-GCM ciphertext on **Swarm** (see [swarm.md](swarm.md)).
- Health findings are encrypted to the patient before they reach Arkiv.

## Entities

### `genomechain.genome_dataset` — one per processed genome

| Column | Type | Indexed | Why |
|---|---|---|---|
| `patient` | addr | ✓ | `/genome` loads "my genome" by wallet |
| `anonId` | str | ✓ | first 16 hex chars of the World ID nullifier; links a person's records without revealing the nullifier |
| `build` | str | ✓ | always `GRCh38` after normalization; studies filter on it |
| `sourceFormat` | str | ✓ | `vcf` / `23andme` |
| `sourceBuild` | str | | build the file arrived in (GRCh37 is lifted over) |
| `qcPass` | bool | ✓ | studies only match QC-passing genomes |
| `hasRefCalls` | bool | | `false` = variant-only VCF, where a missing variant is "assumed reference", not confirmed |
| `variantCount` | u64 | | QC |
| `segmentCount` | i32 | | number of per-chromosome segments |
| `cipherBytes` | u64 | | total ciphertext on Swarm |
| `titv`, `hetHom` | dec | | QC metrics, shown on `/genome` |
| `manifestRef` | str | | Swarm ref of `manifest.json`. The same string is attested by the lab and anchored in `GenomeRegistry` |
| `pipelineVersion` | str | | reproducibility |

### `genomechain.genome_segment` — one per chromosome (22–25 per genome)

| Column | Type | Indexed | Why |
|---|---|---|---|
| `dataset` | key | ✓ | segments of a dataset: the main query |
| `patient` | addr | ✓ | |
| `chrom` | str | ✓ | share or fetch a single chromosome |
| `chromOrder` | i32 | ✓ | sort chr1…chr22, X, Y, M |
| `variantCount`, `cipherBytes` | u64 | | shown per row |
| `swarmRef` | str | | plain Swarm ref of the **ciphertext** (safe to publish) |
| `sha256Cipher`, `sha256Plain` | str | | the browser verifies both after download and decryption |

### `genomechain.genome_features` — one per genome

| Column | Type | Indexed | Why |
|---|---|---|---|
| `dataset` | key | ✓ | |
| `patient` | addr | ✓ | |
| `panelVersion` | str | | |
| `summary` | bytes | | `EncryptedBlob` JSON: PGx phenotypes (CYP2C19, CYP2C9, SLCO1B1) and a TCF7L2 risk marker, **sealed to the patient's X25519 key** |

### `genomechain.medical_record` — one per uploaded document

| Column | Type | Indexed | Why |
|---|---|---|---|
| `patient` | addr | ✓ | |
| `anonId` | str | ✓ | |
| `recordType` | str | ✓ | `lab_report` / `prescription` / `imaging` / … |
| `date` | str | ✓ | `YYYY-MM-DD` |
| `mimeType` | str | | |
| `cipherBytes` | u64 | | |
| `manifestRef` | str | | Swarm `RecordManifest` (file ref and wrapped key); the same string goes to `RecordVault.addRecord` |

### `genomechain.access_grant` — patient → institution (schema defined; UI in progress)

| Column | Type | Indexed | Why |
|---|---|---|---|
| `dataset` | key | ✓ | |
| `patient` | addr | ✓ | |
| `institution` | addr | ✓ | the institution queries its own grants |
| `chroms` | str | | e.g. `chr10,chr22` |
| `wrappedKeys` | bytes | | segment DEKs re-wrapped to the institution's X25519 key |

## Who owns what, and when it expires

| Entity | Owner (`$owner`) | Expiry |
|---|---|---|
| dataset / segment / features | the **lab node wallet** that ran the pipeline and pays tGLM | 180 days (Arkiv max ≈ 182.5 days); renewed by re-running `extendEntity` |
| medical_record | the app's server writer wallet | 180 days |
| access_grant | the patient | **= consent expiry**, so the grant and its wrapped keys disappear when consent ends |

The patient is recorded in the indexed `patient` column. Making the patient the `$owner` (via `changeOwnership`) is the next step. Patients in World App don't hold tGLM for gas today, which is why the lab writes.

## Queries the app runs

- `/genome`: `select().from(GenomeDataset).where(eq("patient", addr(wallet)))`, then `select(...).from(GenomeSegment).where(eq("dataset", key(datasetKey))).orderBy(asc("chromOrder"))` ([`lib/arkiv-server.ts`](../packages/frontend/lib/arkiv-server.ts)).
- CLI: `pnpm --filter pipeline run query -- --dataset 0x… | --patient 0x…` ([`src/query.ts`](../packages/pipeline/src/query.ts)).
