# How GenomeChain Uses Arkiv

## What schema do we write?

Entity type: `medical_record_v1`

Every time a patient uploads a medical document (bill, lab report, prescription, imaging result, or genome file), GenomeChain writes one Arkiv entity owned by the patient's wallet address.

### Entity write (JSON-RPC)

```json
POST https://testnet.arkiv.network/rpc
{
  "jsonrpc": "2.0",
  "method": "arkiv_createEntity",
  "params": [{
    "schema": "medical_record_v1",
    "owner": "0xPatientWalletAddress",
    "fields": {
      "type":          "lab_report",
      "cid":           "QmXxx...encrypted",
      "date":          "2026-11-06",
      "institution":   "Apollo Diagnostics",
      "icd10Category": "metabolic",
      "tags":          ["HbA1c", "diabetes", "insulin"],
      "anonymousId":   "0x1a2b3c4d5e6f7a8b"
    },
    "expiresAt": 1978300800
  }],
  "id": 1
}
```

### Response
```json
{ "result": { "entityId": "0xabc123..." }, "id": 1 }
```

The `cid` field points to the AES-256 encrypted file on Lighthouse/IPFS. Without the patient's decryption key, the CID is useless to any querier — Arkiv stores only the structured index, never the plaintext.

## What queries do institutions run?

When a pharma company opens a study on GenomeChain, they query Arkiv to find eligible patient cohorts.

### Find T2D patients with 3+ years of records
```json
{
  "method": "arkiv_queryEntities",
  "params": [{
    "schema": "medical_record_v1",
    "filter": {
      "icd10Category": { "eq": "metabolic" },
      "type": { "eq": "lab_report" },
      "date": { "gte": "2023-01-01" }
    },
    "groupBy": "owner",
    "having": { "count": { "gte": 3 } }
  }]
}
```

### Find genome + cardiac records for GWAS study
```json
{
  "method": "arkiv_queryEntities",
  "params": [{
    "schema": "medical_record_v1",
    "filter": {
      "type": { "in": ["genome", "imaging"] },
      "icd10Category": { "eq": "cardiovascular" }
    },
    "groupBy": "owner",
    "having": {
      "types": { "containsAll": ["genome", "imaging"] }
    }
  }]
}
```

The result is a list of wallet addresses — not names, not medical content. The institution then checks ConsentManager on-chain to see which of those wallets have granted them consent, and only proceeds with those.

## Why testnet Arkiv?

GenomeChain writes to Arkiv testnet during the hackathon. Each `medical_record_v1` entity written via our `/api/arkiv-record` route gets an `entityId` returned. In stub mode (no `ARKIV_API_KEY`), the endpoint returns a deterministic `arkiv_stub_<hex>` ID.

To verify our integration:
1. Set `ARKIV_API_KEY` in `packages/frontend/.env.local`
2. Upload any medical record via `/records`
3. The API route at `/api/arkiv-record` will POST to `https://testnet.arkiv.network/rpc`
4. Returned `entityId` can be queried on the Arkiv explorer

## The critical privacy property

The `anonymousId` field stores only the first 16 hex characters of the World ID nullifier_hash — not the full nullifier. This prevents:
- Full nullifier linkage across Arkiv entities (partial prefix only)
- Re-identification of the patient via nullifier correlation

The full nullifier stays in `GenomeRegistry` on WorldChain, anchored to the genome CID. The two stores are intentionally not cross-linkable from the Arkiv side alone.
