import { randomBytes } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bytesToHex, keyPairFromSignature, newDataKey, sealForRecipient, wrapKey } from "@chainome/shared/keys";
import type { GenomeManifest } from "@chainome/shared/manifest";
import {
  downloadAndDecrypt,
  encryptForPatient,
  fetchManifest,
  openFeatures,
  patientKeyFromSignature,
  publicKeyHex,
} from "@/lib/genome-crypto";
// The lab pipeline's streaming encryptor — the browser must decrypt exactly what it writes.
import { encryptFile } from "../../pipeline/src/encrypt";

const patient = patientKeyFromSignature("0x" + "ab".repeat(65));
const stranger = patientKeyFromSignature("0x" + "cd".repeat(65));

function serve(files: Record<string, Uint8Array | object>) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const ref = url.split("/").pop()!;
    const body = files[ref];
    if (!body) return new Response("not found", { status: 404 });
    return body instanceof Uint8Array ? new Response(body as BodyInit) : Response.json(body);
  }));
}

function manifestFor(seg: { chrom: string; swarmRef: string; sha256Plain: string; sha256Cipher: string; wrappedKey: ReturnType<typeof wrapKey> }): GenomeManifest {
  return {
    version: 1, createdAt: "", patient: "0x0", patientPublicKey: publicKeyHex(patient), anonId: "",
    source: { format: "vcf", build: "GRCh38", sha256: "", bytes: 0 }, build: "GRCh38",
    qc: { variantCount: 0, snps: 0, indels: 0, titv: 0, hetHom: 0, hasRefCalls: false, pass: true, notes: [] },
    pipeline: { version: "", tools: {}, steps: [] },
    segments: [{ ...seg, variantCount: 1, plainBytes: 0, cipherBytes: 0 }],
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("patient key", () => {
  it("matches the shared derivation (same key the lab wraps to)", () => {
    expect(publicKeyHex(patient)).toBe(bytesToHex(keyPairFromSignature("0x" + "ab".repeat(65)).publicKey));
  });
});

describe("encryptForPatient → downloadAndDecrypt (browser round trip)", () => {
  it("decrypts a browser-encrypted record and verifies both hashes", async () => {
    const text = "Lab report: HbA1c 6.1%\n";
    const sealed = await encryptForPatient(new File([text], "report.txt"), publicKeyHex(patient));
    expect(new TextDecoder().decode(sealed.cipher.subarray(0, 4))).toBe("GCv1");
    expect(sealed.plainBytes).toBe(text.length);

    const ref = "aa".repeat(32);
    serve({ [ref]: sealed.cipher });
    const m = manifestFor({ chrom: "rec", swarmRef: ref, sha256Plain: sealed.sha256Plain, sha256Cipher: sealed.sha256Cipher, wrappedKey: sealed.wrappedKey });
    const check = await downloadAndDecrypt(m, "rec", patient);
    expect(check).toMatchObject({ cipherHashOk: true, plainHashOk: true, bytes: text.length });
    expect(await check.plaintext.text()).toBe(text);
  });

  it("never puts the plaintext in the ciphertext", async () => {
    const sealed = await encryptForPatient(new File(["JOHN DOE diabetic"], "x"), publicKeyHex(patient));
    expect(new TextDecoder("latin1").decode(sealed.cipher)).not.toContain("JOHN DOE");
  });
});

describe("pipeline segment → browser decrypt (cross-package format)", () => {
  it("WebCrypto decrypts what the lab's Node stream encryptor wrote", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gc-xpkg-"));
    const plain = randomBytes(200_000);
    await writeFile(join(dir, "chr22.vcf.gz"), plain);
    const dek = newDataKey();
    const enc = await encryptFile(join(dir, "chr22.vcf.gz"), join(dir, "chr22.vcf.gz.enc"), dek);
    const { readFile } = await import("node:fs/promises");
    const cipher = new Uint8Array(await readFile(enc.path));

    const ref = "bb".repeat(32);
    serve({ [ref]: cipher });
    const m = manifestFor({ chrom: "chr22", swarmRef: ref, sha256Plain: enc.sha256Plain, sha256Cipher: enc.sha256Cipher, wrappedKey: wrapKey(dek, publicKeyHex(patient)) });
    const check = await downloadAndDecrypt(m, "chr22", patient);
    expect(check.cipherHashOk && check.plainHashOk).toBe(true);
    expect(Buffer.from(await check.plaintext.arrayBuffer()).equals(plain)).toBe(true);
  });
});

describe("downloadAndDecrypt failures", () => {
  async function setup() {
    const sealed = await encryptForPatient(new File(["chr1\t100\t.\tA\tG\n"], "x"), publicKeyHex(patient));
    const ref = "cc".repeat(32);
    const m = manifestFor({ chrom: "chr1", swarmRef: ref, sha256Plain: sealed.sha256Plain, sha256Cipher: sealed.sha256Cipher, wrappedKey: sealed.wrappedKey });
    return { sealed, ref, m };
  }

  it("refuses another person's key", async () => {
    const { sealed, ref, m } = await setup();
    serve({ [ref]: sealed.cipher });
    await expect(downloadAndDecrypt(m, "chr1", stranger)).rejects.toThrow();
  });

  it("rejects tampered ciphertext (hash and GCM tag)", async () => {
    const { sealed, ref, m } = await setup();
    const bad = sealed.cipher.slice();
    bad[20] ^= 1;
    serve({ [ref]: bad });
    await expect(downloadAndDecrypt(m, "chr1", patient)).rejects.toThrow();
  });

  it("rejects a non-Chainome payload", async () => {
    const { ref, m } = await setup();
    serve({ [ref]: new TextEncoder().encode("plain text pretending to be a segment") });
    await expect(downloadAndDecrypt(m, "chr1", patient)).rejects.toThrow(/Not a Chainome segment/);
  });

  it("reports Swarm errors and unknown chromosomes", async () => {
    const { m } = await setup();
    serve({});
    await expect(downloadAndDecrypt(m, "chr1", patient)).rejects.toThrow(/Swarm returned 404/);
    await expect(downloadAndDecrypt(m, "chrX", patient)).rejects.toThrow(/not in this genome/);
  });
});

describe("fetchManifest and openFeatures", () => {
  it("loads the manifest JSON through the Swarm proxy", async () => {
    serve({ ["dd".repeat(32)]: { version: 1, segments: [] } });
    expect(await fetchManifest("dd".repeat(32))).toEqual({ version: 1, segments: [] });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`/api/swarm/${"dd".repeat(32)}`);
  });

  it("throws a clear error when the manifest is missing", async () => {
    serve({});
    await expect(fetchManifest("ee".repeat(32))).rejects.toThrow(/Manifest not available/);
  });

  it("opens features sealed by the pipeline, only with the patient key", () => {
    const summary = { cyp2c19: "normal", cyp2c9: "normal", slco1b1: "normal", t2dBand: "elevated", calls: [], notes: [] };
    const sealed = JSON.stringify(sealForRecipient(new TextEncoder().encode(JSON.stringify(summary)), publicKeyHex(patient)));
    expect(openFeatures(sealed, patient)).toEqual(summary);
    expect(() => openFeatures(sealed, stranger)).toThrow();
  });
});
