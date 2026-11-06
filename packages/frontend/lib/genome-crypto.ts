"use client";

/**
 * Browser side of the patient key: derive it from a wallet signature, unwrap a
 * segment's data key, decrypt with WebCrypto and check hashes against Arkiv/manifest.
 * The private key only ever lives in memory for the current page.
 */
import { keyPairFromSignature, openSealed, unwrapKey, wrapKey, bytesToHex } from "@chainome/shared/keys";
import { SEGMENT_HEADER_BYTES, SEGMENT_MAGIC, type GenomeManifest } from "@chainome/shared/manifest";
import type { EncryptedBlob, FeatureSummary } from "@chainome/shared/arkiv";

export { KEY_DERIVATION_MESSAGE } from "@chainome/shared/keys";

export type PatientKey = ReturnType<typeof keyPairFromSignature>;

export function patientKeyFromSignature(signature: string): PatientKey {
  return keyPairFromSignature(signature);
}

export function publicKeyHex(key: PatientKey): string {
  return bytesToHex(key.publicKey);
}

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

export async function fetchManifest(manifestRef: string): Promise<GenomeManifest> {
  const res = await fetch(`/api/swarm/${manifestRef}`);
  if (!res.ok) throw new Error(`Manifest not available from Swarm (${res.status})`);
  return res.json();
}

export interface SegmentCheck {
  chrom: string;
  bytes: number;
  cipherHashOk: boolean;
  plainHashOk: boolean;
  plaintext: Blob;
}

/** Download one segment from Swarm, verify, decrypt, verify again. */
export async function downloadAndDecrypt(
  manifest: GenomeManifest,
  chrom: string,
  key: PatientKey,
): Promise<SegmentCheck> {
  const seg = manifest.segments.find((s) => s.chrom === chrom);
  if (!seg) throw new Error(`${chrom} is not in this genome`);

  const res = await fetch(`/api/swarm/${seg.swarmRef}`);
  if (!res.ok) throw new Error(`Swarm returned ${res.status} for ${chrom}`);
  const blob = new Uint8Array(await res.arrayBuffer());
  const cipherHashOk = (await sha256Hex(blob)) === seg.sha256Cipher;

  if (new TextDecoder().decode(blob.subarray(0, 4)) !== SEGMENT_MAGIC) throw new Error("Not a Chainome segment");
  const dek = unwrapKey(seg.wrappedKey, key.privateKey);
  const aes = await crypto.subtle.importKey("raw", dek as BufferSource, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: blob.subarray(4, SEGMENT_HEADER_BYTES) as BufferSource },
    aes,
    blob.subarray(SEGMENT_HEADER_BYTES) as BufferSource, // ciphertext || tag
  );
  const plainHashOk = (await sha256Hex(plain)) === seg.sha256Plain;

  return { chrom, bytes: plain.byteLength, cipherHashOk, plainHashOk, plaintext: new Blob([plain], { type: "application/gzip" }) };
}

/** Encrypt a file in the browser to the patient's key, in the same "GCv1" layout as genome segments. */
export async function encryptForPatient(file: File, patientPublicKeyHex: string) {
  const plain = new Uint8Array(await file.arrayBuffer());
  const dek = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aes = await crypto.subtle.importKey("raw", dek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, plain));
  const cipher = new Uint8Array(SEGMENT_HEADER_BYTES + ct.length);
  cipher.set(new TextEncoder().encode(SEGMENT_MAGIC), 0);
  cipher.set(iv, 4);
  cipher.set(ct, SEGMENT_HEADER_BYTES);
  return {
    cipher,
    plainBytes: plain.length,
    sha256Plain: await sha256Hex(plain),
    sha256Cipher: await sha256Hex(cipher),
    wrappedKey: wrapKey(dek, patientPublicKeyHex),
  };
}

/** Open the encrypted feature summary stored in Arkiv. */
export function openFeatures(sealedJson: string, key: PatientKey): FeatureSummary {
  const blob: EncryptedBlob = JSON.parse(sealedJson);
  return JSON.parse(new TextDecoder().decode(openSealed(blob, key.privateKey)));
}
