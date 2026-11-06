# How we use Arkiv

## What we filter on, and why it fits the app

| Filter | Used by | Fit |
|---|---|---|
| `GenomeDataset.patient = wallet` | `/genome` "Your genome" panel | a patient opens the app and sees their genome, read from Arkiv, not from our server |
| `GenomeSegment.dataset = key`, ordered by `chromOrder` | `/genome` segment table and download & verify | one row per chromosome, each pointing at its ciphertext on Swarm |
| `qcPass`, `build`, `sourceFormat` | study matching (next) | studies need "QC-passing GRCh38 genomes", which works without seeing any genotype |
| `MedicalRecord.recordType`, `date`, `anonId` | records timeline (next) | longitudinal history across providers, linked by the anonymous ID |
| `AccessGrant.institution = me` | institution side (next) | an institution lists only the segments shared with it |

We index only what a screen or study filters on. Everything else is stored but not indexed: hashes, sizes and Swarm refs.

## Who can edit each entity

- **Genome entities** are written once by the lab node that processed the genome. That wallet is the `$owner`; nobody else can patch or delete them. A corrected genome means a new pipeline run and a new dataset entity.
- **Access grants** are written by the patient, so only the patient can revoke one early (`deleteEntity`).
- **Health findings** (`genome_features.summary`) are public bytes, but they are sealed to the patient's key, so editing rights matter less than readability: only the patient can open them.

## When entities expire

- **Genome data: 180 days**, just under Arkiv's ~182.5-day maximum. An expired index is safe: the ciphertext on Swarm is useless without keys, and the World Chain anchor still proves what existed.
- **Access grants: the consent end date.** Arkiv's expiry *is* the consent mechanism. An institution's key material stops being served the moment consent lapses, with no cron job and no "please delete" request.

## Does each Arkiv feature change something users see?

| Feature | What the user sees |
|---|---|
| Named schemas (`defineSchema`) | the same typed schema powers the lab CLI and the web app, so the panel can't drift from what was written |
| Indexed attributes + `where` / `orderBy` | the `/genome` segment table, sorted chr1→chrM |
| `executeBatch` | 22–25 segments land in 3 transactions instead of 25 |
| Expiration | consent grants that end on their own |
| `key()` references | segments and features point at their dataset entity |

## Code

- Schemas: [`packages/shared/src/arkiv.ts`](../packages/shared/src/arkiv.ts)
- Writes: [`packages/pipeline/src/arkiv.ts`](../packages/pipeline/src/arkiv.ts) (genome) and [`packages/frontend/app/api/records/route.ts`](../packages/frontend/app/api/records/route.ts) (records)
- User-facing read: [`packages/frontend/lib/arkiv-server.ts`](../packages/frontend/lib/arkiv-server.ts) → [`app/api/genome/route.ts`](../packages/frontend/app/api/genome/route.ts) → [`components/GenomePanel.tsx`](../packages/frontend/components/GenomePanel.tsx)
- Runnable query: [`packages/pipeline/src/query.ts`](../packages/pipeline/src/query.ts)

## Proof

_Filled in after the first live run:_ writer wallet, dataset entity key, one segment entity key, and the explorer links at `https://rabdi.explorer.arkiv.network/entity/<key>`.
