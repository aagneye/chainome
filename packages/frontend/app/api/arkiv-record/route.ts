import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/arkiv-record
 * Writes a medical record metadata entity to Arkiv.
 * Raw file is already on Lighthouse (IPFS). We store structured metadata here.
 *
 * Arkiv: Web3 DB-chain. Entities owned by wallet, queryable with SQL filters.
 * Docs: https://docs.arkiv.network
 */

interface ArkivRecordInput {
  ownerAddress:   string;   // patient wallet
  nullifierHash:  string;   // anonymous ID (from World ID)
  recordType:     string;   // "lab_report" | "prescription" | "imaging" | "bill" | "genome"
  cid:            string;   // IPFS CID of encrypted file
  date:           string;   // ISO date string
  institution?:   string;   // hospital/lab name
  icd10Category?: string;   // e.g. "metabolic", "cardiovascular"
  tags?:          string[]; // e.g. ["diabetes", "insulin"]
}

// Arkiv entity schema for medical records
// Entity: { owner, type, cid, date, institution, icd10Category, tags, expiresAt }
// Owner = patient wallet. CID = encrypted file. Everything else is queryable metadata.

async function writeToArkiv(record: ArkivRecordInput): Promise<{ entityId: string }> {
  const apiKey = process.env.ARKIV_API_KEY;

  if (!apiKey) {
    // Stub mode: generate deterministic entity ID
    const stubId = `arkiv_stub_${Buffer.from(record.cid).toString("hex").slice(0, 16)}`;
    return { entityId: stubId };
  }

  // Real Arkiv write via JSON-RPC API
  // See: https://docs.arkiv.network
  const response = await fetch("https://testnet.arkiv.network/rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method:  "arkiv_createEntity",
      params: [{
        schema: "medical_record_v1",
        owner:  record.ownerAddress,
        fields: {
          type:          record.recordType,
          cid:           record.cid,
          date:          record.date,
          institution:   record.institution ?? "",
          icd10Category: record.icd10Category ?? "",
          tags:          record.tags ?? [],
          // nullifier stored for anonymous cross-referencing, not linkable to identity
          anonymousId:   record.nullifierHash.slice(0, 16), // partial — not full nullifier
        },
        // Record expires in 10 years — patient can renew consent
        expiresAt: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600,
      }],
      id: 1,
    }),
  });

  if (!response.ok) throw new Error(`Arkiv API error: ${response.status}`);
  const data = await response.json();
  return { entityId: data.result?.entityId ?? "unknown" };
}

export async function POST(req: NextRequest) {
  try {
    const body: ArkivRecordInput = await req.json();
    if (!body.ownerAddress || !body.cid || !body.recordType) {
      return NextResponse.json({ error: "ownerAddress, cid, recordType required" }, { status: 400 });
    }
    const result = await writeToArkiv(body);
    return NextResponse.json({ ...result, source: process.env.ARKIV_API_KEY ? "arkiv" : "stub" });
  } catch (err) {
    console.error("[arkiv-record]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
