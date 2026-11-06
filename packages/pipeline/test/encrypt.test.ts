import { createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SEGMENT_HEADER_BYTES, SEGMENT_MAGIC } from "@chainome/shared/manifest";
import { encryptFile } from "../src/encrypt";

let dir: string;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

function decrypt(blob: Buffer, dek: Uint8Array): Buffer {
  const iv = blob.subarray(4, SEGMENT_HEADER_BYTES);
  const tag = blob.subarray(blob.length - 16);
  const d = createDecipheriv("aes-256-gcm", dek, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(blob.subarray(SEGMENT_HEADER_BYTES, blob.length - 16)), d.final()]);
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "gc-encrypt-"));
});

describe("encryptFile", () => {
  it.each([0, 1, 65_536, 3 * 1024 * 1024 + 7])("round-trips %i bytes and reports correct sizes and hashes", async (size) => {
    const plain = randomBytes(size);
    const dek = randomBytes(32);
    await writeFile(join(dir, `p${size}`), plain);
    const res = await encryptFile(join(dir, `p${size}`), join(dir, `c${size}`), dek);
    const blob = await readFile(res.path);

    expect(blob.subarray(0, 4).toString("ascii")).toBe(SEGMENT_MAGIC);
    expect(res.plainBytes).toBe(size);
    expect(res.cipherBytes).toBe(size + SEGMENT_HEADER_BYTES + 16);
    expect(res.cipherBytes).toBe(blob.length);
    expect(res.sha256Plain).toBe(sha(plain));
    expect(res.sha256Cipher).toBe(sha(blob));
    expect(decrypt(blob, dek).equals(plain)).toBe(true);
  });

  it("uses a fresh nonce per file (same key, same plaintext → different ciphertext)", async () => {
    const plain = Buffer.from("chr22\t15221405\t.\tTC\tT\n".repeat(100));
    const dek = randomBytes(32);
    await writeFile(join(dir, "same"), plain);
    const a = await encryptFile(join(dir, "same"), join(dir, "same.a"), dek);
    const b = await encryptFile(join(dir, "same"), join(dir, "same.b"), dek);
    expect(a.sha256Cipher).not.toBe(b.sha256Cipher);
    expect(a.sha256Plain).toBe(b.sha256Plain);
  });

  it("does not leave plaintext readable in the ciphertext", async () => {
    const marker = "PATIENT_SAMPLE_NAME_SHOULD_NOT_APPEAR";
    await writeFile(join(dir, "marker"), marker.repeat(50));
    const res = await encryptFile(join(dir, "marker"), join(dir, "marker.enc"), randomBytes(32));
    expect((await readFile(res.path)).toString("latin1")).not.toContain(marker);
  });

  it("fails authentication with the wrong key or a flipped byte", async () => {
    const plain = randomBytes(4096);
    const dek = randomBytes(32);
    await writeFile(join(dir, "auth"), plain);
    const res = await encryptFile(join(dir, "auth"), join(dir, "auth.enc"), dek);
    const blob = await readFile(res.path);

    expect(() => decrypt(blob, randomBytes(32))).toThrow();
    const tampered = Buffer.from(blob);
    tampered[SEGMENT_HEADER_BYTES + 10] ^= 0x01;
    expect(() => decrypt(tampered, dek)).toThrow();
  });
});
