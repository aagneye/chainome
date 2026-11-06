import { NextRequest, NextResponse } from "next/server";
import { pipelineApi } from "@/lib/pipeline-api";

/** GET /api/genome/jobs/<id> — processing status from the lab node. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "invalid job id" }, { status: 400 });
  const api = pipelineApi();
  if (!api) return NextResponse.json({ error: "Genome processing is not configured" }, { status: 503 });
  try {
    const res = await api.request(`/jobs/${params.id}`);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "Lab node unreachable" }, { status: 502 });
  }
}
