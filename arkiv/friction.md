# Arkiv friction log

What got in our way while building Chainome at ETHGlobal Mumbai, with what we expected, what happened, and how to reproduce it.

## 1. `bigint` isn't accepted for a `u64` column

- **Expected:** the README says a bare `bigint` works "where it is unambiguous", so `variantCount: 4096123n` for a `u64()` column.
- **Happened:** compile error `Type 'bigint' is not assignable to type 'U64Value'`. With `u64` and `u256` both bigint-backed it *is* ambiguous, but the README sentence suggests otherwise.
- **Fix we used:** `u64(BigInt(n))`.
- **Suggestion:** say in the README that bigint needs `u64()` / `u256()`, or infer it from the schema column.
- **Repro:** `defineSchema("x", { n: u64() })` and pass `{ n: 1n }` to `createEntity`.

## 2. Docs, redirects and versions disagree

- `arkiv.dev.golem.network/docs/sdk` redirects (308) to `docs.arkiv.network/typescript-sdk/querying-data`, which redirects (301) to `/querying/select/`. `/typescript-sdk/creating-entities` is a 404.
- Search results and the old guide show SDK 0.4.x and 0.6 with Kaolin examples. npm gave us **1.0.1** with Rabdi. Older blog posts show `annotations` / `stringAnnotations`; 1.0 uses schemas.
- **Suggestion:** a version banner on old pages, and redirects that land on the matching new page.

## 3. Entity lifetime max ≈ 182.5 days isn't on the overview pages

- Our first design (and our docs) said "10-year GDPR expiry". We found the 7,884,000-block cap only on the Limits page.
- **Suggestion:** put the maximum lifetime next to `ExpirationTime` in the README, and show the cap in the `InvalidExpiryError` message.

## 4. Public entities and sensitive data: no built-in confidentiality

- Everything in an entity is world-readable, which is correct for a public DB-chain. We had to build our own envelope (X25519 + AES-GCM) for the `summary` bytes and for access grants.
- **Wish:** a documented "store a sealed payload" pattern or helper (sealed to an owner key), since healthcare, identity and finance apps will all need it.

## 5. The patient can't easily be the owner

- Patients use World App, with no tGLM for gas, so our lab node wallet writes their entities and records the patient in an indexed `patient` column.
- **Wish:** a sponsored-write or meta-transaction pattern so the patient can own entities without holding tGLM, or a guide on `changeOwnership` for exactly this hand-off.

## 6. Small things

- `str` is capped at 128 bytes; a Swarm *encrypted* reference (128 hex chars) plus a `0x` prefix wouldn't fit. We don't store those, but it was a surprise.
- The public RPC is heavily rate-limited, so an access key is required for anything real. The README says so, but a 429 error message that points at hub.arkiv.network/access-keys would save time.
- `orderBy` takes one key only: fine for us (`chromOrder`), but secondary sorts need client-side work.

## What worked well

- One `defineSchema` shared by a Node CLI and a Next.js app: typed writes, typed reads, and `where` checked against indexed columns at compile time.
- `executeBatch` plus `key()` references: 22 segments in 3 transactions, all pointing at their dataset.
- Expiration as a product feature: consent grants that end themselves.
