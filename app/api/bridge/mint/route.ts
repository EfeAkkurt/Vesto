import { NextRequest, NextResponse } from "next/server";
import { BridgeError, processMint } from "@/src/lib/bridge/service";

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
  const targetAccount =
    typeof payload.targetAccount === "string" ? payload.targetAccount : String(payload.targetAccount ?? "");

  let proofCidRaw = "";
  if (typeof payload.lockProofCid === "string") {
    proofCidRaw = payload.lockProofCid;
  } else if (typeof payload.evmLockProofCid === "string") {
    proofCidRaw = payload.evmLockProofCid;
  } else if (payload.lockProofCid != null || payload.evmLockProofCid != null) {
    proofCidRaw = String(payload.lockProofCid ?? payload.evmLockProofCid ?? "");
  }
  const proofCid = proofCidRaw.trim();

  try {
    const result = await processMint({
      amount,
      targetAccount,
      evmLockProofCid: proofCid,
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
    console.error("[bridge:mint:error]", error);
    return jsonError(500, "unexpected", "Failed to process bridge mint request.");
  }
}
