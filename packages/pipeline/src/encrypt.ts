import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { SEGMENT_MAGIC } from "@genomechain/shared/manifest";

export interface EncryptedFile {
  path: string;
  plainBytes: number;
  cipherBytes: number;
  sha256Plain: string;
  sha256Cipher: string;
}

/**
 * Stream-encrypt one file: "GCv1" | nonce(12) | AES-256-GCM ciphertext | tag(16).
 * This is the layout WebCrypto decrypts in one call (ciphertext || tag, iv separate).
 */
export async function encryptFile(input: string, output: string, dek: Uint8Array): Promise<EncryptedFile> {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const hPlain = createHash("sha256");
  const hCipher = createHash("sha256");
  const out = createWriteStream(output);

  const header = Buffer.concat([Buffer.from(SEGMENT_MAGIC, "ascii"), iv]);
  out.write(header);
  hCipher.update(header);

  const tap = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      hPlain.update(chunk);
      const ct = cipher.update(chunk);
      hCipher.update(ct);
      cb(null, ct);
    },
    flush(cb) {
      const last = cipher.final();
      const tag = cipher.getAuthTag();
      hCipher.update(last);
      hCipher.update(tag);
      this.push(last);
      this.push(tag);
      cb();
    },
  });

  await pipeline(createReadStream(input), tap, out);
  return {
    path: output,
    plainBytes: (await stat(input)).size,
    cipherBytes: (await stat(output)).size,
    sha256Plain: hPlain.digest("hex"),
    sha256Cipher: hCipher.digest("hex"),
  };
}
