import { NextRequest, NextResponse } from "next/server";
import { lighthouseUploadFile, LighthouseUploadError, DEFAULT_GATEWAY } from "@/src/lib/ipfs/lighthouse";

export const runtime = "nodejs";

const resolveGateway = () =>
  (process.env.IPFS_GATEWAY ?? process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? DEFAULT_GATEWAY).trim() ||
  DEFAULT_GATEWAY;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Lighthouse API key not configured on the server." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file payload" }, { status: 400 });
  }

  try {
    const result = await lighthouseUploadFile(file, apiKey, resolveGateway());
    return NextResponse.json(result);
  } catch (error) {
    const mapped = error instanceof LighthouseUploadError ? error : new LighthouseUploadError(500, "IPFS upload failed.");
    console.error("Lighthouse file upload failed", error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
