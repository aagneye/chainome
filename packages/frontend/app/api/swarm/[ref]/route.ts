import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/swarm/<64-hex ref> — streams raw bytes from Swarm (/bytes endpoint).
 * Proxied so the browser needs neither the Bee node's address nor CORS on it.
 * Everything served here is ciphertext or the public manifest.
 */
const SWARM = (process.env.SWARM_GATEWAY ?? process.env.NEXT_PUBLIC_SWARM_GATEWAY ?? "https://api.gateway.ethswarm.org").replace(/\/$/, "");

export async function GET(_req: NextRequest, { params }: { params: { ref: string } }) {
  const ref = params.ref.replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/i.test(ref)) {
    return NextResponse.json({ error: "invalid Swarm reference" }, { status: 400 });
  }
  const upstream = await fetch(`${SWARM}/bytes/${ref}`, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Swarm returned ${upstream.status}` }, { status: 502 });
  }
  return new NextResponse(upstream.body, {
    headers: {
      "content-type": "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable", // content-addressed
    },
  });
}
