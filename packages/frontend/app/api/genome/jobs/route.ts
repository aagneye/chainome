import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { pipelineApi } from "@/lib/pipeline-api";

/**
 * POST /api/genome/jobs — { patient, patientPubKey, nullifier? } → { jobId, uploadUrl, expiresAt, maxBytes }
 * Creates a processing job on the lab node. The browser then PUTs the VCF straight to uploadUrl.
 */
export async function POST(req: NextRequest) {
  const api = pipelineApi();
  if (!api) return NextResponse.json({ error: "Genome processing is not configured (PIPELINE_API_URL, PIPELINE_API_TOKEN)" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { patient, patientPubKey, nullifier } = body as Record<string, string | undefined>;
  if (!patient || !isAddress(patient)) return NextResponse.json({ error: "patient must be a wallet address" }, { status: 400 });
  if (!patientPubKey || !/^(0x)?[0-9a-f]{64}$/i.test(patientPubKey)) return NextResponse.json({ error: "patientPubKey must be 32-byte hex" }, { status: 400 });

  try {
    const res = await api.request("/jobs", { method: "POST", body: JSON.stringify({ patient, patientPubKey, nullifier }) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err) {
    console.error("[api/genome/jobs]", err);
    return NextResponse.json({ error: "Lab node unreachable" }, { status: 502 });
  }
}
