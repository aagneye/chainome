# Arkiv Entity Schema — GenomeChain

ETHGlobal Mumbai 2026

---

## Entity: `medical_record_v1`

```
Entity Name:  medical_record_v1
Owner:        patient wallet address
Access:       owner + any address with on-chain ConsentGrant (checked via WorldChain)
Expiry:       10 years from creation (patient must renew; auto-expires per GDPR)
```

### Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `type` | string | Record category | `"genome"` \| `"lab_report"` \| `"prescription"` \| `"imaging"` \| `"bill"` |
| `cid` | string | IPFS CID of the AES-256 encrypted file | `"bafybeig3afbjnl7..."` |
| `date` | string | ISO 8601 date of the record | `"2025-11-06"` |
| `institution` | string | Hospital/lab/clinic name (optional) | `"Apollo Hospitals Delhi"` |
| `icd10Category` | string | Broad ICD-10 category | `"metabolic"` \| `"cardiovascular"` \| `"oncological"` \| `"neurological"` \| `"musculoskeletal"` \| `"infectious"` |
| `tags` | array[string] | Searchable keywords | `["diabetes", "HbA1c", "fasting glucose"]` |
| `anonymousId` | string | First 16 chars of World ID nullifier_hash | `"a3f9d821b7c40e12"` |

### Full Example

```json
{
  "type": "lab_report",
  "cid": "bafybeig3afbjnl7c5mxuoexample...",
  "date": "2025-10-14",
  "institution": "SRL Diagnostics Mumbai",
  "icd10Category": "metabolic",
  "tags": ["HbA1c", "fasting glucose", "lipid panel", "thyroid"],
  "anonymousId": "a3f9d821b7c40e12"
}
```

---

## Why Owner-Based Access + Expiry Is Critical for GDPR

### GDPR Art. 5(1)(e) — Storage Limitation

Personal data must not be kept "for longer than is necessary for the purposes for which the personal data are processed." A Postgres row has no concept of its own expiry — a DBA must run a deletion job, which may never run. Arkiv entities carry a native expiry at creation time. When the 10-year window closes, the entity is no longer accessible regardless of institutional interest. No DBA job required; no "we forgot to delete it" exposure.

### GDPR Art. 17 — Right to Erasure

The patient wallet owns the entity. The patient can delete the entity at any time — not by requesting deletion from a data controller, but by executing the deletion themselves as the owner. This is structural compliance, not policy compliance.

The encrypted file on IPFS is handled separately via crypto-shredding: when the patient destroys their AES key (derived from their World ID nullifier_hash), the encrypted blob becomes permanently irrecoverable. The Arkiv entity pointing to that CID becomes a pointer to indecipherable data. Both layers of erasure execute without touching WorldChain state.

### GDPR Art. 7(3) — Right to Withdraw Consent

The `ConsentGrant` in WorldChain's `ConsentManager.sol` can be revoked by the patient in one transaction. When consent is revoked, Arkiv stops serving the entity to that institution. The gate is enforced at query time — not by a database admin policy, but by on-chain state the patient controls.

### GDPR Art. 25 — Data Protection by Design

The entity schema contains no names, no dates of birth, no addresses, no direct identifiers. The `anonymousId` is a 16-character prefix of a ZKP-derived nullifier — it allows cross-referencing a patient's own records across institutions without revealing their identity. Even if Arkiv were fully compromised, the data reveals: "someone with partial id `a3f9d821b7c40e12` has a lab report with these tags, with an encrypted file at this CID." The encrypted file requires a key that only the patient holds.

---

## The `anonymousId` Field

**What it is:** The first 16 characters of the `nullifier_hash` returned by World ID's Incognito Action for `"medical_record"`. The full `nullifier_hash` is 32 bytes (64 hex chars). We store only half.

**Why not the full nullifier_hash:** The full nullifier is a stable, unique identifier for a human — it would function as a de-facto pseudonymous ID across all institutions that query Arkiv. The 16-char prefix enables a patient's own records to be linked (by an institution with consent) while making cross-institution re-identification via the Arkiv database significantly harder. 2^64 search space vs. 2^128.

**What it enables:** A research institution with consent can query: "give me all `medical_record_v1` entities where `anonymousId = 'a3f9d821b7c40e12'` and `type IN ('lab_report', 'genome')`." This builds a longitudinal health profile for a single (anonymous) patient across time and institutions — without ever learning who that patient is.

---

## Access Control Flow

```
Institution queries Arkiv
         │
         ▼
Arkiv checks: does WorldChain ConsentManager have an active ConsentGrant
              from (entity.owner → institution) covering (entity.type)?
         │
    ┌────┴─────┐
    │  YES     │  NO
    │          │
    ▼          ▼
Serve entity  Return 403
```

The institution cannot see the entity exists unless consent is active. No metadata leakage on denied queries.
