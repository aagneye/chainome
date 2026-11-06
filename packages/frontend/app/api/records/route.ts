import { NextRequest, NextResponse } from "next/server";
import { Bee } from "@ethersphere/bee-js";
import { createWalletClient, ExpirationTime } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { addr, u64 } from "@arkiv-network/sdk/schema";
import { http, isAddress, isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MedicalRecord, type RecordManifest } from "@chainome/shared/arkiv";

/**
 * POST /api/records — multipart { cipher: Blob, meta: JSON }.
 *
 * The browser has already encrypted the file to the patient's key; this route only
 * ever sees ciphertext. It stores the ciphertext and a record manifest on Swarm,
 * indexes the record on Arkiv, and returns the manifest ref for RecordVault.addRecord.
 */
const MAX_CIPHER_BYTES = 25 * 1024 * 1024;
const RECORD_TYPES = new Set(["lab_report", "prescription", "imaging", "vaccination", "clinical_notes", "other"]);

interface Meta {
  patient: string;
  anonId: string;
  recordType: string;
  mimeType: string;
  plainBytes: number;
  sha256Plain: string;
  sha256Cipher: string;
  wrappedKey: RecordManifest["wrappedKey"];
}

export async function POST(req: NextRequest) {
  const beeUrl = process.env.BEE_URL;
  const batchId = process.env.SWARM_BATCH_ID;
  const arkivKey = process.env.ARKIV_PRIVATE_KEY;
  if (!beeUrl || !batchId || !arkivKey || !isHex(arkivKey)) {
    return NextResponse.json({ error: "Server storage not configured (BEE_URL, SWARM_BATCH_ID, ARKIV_PRIVATE_KEY)" }, { status: 503 });
  }

  const form = await req.formData();
  const cipher = form.get("cipher");
  const metaRaw = form.get("meta");
  if (!(cipher instanceof Blob) || typeof metaRaw !== "string") {
    return NextResponse.json({ error: "expected multipart fields 'cipher' and 'meta'" }, { status: 400 });
  }
  if (cipher.size > MAX_CIPHER_BYTES) return NextResponse.json({ error: "record too large (25 MB max)" }, { status: 413 });

  const meta: Meta = JSON.parse(metaRaw);
  if (!isAddress(meta.patient) || !RECORD_TYPES.has(meta.recordType)) {
    return NextResponse.json({ error: "invalid patient or recordType" }, { status: 400 });
  }
  const bytes = new Uint8Array(await cipher.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== "GCv1") {
    return NextResponse.json({ error: "payload is not Chainome ciphertext — refusing to store plaintext" }, { status: 400 });
  }

  try {
    // BEE_PROXY_TOKEN: the lab node exposes Bee at https://<lab>/bee behind a bearer token.
    const bee = new Bee(beeUrl, process.env.BEE_PROXY_TOKEN ? { headers: { authorization: `Bearer ${process.env.BEE_PROXY_TOKEN}` } } : undefined);
    const fileRef = (await bee.data.upload(batchId, bytes, { pin: true })).reference.toHex();
    const manifest: RecordManifest = {
      version: 1,
      fileRef,
      mimeType: meta.mimeType,
      plainBytes: meta.plainBytes,
      cipherBytes: bytes.length,
      sha256Plain: meta.sha256Plain,
      sha256Cipher: meta.sha256Cipher,
      wrappedKey: meta.wrappedKey,
    };
    const manifestRef = (await bee.data.upload(batchId, JSON.stringify(manifest), { pin: true })).reference.toHex();

    const wallet = createWalletClient({
      chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" }),
      transport: http(),
      account: privateKeyToAccount(arkivKey),
    });
    const { entityKey, txHash } = await wallet.createEntity(
      MedicalRecord,
      {
        patient: addr(meta.patient),
        anonId: meta.anonId.slice(0, 16) || "unverified",
        recordType: meta.recordType,
        date: new Date().toISOString().slice(0, 10),
        mimeType: meta.mimeType.slice(0, 100) || "application/octet-stream",
        cipherBytes: u64(BigInt(bytes.length)),
        manifestRef,
      },
      { expiration: ExpirationTime.fromDays(180) },
    );

    return NextResponse.json({ manifestRef, fileRef, entityKey, arkivTx: txHash });
  } catch (err) {
    console.error("[api/records]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Storage failed" }, { status: 502 });
  }
}
