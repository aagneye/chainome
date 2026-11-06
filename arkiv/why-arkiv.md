# Why Arkiv

## If we swapped Arkiv for Postgres, what would users lose?

**1. A genome index nobody can quietly rewrite.**
Each dataset entity is written once by the lab that processed the genome and can only be changed by that lab's key. Its `manifestRef` is the same string anchored on World Chain. In Postgres, an operator can edit a row and nobody can tell. With Arkiv, the patient's `/genome` panel reads entities that only the lab key could have written.

**2. Reads that don't depend on us.**
The `/genome` panel is a query against a public chain. If GenomeChain's servers disappear, the patient, a doctor or another app can still run the same query (the one in `src/query.ts`) and find their 22–25 encrypted segments on Swarm. With Postgres, the index of where your genome lives dies with our company.

**3. Consent that ends on its own.**
An `access_grant` entity expires at the consent end date. When it expires, the institution's wrapped keys stop being served, enforced by the network rather than by a deletion job we promise to run. Postgres needs a cron job and trust that it ran.

**4. One schema for many writers.**
Labs write genomes and the app writes records, through the same typed schemas. Any future lab or clinic writes the same entity types and the same queries find them. With Postgres, every new lab needs an API integration with us.

## What we kept off Arkiv, and why

| Kept off | Where it lives | Why |
|---|---|---|
| Genome bytes (67 MB ciphertext for a 1 GB VCF) | Swarm, AES-256-GCM per chromosome | 128 KiB per entity limit, and genomes are the most identifying data there is |
| Data keys | wrapped to the patient's X25519 key, inside the Swarm manifest | entities are public |
| Health findings (PGx phenotypes, risk markers) | Arkiv, but **sealed to the patient** | public "CYP2C19 poor metabolizer" next to a wallet would be a medical-privacy leak |
| Full World ID nullifier | nowhere; only a 16-hex prefix (`anonId`) | the full nullifier links a person across every use of that World ID action |
| File names of medical records | not stored | they often contain the patient's name |
| The source VCF's sample name, `##commandline` and paths | stripped by the pipeline before encryption | they identify the person and the lab run |
