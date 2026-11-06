import { describe, expect, it } from "vitest";
import {
  KEY_DERIVATION_MESSAGE,
  bytesToHex,
  keyPairFromSignature,
  newDataKey,
  openSealed,
  sealForRecipient,
  unwrapKey,
  wrapKey,
} from "../src/keys";

const SIG_A = "0x" + "ab".repeat(65);
const SIG_B = "0x" + "cd".repeat(65);

describe("keyPairFromSignature", () => {
  it("is deterministic for the same signature", () => {
    const a = keyPairFromSignature(SIG_A);
    const b = keyPairFromSignature(SIG_A);
    expect(bytesToHex(a.privateKey)).toBe(bytesToHex(b.privateKey));
    expect(bytesToHex(a.publicKey)).toBe(bytesToHex(b.publicKey));
  });

  it("accepts the signature with or without 0x", () => {
    expect(bytesToHex(keyPairFromSignature(SIG_A.slice(2)).publicKey)).toBe(bytesToHex(keyPairFromSignature(SIG_A).publicKey));
  });

  it("gives different keys for different signatures", () => {
    expect(bytesToHex(keyPairFromSignature(SIG_A).publicKey)).not.toBe(bytesToHex(keyPairFromSignature(SIG_B).publicKey));
  });

  it("produces 32-byte X25519 keys", () => {
    const k = keyPairFromSignature(SIG_A);
    expect(k.privateKey).toHaveLength(32);
    expect(k.publicKey).toHaveLength(32);
  });

  it("pins the derivation output so a silent change can't orphan existing data", () => {
    // If this changes, every patient's existing genome becomes undecryptable.
    // Re-pinned 2026-11-06 for the GenomeChain → Chainome rename (HKDF info "chainome/x25519/v1"),
    // before any real genome was stored. Never change it again once data exists.
    expect(bytesToHex(keyPairFromSignature(SIG_A).publicKey)).toBe(
      "2fc5625d130f201057e1229b9e96e57546df8109adc40d57864c022e5467ac51",
    );
    expect(KEY_DERIVATION_MESSAGE.startsWith("Chainome encryption key v1")).toBe(true);
  });
});

describe("wrapKey / unwrapKey", () => {
  const patient = keyPairFromSignature(SIG_A);
  const stranger = keyPairFromSignature(SIG_B);

  it("round-trips a data key for the intended recipient", () => {
    const dek = newDataKey();
    const wrapped = wrapKey(dek, bytesToHex(patient.publicKey));
    expect(bytesToHex(unwrapKey(wrapped, patient.privateKey))).toBe(bytesToHex(dek));
  });

  it("accepts a 0x-prefixed recipient key", () => {
    const dek = newDataKey();
    const wrapped = wrapKey(dek, "0x" + bytesToHex(patient.publicKey));
    expect(bytesToHex(unwrapKey(wrapped, patient.privateKey))).toBe(bytesToHex(dek));
  });

  it("uses a fresh ephemeral key and nonce every time", () => {
    const dek = newDataKey();
    const a = wrapKey(dek, bytesToHex(patient.publicKey));
    const b = wrapKey(dek, bytesToHex(patient.publicKey));
    expect(a.epk).not.toBe(b.epk);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("rejects the wrong private key", () => {
    const wrapped = wrapKey(newDataKey(), bytesToHex(patient.publicKey));
    expect(() => unwrapKey(wrapped, stranger.privateKey)).toThrow();
  });

  it("rejects a tampered ciphertext", () => {
    const wrapped = wrapKey(newDataKey(), bytesToHex(patient.publicKey));
    const flipped = (parseInt(wrapped.ct.slice(0, 2), 16) ^ 1).toString(16).padStart(2, "0");
    expect(() => unwrapKey({ ...wrapped, ct: flipped + wrapped.ct.slice(2) }, patient.privateKey)).toThrow();
  });

  it("rejects a swapped ephemeral key (binds epk into the KDF)", () => {
    const pk = bytesToHex(patient.publicKey);
    const a = wrapKey(newDataKey(), pk);
    const b = wrapKey(newDataKey(), pk);
    expect(() => unwrapKey({ ...a, epk: b.epk }, patient.privateKey)).toThrow();
  });

  it("serializes to hex strings only (safe to publish as JSON)", () => {
    const wrapped = wrapKey(newDataKey(), bytesToHex(patient.publicKey));
    for (const v of Object.values(wrapped)) expect(v).toMatch(/^[0-9a-f]+$/);
    expect(wrapped.epk).toHaveLength(64);
    expect(wrapped.iv).toHaveLength(24);
    expect(wrapped.ct).toHaveLength(96); // 32-byte key + 16-byte tag
  });
});

describe("newDataKey", () => {
  it("returns 32 random bytes", () => {
    const a = newDataKey();
    const b = newDataKey();
    expect(a).toHaveLength(32);
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
  });
});

describe("sealForRecipient / openSealed", () => {
  const patient = keyPairFromSignature(SIG_A);
  const stranger = keyPairFromSignature(SIG_B);
  const payload = new TextEncoder().encode(JSON.stringify({ cyp2c19: "poor", t2dBand: "elevated" }));

  it("round-trips a payload", () => {
    const sealed = sealForRecipient(payload, bytesToHex(patient.publicKey));
    expect(new TextDecoder().decode(openSealed(sealed, patient.privateKey))).toBe(new TextDecoder().decode(payload));
  });

  it("does not leak the plaintext in the sealed JSON", () => {
    const sealed = JSON.stringify(sealForRecipient(payload, bytesToHex(patient.publicKey)));
    expect(sealed).not.toContain("poor");
    expect(sealed).not.toContain("cyp2c19");
  });

  it("cannot be opened by someone else", () => {
    const sealed = sealForRecipient(payload, bytesToHex(patient.publicKey));
    expect(() => openSealed(sealed, stranger.privateKey)).toThrow();
  });
});
