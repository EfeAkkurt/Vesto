import { NextRequest, NextResponse } from "next/server";
import { BridgeError, processLock } from "@/src/lib/bridge/service";

export const runtime = "nodejs";

const jsonError = (status: number, code: string, message: string, hint?: string) =>
  NextResponse.json({ error: { code, message, hint } }, { status });

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const amount = typeof payload.amount === "string" ? payload.amount : String(payload.amount ?? "");
  const asset = typeof payload.asset === "string" ? payload.asset : "XLM";
  const recipient = typeof payload.recipient === "string" ? payload.recipient : "";
  const chain = payload.chain === "EVM" ? "EVM" : "EVM";

  try {
    const result = await processLock({
      amount,
      asset: asset as "XLM" | "SUSD",
      recipient,
      chain,
    });
    return NextResponse.json({
      hash: result.txHash,
      cid: result.cid,
      memoHashHex: result.memoHashHex,
    });
  } catch (error) {
    if (error instanceof BridgeError) {
      return jsonError(error.status, error.code, error.message, error.hint);
    }
    console.error("[bridge:lock:error]", error);
    return jsonError(500, "unexpected", "Failed to process bridge lock request.");
  }
}
