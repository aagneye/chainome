/**
 * Patient-side read: fetch one encrypted segment (Swarm or local file), unwrap its key
 * with the patient's signature-derived key, decrypt, and check both hashes.
 *
 *   pnpm --filter pipeline run verify -- --manifest <swarmRef | manifest.json> --chrom chr22 \
 *        --signature 0x<signature of KEY_DERIVATION_MESSAGE> [--segment-file chr22.vcf.gz.enc] [--out chr22.vcf.gz]
 */
import { createDecipheriv, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { Bee } from "@ethersphere/bee-js";
import { keyPairFromSignature, unwrapKey } from "@chainome/shared/keys";
import { SEGMENT_HEADER_BYTES, SEGMENT_MAGIC, type GenomeManifest } from "@chainome/shared/manifest";
import { env } from "./config";

const { values } = parseArgs({
  options: {
    manifest: { type: "string" },
    chrom: { type: "string", default: "chr22" },
    signature: { type: "string" },
    "segment-file": { type: "string" },
    out: { type: "string" },
  },
});
if (!values.manifest || !values.signature) {
  console.error("pass --manifest <swarmRef|path> and --signature 0x…");
  process.exit(1);
}

const isRef = /^[0-9a-f]{64}$/i.test(values.manifest.replace(/^0x/, ""));
const bee = new Bee(env.beeUrl);
const manifest: GenomeManifest = isRef
  ? JSON.parse((await bee.data.download(values.manifest)).toUtf8())
  : JSON.parse(await readFile(values.manifest, "utf8"));

const seg = manifest.segments.find((s) => s.chrom === values.chrom);
if (!seg) throw new Error(`${values.chrom} not in manifest`);

const blob = values["segment-file"]
  ? await readFile(values["segment-file"])
  : Buffer.from((await bee.data.download(seg.swarmRef)).toUint8Array());

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const cipherOk = sha(blob) === seg.sha256Cipher;

if (blob.subarray(0, 4).toString("ascii") !== SEGMENT_MAGIC) throw new Error("not a Chainome segment");
const { privateKey } = keyPairFromSignature(values.signature);
const dek = unwrapKey(seg.wrappedKey, privateKey);
const iv = blob.subarray(4, SEGMENT_HEADER_BYTES);
const tag = blob.subarray(blob.length - 16);
const decipher = createDecipheriv("aes-256-gcm", dek, iv);
decipher.setAuthTag(tag);
const plain = Buffer.concat([decipher.update(blob.subarray(SEGMENT_HEADER_BYTES, blob.length - 16)), decipher.final()]);
const plainOk = sha(plain) === seg.sha256Plain;

const out = values.out ?? `${values.chrom}.decrypted.vcf.gz`;
await writeFile(out, plain);
console.log(JSON.stringify({ chrom: seg.chrom, swarmRef: seg.swarmRef, bytes: plain.length, cipherHashOk: cipherOk, plainHashOk: plainOk, out }, null, 2));
if (!cipherOk || !plainOk) process.exit(2);
