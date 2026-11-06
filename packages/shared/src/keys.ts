/**
 * Key handling shared by the pipeline (Node) and the browser.
 *
 * - Each genome segment is encrypted with its own random 256-bit data key (DEK).
 * - The patient's X25519 key pair is derived from a wallet signature over a fixed
 *   message, so the patient needs no extra secret to back up.
 * - DEKs are wrapped to an X25519 public key (ephemeral ECDH → HKDF-SHA256 → AES-256-GCM).
 *   Wrapped keys are safe to publish (manifest on Swarm, access grants on Arkiv).
 */
import { x25519 } from "@noble/curves/ed25519.js";
import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";

/** The message a patient signs to derive their encryption key. Changing it changes every key. */
export const KEY_DERIVATION_MESSAGE =
  "GenomeChain encryption key v1\n\nSigning this derives your private genome decryption key. It costs nothing and sends no transaction.";

const WRAP_INFO = utf8ToBytes("genomechain/wrap-dek/v1");

export interface WrappedKey {
  /** ephemeral X25519 public key, hex */
  epk: string;
  /** AES-GCM nonce, hex */
  iv: string;
  /** wrapped DEK + GCM tag, hex */
  ct: string;
}

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

/** Derive the patient's X25519 key pair from their wallet signature (hex string). */
export function keyPairFromSignature(signatureHex: string): KeyPair {
  const sig = hexToBytes(signatureHex.replace(/^0x/, ""));
  const privateKey = hkdf(sha256, sig, undefined, utf8ToBytes("genomechain/x25519/v1"), 32);
  return { privateKey, publicKey: x25519.getPublicKey(privateKey) };
}

export function newDataKey(): Uint8Array {
  return randomBytes(32);
}

export function wrapKey(dek: Uint8Array, recipientPublicKeyHex: string): WrappedKey {
  const recipient = hexToBytes(recipientPublicKeyHex.replace(/^0x/, ""));
  const ephemeral = x25519.utils.randomSecretKey();
  const epk = x25519.getPublicKey(ephemeral);
  const kek = hkdf(sha256, x25519.getSharedSecret(ephemeral, recipient), epk, WRAP_INFO, 32);
  const iv = randomBytes(12);
  const ct = gcm(kek, iv).encrypt(dek);
  return { epk: bytesToHex(epk), iv: bytesToHex(iv), ct: bytesToHex(ct) };
}

export function unwrapKey(wrapped: WrappedKey, recipientPrivateKey: Uint8Array): Uint8Array {
  const epk = hexToBytes(wrapped.epk);
  const kek = hkdf(sha256, x25519.getSharedSecret(recipientPrivateKey, epk), epk, WRAP_INFO, 32);
  return gcm(kek, hexToBytes(wrapped.iv)).decrypt(hexToBytes(wrapped.ct));
}

/** Encrypt a small payload (e.g. feature JSON) so only the recipient can read it. */
export function sealForRecipient(plaintext: Uint8Array, recipientPublicKeyHex: string) {
  const dek = newDataKey();
  const iv = randomBytes(12);
  return {
    wrappedKey: wrapKey(dek, recipientPublicKeyHex),
    iv: bytesToHex(iv),
    ct: bytesToHex(gcm(dek, iv).encrypt(plaintext)),
  };
}

export function openSealed(blob: { wrappedKey: WrappedKey; iv: string; ct: string }, recipientPrivateKey: Uint8Array) {
  const dek = unwrapKey(blob.wrappedKey, recipientPrivateKey);
  return gcm(dek, hexToBytes(blob.iv)).decrypt(hexToBytes(blob.ct));
}

export { bytesToHex, hexToBytes };
