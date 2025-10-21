import "server-only";

import { Buffer } from "buffer";
import { NextRequest, NextResponse } from "next/server";
import StellarSdk from "stellar-sdk";
import { calculateDistribution, formatPaymentAmount } from "@/src/lib/spv/distribute";
import { getIncomeWindow, getHolders } from "@/src/lib/spv/ingest";
import { debugObj } from "@/src/lib/logging/logger";
import { getServer, getNetworkPassphrase, getSpvKeypair, getSpvPublic } from "@/src/lib/stellar/sdk.server";
import { getSusdAssetOrNull } from "@/src/utils/constants";
import type { SpvAssetCode } from "@/src/lib/types/spv";

export const runtime = "nodejs";

type DistributionRequest = {
  asset?: SpvAssetCode;
  windowDays?: 7 | 30;
  memo?: string;
};

const normalizeMemo = (value?: string): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (Buffer.byteLength(trimmed, "utf8") <= 28) return trimmed;
  return Buffer.from(trimmed, "utf8").slice(0, 28).toString("utf8");
};

const json = (status: number, payload: unknown) => NextResponse.json(payload, { status });

export async function POST(request: NextRequest) {
  let body: DistributionRequest = {};
  try {
    body = (await request.json().catch(() => ({}))) as DistributionRequest;
  } catch {
    return json(400, { ok: false, reason: "invalid-json" });
  }

  const asset: SpvAssetCode = body.asset === "SUSD" ? "SUSD" : "XLM";
  const windowDays: 7 | 30 = body.windowDays === 30 ? 30 : 7;
  const memoText = normalizeMemo(body.memo);

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
    return json(400, { ok: false, reason: "missing-spv-account", error: error instanceof Error ? error.message : error });
  }

  let spvKeypair;
  try {
    spvKeypair = getSpvKeypair();
  } catch (error) {
    return json(400, { ok: false, reason: "missing-spv-secret", error: error instanceof Error ? error.message : error });
  }

  try {
    const incomeWindow = await getIncomeWindow({ days: windowDays });
    const incomeRaw = asset === "SUSD" ? incomeWindow.incomeSusd : incomeWindow.incomeXlm;
    const income = Number(incomeRaw);
    if (!Number.isFinite(income) || income <= 0) {
      return json(400, { ok: false, reason: "no-income" });
    }

    const holders = await getHolders();
    if (!holders.length) {
      return json(400, { ok: false, reason: "no-holders" });
    }

    const account = (await server.loadAccount(spvPublic)) as {
      balances?: Array<{ asset_type?: string; balance?: string }>;
    };
    const baseFee = await server.fetchBaseFee();

    let distribution;
    try {
      distribution = calculateDistribution({ holders, income, asset });
    } catch (error) {
      return json(400, {
        ok: false,
        reason: "invalid-distribution",
        error: error instanceof Error ? error.message : "distribution-error",
      });
    }

    let { payouts, totalPaid, underStroopDropped } = distribution;

    if (asset === "XLM") {
      const nativeBalance = Number.parseFloat(
        account.balances?.find((balance) => balance.asset_type === "native")?.balance ?? "0",
      );
      const reserveBuffer = 1; // keep buffer for fees + future ops
      const feeStroops = baseFee * Math.max(1, payouts.length);
      const feeXlm = feeStroops / 10_000_000;
      const available = Math.max(0, nativeBalance - reserveBuffer - feeXlm);
      console.log("[spv:distribute:balance]", { nativeBalance, available, totalPaid, feeXlm });
      if (available <= 0) {
        return json(400, {
          ok: false,
          reason: "insufficient-funds",
          error: { available: nativeBalance, required: totalPaid },
        });
      }
      if (totalPaid > available) {
        try {
          const fallback = calculateDistribution({ holders, income: available, asset });
          payouts = fallback.payouts;
          totalPaid = fallback.totalPaid;
          underStroopDropped = fallback.underStroopDropped;
        } catch {
          return json(400, {
            ok: false,
            reason: "insufficient-funds",
            error: { available, required: totalPaid },
          });
        }
      }
    }

    const txBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: String(baseFee * Math.max(1, payouts.length)),
      networkPassphrase,
    }).setTimeout(60);

    const susdAsset = getSusdAssetOrNull();
    if (asset === "SUSD" && !susdAsset) {
      return json(500, { ok: false, reason: "missing-susd-asset" });
    }

    payouts.forEach((payout) => {
      const amount = formatPaymentAmount(payout.amount);
      if (asset === "XLM") {
        txBuilder.addOperation(
          StellarSdk.Operation.payment({
            destination: payout.account,
            asset: StellarSdk.Asset.native(),
            amount,
          }),
        );
      } else {
        txBuilder.addOperation(
          StellarSdk.Operation.payment({
            destination: payout.account,
            asset: new StellarSdk.Asset(susdAsset!.code, susdAsset!.issuer),
            amount,
          }),
        );
      }
    });

    if (memoText) {
      txBuilder.addMemo(StellarSdk.Memo.text(memoText));
    }

    const tx = txBuilder.build();
    tx.sign(spvKeypair);

    let result;
    try {
      result = await server.submitTransaction(tx);
    } catch (error) {
      const payload =
        (error as { response?: { data?: unknown } }).response?.data ??
        (error instanceof Error ? error.message : "submit-failed");
      console.error("[spv:distribute:error]", payload);
      return json(400, {
        ok: false,
        reason: "submit-error",
        error: payload,
      });
    }
    const hash = result.hash ?? result.id;

    debugObj("[spv:distribute]", {
      hash,
      asset,
      windowDays,
      payouts: payouts.length,
      totalPaid,
      underStroopDropped,
    });

    return json(200, {
      ok: true,
      hash,
      opCount: payouts.length,
      totalPaid,
      payouts,
    });
  } catch (error) {
    console.error("[spv:distribute:unexpected]", error);
    const message = error instanceof Error ? error.message : "unknown-error";
    return json(500, { ok: false, reason: "submit-error", error: message });
  }
}
