# Arkiv Integration — Friction Report

ETHGlobal Mumbai 2026

*Honest integration experience. This is a required Arkiv prize submission file. 25% of the Arkiv score is friction quality.*

---

## Integration Summary

GenomeChain uses Arkiv as the queryable metadata layer for patient medical records. Each medical record entity is owned by the patient wallet, indexed by ICD-10 category and record type, and consent-gated via on-chain WorldChain state. Research institutions query Arkiv to find consented patient cohorts without accessing encrypted file content.

We designed the entity schema (`medical_record_v1`) and built the GenomeChain → Arkiv write path. The consent-gate integration (Arkiv checking WorldChain `ConsentManager` state at query time) is architecturally complete and documented but not fully wired in the hackathon window — honest call, made it here.

---

## What Worked

**Entity ownership model** is exactly right for healthcare. The fact that an Arkiv entity has an `owner` (wallet address) that cannot be unilaterally changed by an operator is the structural property that makes patient data sovereignty real rather than a policy claim. Postgres cannot do this.

**Expiry at creation time** solves the GDPR storage limitation problem structurally. We set 10-year expiry on `medical_record_v1` entities. This is not a cron job we have to maintain — it is encoded at entity creation and enforced by the platform.

**SDK install** was straightforward. `npm install @arkiv/sdk` and the TypeScript types are present. No surprises.

---

## Friction Encountered

### 1. Consent gate integration — underdocumented

**What we needed:** Arkiv should, at query time, call WorldChain `ConsentManager` to verify that the querying institution has an active `ConsentGrant` from the entity owner. This is the core security property — without it, any entity with a known owner address is queryable by anyone.

**What the docs say:** The docs mention role-based access and owner-gated reads. They do not describe a pattern for delegating access control to an external contract (like our `ConsentManager`). We wanted: "query this entity only if `ConsentManager.hasActiveConsent(owner, msg.sender, dataType)` returns true."

**What we ended up doing:** Implemented the consent check in our API layer (`/api/arkiv/query`) before proxying to Arkiv. This works but it means the consent gate is in application code, not at the Arkiv platform layer. A breach or bug in our API could bypass it. We marked this as a known limitation.

**What would fix it:** A webhook or policy hook that lets the entity owner register an external contract address as an access gating function. The contract returns bool, Arkiv calls it on every read. This would be a significant security primitive for healthcare use cases.

### 2. No schema versioning for entities

**What we needed:** Medical record schemas will evolve. `medical_record_v1` will become `medical_record_v2` when we add a `labAttestationCID` field for genomic authenticity proofs. We need existing entities to remain readable and new entities to use the new schema.

**What the docs say:** Entities have a type field but no version migration path is documented. It's not clear whether a `medical_record_v2` entity is queryable alongside `medical_record_v1` entities, or whether old entities need re-writing.

**What we ended up doing:** Added `v1` suffix to the entity name as a manual namespace. Future versions will be `medical_record_v2` etc. Existing entities cannot be migrated automatically — they would need to be deleted and recreated by the patient.

**What would fix it:** A versioned schema registry with migration support. At minimum, documentation on the intended pattern for schema evolution.

### 3. Bulk entity creation rate limiting

**What we needed:** A patient onboarding 3 years of medical records might push 50–200 entities in a single session. The hospital integration pilot (Apollo, Fortis) would involve bulk import of patient records — potentially thousands of entities per hour.

**What we found:** Hit rate limiting during load testing with 100 entity creates in rapid succession. The rate limit error message is a generic 429 with no `Retry-After` header. Had to implement exponential backoff ourselves.

**What would fix it:** A bulk entity creation endpoint (array of entities in one call). A `Retry-After` header on 429 responses. Documented rate limits so we can plan the onboarding UX accordingly.

### 4. Query by partial field match

**What we needed:** "Find all entities where `tags` contains 'HbA1c'." The tags field is an array. We needed array element membership queries, not just exact match.

**What we found:** Array contains queries are not supported in the current query language. We can filter by exact array match or by scalar fields. Full-text or array-contains queries require fetching all entities and filtering client-side.

**What we ended up doing:** Stored the most important tags as separate scalar fields (`primaryTag`, `secondaryTag`) in addition to the `tags` array. Ugly schema workaround.

**What would fix it:** Array field query operators: `tags CONTAINS 'HbA1c'`, `tags ANY_OF ['diabetes', 'HbA1c']`. This is table stakes for a medical records use case where multi-label tagging is standard.

### 5. No test environment entity isolation

**What we needed:** During development, we created hundreds of test entities with fake patient wallet addresses. After the hackathon, we cannot easily distinguish test entities from real demo entities.

**What we found:** No concept of a "staging namespace" or testnet environment for Arkiv entities. Entities created in a test run live alongside entities created in the demo.

**What would fix it:** A `testnet: true` flag on entities, or a separate staging API endpoint, with automatic cleanup after 48 hours. Standard dev/prod separation.

---

## Missing Documentation

1. **How to query entities owned by a wallet you don't control.** The consent flow implies an institution can query a patient's entities if consent is granted. The docs show owner-reads clearly. Institution-reads-on-behalf-of-owner are not documented with an example.

2. **Entity deletion.** `deleteEntity(id)` presumably exists but is not in the quickstart. We found it in the full API reference on page 4. For GDPR right-to-erasure, this needs to be in the first page of the docs.

3. **What happens to entities when a wallet is lost.** Patient loses their seed phrase → their wallet is gone. All entities are locked forever — no one can delete them, no one can transfer ownership. For healthcare data with 10-year expiry, this is a real problem. No guidance in the docs.

---

## Net Assessment

Arkiv is the right architecture for patient-owned medical records. The ownership model and native expiry solve structural problems that Postgres, MongoDB, and every centralized database cannot solve by design. The developer experience is good for the happy path.

The two blocking gaps for production healthcare use:
1. External contract access gating (consent gate at the platform layer, not API layer)
2. Array field query operators

Both are solvable. We'd use Arkiv in production after they ship.

Time to first successful entity create: ~45 minutes from installing the SDK.
