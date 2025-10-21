import "server-only";

import { Buffer } from "buffer";
import { NextRequest, NextResponse } from "next/server";
import StellarSdk from "stellar-sdk";
import { uploadReserveJson, MANAGE_DATA_KEY } from "@/src/lib/spv/reserve";
import { cidToBase64 } from "@/src/lib/spv/hash";
import { debugObj } from "@/src/lib/logging/logger";
import { getNetworkPassphrase, getServer, getSpvKeypair, getSpvPublic } from "@/src/lib/stellar/sdk.server";
import type { ReserveProofPayload } from "@/src/lib/types/spv";

export const runtime = "nodejs";

const json = (status: number, payload: unknown) => NextResponse.json(payload, { status });

const isReservePayload = (value: unknown): value is ReserveProofPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.schema === "vesto.reserve@1" &&
    typeof payload.week === "number" &&
    typeof payload.reserveUSD === "number" &&
    typeof payload.spvBalanceXLM === "string" &&
    typeof payload.spvBalanceSUSD === "string" &&
    typeof payload.asOf === "string" &&
    typeof payload.lastTx === "string"
  );
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, reason: "invalid-json" });
  }

  if (!body || typeof body !== "object" || !("payload" in (body as Record<string, unknown>))) {
    return json(400, { ok: false, reason: "missing-payload" });
  }

  const payload = (body as { payload?: unknown }).payload;
  if (!isReservePayload(payload)) {
    return json(400, { ok: false, reason: "invalid-payload" });
  }

  const server = getServer() as {
    loadAccount(accountId: string): Promise<unknown>;
    fetchBaseFee(): Promise<number>;
    submitTransaction(tx: unknown): Promise<{ hash?: string; id?: string }>;
  };
  const networkPassphrase = getNetworkPassphrase();

  let spvPublic: string;
  try {
    spvPublic = getSpvPublic();
  } catch (error) {
    return json(500, { ok: false, reason: "missing-spv-account", error: error instanceof Error ? error.message : error });
  }

  let spvKeypair;
  try {
    spvKeypair = getSpvKeypair();
  } catch {
    return json(500, { ok: false, reason: "missing-spv-secret" });
  }

  try {
    const { cid, memoHashHex } = await uploadReserveJson(payload);
    const cidB64 = cidToBase64(cid);

    const account = await server.loadAccount(spvPublic);
    const baseFee = await server.fetchBaseFee();

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: String(baseFee * 2),
      networkPassphrase,
    })
      .addMemo(StellarSdk.Memo.hash(Buffer.from(memoHashHex, "hex")))
      .addOperation(
        StellarSdk.Operation.manageData({
          name: MANAGE_DATA_KEY,
          value: Buffer.from(cidB64, "base64"),
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(spvKeypair);
    const result = await server.submitTransaction(tx);
    const hash = result.hash ?? result.id;

    debugObj("[spv:reserve]", {
      hash,
      cid,
      memoHashHex,
    });

    return json(200, { ok: true, cid, hash, memoHashHex });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown-error";
    return json(500, { ok: false, reason: "submit-error", error: message });
  }
}
