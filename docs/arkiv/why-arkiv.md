# Why Arkiv — GenomeChain Prize Submission

ETHGlobal Mumbai 2026

---

## "If this data sat in Postgres instead of Arkiv, what could people no longer do?"

### What the data is

Medical record metadata entities: record type, date, ICD-10 category, institution, encrypted file CID, tags, anonymous patient ID. These entities live in Arkiv, owned by the patient wallet, with on-chain consent gates and 10-year native expiry.

### What breaks with Postgres

**1. Patient ownership disappears.**
In Postgres, the row owner is the database admin. The patient submitted their data to a form; the institution stored it. If the institution is acquired, shuts down, or decides to monetize the data differently, the patient has no technical recourse. In Arkiv, the owner field is a wallet address. The patient can delete their own entity. No institution can transfer ownership without the patient's cryptographic signature.

**2. Consent becomes a policy, not a gate.**
In Postgres, "this institution has access" is an ACL row that a DBA can modify. Access is enforced by application code that can be bypassed, modified, or ignored in an acquisition. In Arkiv, the consent check is an on-chain state read against `ConsentManager.sol` — the same WorldChain contract the patient used to grant consent. An institution cannot query the entity without a valid on-chain consent grant. This is structurally enforced, not policy-enforced.

**3. No cross-institution record linkage without a central broker.**
In Postgres, linking a patient's records across Hospital A, Lab B, and Pharmacy C requires either: (a) a central database that all three institutions report to — a single point of failure and a massive privacy liability, or (b) each institution manually deduplicating. In Arkiv, the `anonymousId` field (partial nullifier) enables a consented institution to query: "all records for this anonymous patient." No central broker. No institution knows who the others are. The patient's World ID anchors the linkage without revealing identity.

**4. Expiry is a cron job that never runs.**
GDPR Art. 5(1)(e) requires data to not be retained beyond its purpose. In Postgres, this requires someone to write and maintain a deletion job. In practice, healthcare institutions archive everything forever because deletion creates liability questions. Arkiv entities carry a native expiry at creation time. The 10-year window is structural, not operational.

**5. Single point of breach.**
A Postgres database at a hospital is a target. One breach exposes every patient's metadata. Arkiv entities are distributed — no single host has all patient data, and each entity's encrypted file CID is worthless without the patient's decryption key (which is never in the database).

---

## "What can people do with Arkiv that they can't do with the original source?"

### What the original source is

The "original source" is the patient's physical documents: paper prescriptions, printed lab reports, hospital discharge summaries, insurance bills. Possibly also: hospital EMR systems (HL7 FHIR, Epic, Cerner) that the patient cannot directly access or query.

### What Arkiv enables

**1. Cross-institution longitudinal health profile, owned by the patient.**
A patient who visited Apollo in Delhi, a lab in Mumbai, and a clinic in Bangalore has records in three disconnected systems. None of those systems can see the others. The patient cannot see a combined view without calling each institution, requesting records, waiting weeks, and assembling them manually. In Arkiv, the patient uploaded each record themselves. Their wallet owns all three entities. Any institution with consent can query the full longitudinal profile in one API call.

**2. Medical records as a research asset without exposing content.**
The CID field in an Arkiv entity points to an AES-256 encrypted file. The file is meaningless without the patient's key. But the metadata — record type, ICD-10 category, date, tags — is queryable. A pharma company running a diabetes study can query Arkiv for: "patients who have `icd10Category: 'metabolic'` AND `tags: ['HbA1c']` AND at least one `type: 'genome'` record." They find matching cohorts without ever accessing the actual files. Files are accessed only after the patient explicitly consents and the TEE processes them. The original paper records cannot be queried at all.

**3. Programmatic consent that follows the data.**
When a patient uploads a record to a hospital EMR, that hospital owns the data. The patient cannot programmatically revoke the hospital's access — they can send a written request under GDPR Art. 17 and wait 30 days for a response. In Arkiv, `ConsentManager.revokeConsent(institution)` executes in one transaction. Arkiv reads on-chain consent state at query time. Revocation takes effect immediately on the next query.

**4. Research study matching at scale.**
A pharma company wanting to find Indian patients with cardiovascular risk factors and genomic data must currently: (a) partner with Indian hospitals individually, (b) negotiate data sharing agreements with each, (c) wait for IRB approval at each institution, (d) receive non-standardized data exports. This takes 18–36 months. In GenomeChain, the pharma company posts study criteria in StudyRegistry. Arkiv surfaces matching patients. Patients consent in one tap. The institution queries the matched cohort. The 18-month process compresses to days.

---

## Summary

Postgres gives you storage and queries. Arkiv gives you patient-owned, consent-gated, expiry-native, cross-institution queryable health records that act as research assets without exposing personal data. The difference is not technical convenience — it is the structural difference between data the patient controls and data the institution controls.
