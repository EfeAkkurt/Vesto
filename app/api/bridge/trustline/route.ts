import { NextRequest, NextResponse } from "next/server";
import { hasSusdTrustline } from "@/src/lib/bridge/trust";

export const runtime = "nodejs";

const jsonError = (status: number, message: string) =>
  NextResponse.json({ error: { message } }, { status });

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const accountId = typeof payload.accountId === "string" ? payload.accountId.trim() : "";
  if (!accountId) {
    return jsonError(400, "accountId is required.");
  }

  try {
    const hasTrustline = await hasSusdTrustline(accountId);
    return NextResponse.json({ hasTrustline });
  } catch (error) {
    console.error("[bridge:trustline:error]", error);
    return jsonError(500, "Failed to evaluate trustline.");
  }
}
