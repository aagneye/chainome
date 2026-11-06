import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/userop/<0x hash> — status of a World App user operation, proxied from the
 * Developer Portal so the browser avoids CORS. Returns { status, transaction_hash }.
 */
const PORTAL = "https://developer.world.org/api/v2/minikit/userop";

export async function GET(_req: NextRequest, { params }: { params: { hash: string } }) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(params.hash)) {
    return NextResponse.json({ error: "invalid user operation hash" }, { status: 400 });
  }
  const upstream = await fetch(`${PORTAL}/${params.hash}`, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: `Developer Portal returned ${upstream.status}` }, { status: 502 });
  }
  const body = await upstream.json();
  return NextResponse.json({ status: body.status ?? null, transaction_hash: body.transaction_hash ?? null });
}
