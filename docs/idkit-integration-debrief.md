# IDKit Integration Debrief — GenomeChain

**Date:** 2026-11-06  
**Hackathon:** ETHGlobal Mumbai 2026  
**Project:** GenomeChain — patient-sovereign genomic data marketplace on WorldChain  
**Integrator:** Abhimanyu R B (GenomeChain team)

---

## What We Built

GenomeChain uses World ID (IDKit) as the Sybil-resistance layer for genomic data submission. The specific trust moment: **one genome per unique human**. Without this, a single actor could submit thousands of fake genomes and earn GNM tokens at scale — the same attack that killed Nebula Genomics and Hu-manity.co.

Integration points:
- **Frontend:** `@worldcoin/idkit` IDKitWidget on `/verify` page
- **Onchain:** `GenomeRegistry.sol` calls `IWorldID.verifyProof()` before storing any genome CID
- **Credential used:** `VerificationLevel.Orb` (biometric, strongest)
- **Signal:** patient wallet address — binds the proof to the submitter

---

## Time to First Success

| Step | Time |
|------|------|
| Read IDKit docs + install | ~20 min |
| Get app_id from Developer Portal | ~5 min |
| IDKitWidget rendering in UI | ~15 min |
| `onSuccess` proof passthrough to sessionStorage | ~10 min |
| `IWorldID` interface + `ByteHasher` in Solidity | ~40 min |
| Proof verification in GenomeRegistry.sol | ~30 min |
| **Total to first successful onchain verification** | **~2 hours** |

---

## What Worked Well

1. **IDKitWidget DX** — drop-in React component, minimal props, renders cleanly. Zero CSS conflicts with our dark theme.

2. **Simulator** — `simulator.worldcoin.org` saved hours. Didn't need a physical Orb to iterate.

3. **`nullifier_hash` as anonymous ID** — this is exactly the primitive GenomeChain needed. Stable per (appId, action), not linkable across apps, prevents duplicate submissions without revealing identity.

4. **Incognito Actions** — the action scoping (`genome_submission`) is clean. Future actions (e.g. `consent_revocation`, `data_access_request`) can be added without collision.

5. **WorldChain native** — building on WorldChain means verified users already have the World App installed. No cold-start problem for the credential.

---

## Friction Encountered

1. **`externalNullifierHash` computation** — the docs don't clearly explain that you need `ByteHasher.hashToField` on both the app_id and action separately before combining. Spent ~45 min debugging `InvalidNullifier` reverts before finding the correct encoding in a community GitHub issue.

2. **`onError` cancellation gap** — IDKit does not fire `onError` when the user simply closes the modal. The widget silently dismisses. Had to add an explicit "Cancel" button and manual state reset to demonstrate the denied path for the prize requirements. An `onClose` or `onCancel` callback would fix this.

3. **No `onClose` event** — related to above. Standard UX expectation: modal close = cancel event. Currently none.

4. **Proof mock in tests** — `IWorldID.verifyProof()` takes 8 `uint256[8]` proof values. No official Hardhat mock is published. We had to write `MockWorldID.sol` ourselves (setShouldRevert pattern). An official `@worldcoin/mock-world-id` package for testing would be a significant DX improvement.

5. **`signal` semantics** — docs say "signal is arbitrary data the user signs." It wasn't immediately clear that passing `address` as signal ties the proof to the wallet, preventing proof replay from another address. This should be more prominently documented as a security requirement.

6. **Testnet app_id** — the Developer Portal creates a staging app automatically, but the naming convention (`app_staging_...` vs `app_...`) caused confusion. The portal should label which is mainnet vs staging more clearly.

---

## Missing Capabilities We Wanted

1. **Proof expiry** — no built-in TTL on proofs. GenomeChain needs "re-verify every 365 days" for longitudinal studies. Currently we'd have to nullify and re-submit, which resets the nullifier_hash. A `verifyWithExpiry(proof, ttl)` or timestamp-bound proof would be valuable.

2. **Credential composability** — we wanted to combine Proof of Human (Orb) with Passport NFC to verify both humanity AND nationality for GDPR-scoped data marketplaces. No multi-credential proof currently.

3. **Server-side proof verification without custom Ethereum node** — the `verifyProof` JS SDK (`@worldcoin/idkit/server`) exists but requires a network call to the World ID cloud verifier. For production latency, an offline verifier (WASM) would be preferable.

4. **Agent Pass for AI-gated actions** — GenomeChain's `/insights` page routes genomic data through 0G Private Computer for AI inference. We explored requiring a fresh World ID Agent Pass before releasing AI insights ("prove you're human before getting your genome's risk scores"). We didn't integrate it in the hackathon window, but this is the ideal use case: human-in-the-loop AI access control.

---

## What We'd Do Differently

- Integrate `IWorldID.verifyProof()` Solidity pattern on day 1, not as an afterthought — the ABI and encoding are non-obvious and deserve a dedicated spike.
- Use the simulator from the first line of frontend code, not after the UI is "done."
- Write `MockWorldID.sol` before writing any tests that touch GenomeRegistry.

---

## Credential Choice Rationale

We chose `VerificationLevel.Orb` (biometric) over Device or Passport because:

- **Data quality requirement:** Genomic data has decade-long research value. A bot-submitted fake genome corrupts every downstream study. Device-level verification (less strict) doesn't eliminate coordinated Sybil attacks at scale.
- **One-genome-per-human is absolute:** Unlike "one vote per person" (where you might accept some over-counting), a duplicate genome submission is a direct protocol exploit. Orb is the only credential where the uniqueness guarantee is biometric.
- **Target population:** GenomeChain targets patients who would visit a clinical site for Orb verification — the same friction as signing an IRB consent form.

---

*GenomeChain — ETHGlobal Mumbai 2026*
