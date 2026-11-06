import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { getGenomeForPatient } from "@/lib/arkiv-server";

/** GET /api/genome?patient=0x… — the patient's genome dataset, segments and sealed features, read from Arkiv. */
export async function GET(req: NextRequest) {
  const patient = req.nextUrl.searchParams.get("patient");
  if (!patient || !isAddress(patient)) {
    return NextResponse.json({ error: "patient must be a wallet address" }, { status: 400 });
  }
  try {
    const genome = await getGenomeForPatient(patient);
    return NextResponse.json({ genome });
  } catch (err) {
    console.error("[api/genome]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Arkiv query failed" }, { status: 502 });
  }
}
