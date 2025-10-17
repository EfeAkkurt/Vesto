import { NextRequest, NextResponse } from "next/server";
import { lighthouseUploadDagCbor, LighthouseUploadError, DEFAULT_GATEWAY } from "@/src/lib/ipfs/lighthouse";

export const runtime = "nodejs";

type DagPayload = {
  value: unknown;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Lighthouse API key not configured on the server." },
      { status: 500 },
    );
  }

  const gateway =
    (process.env.IPFS_GATEWAY ?? process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? DEFAULT_GATEWAY).trim() ||
    DEFAULT_GATEWAY;

  let payload: DagPayload;

  try {
    payload = (await request.json()) as DagPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!("value" in payload)) {
    return NextResponse.json({ error: "Missing value field" }, { status: 400 });
  }

  try {
    const result = await lighthouseUploadDagCbor(payload.value, apiKey, gateway);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = error instanceof LighthouseUploadError ? error : new LighthouseUploadError(500, "IPFS upload failed.");
    console.error("Lighthouse DAG upload failed", error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
