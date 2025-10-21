import { Buffer } from "buffer";

import { lighthouseUploadDagCbor, DEFAULT_GATEWAY, LighthouseUploadError } from "@/src/lib/ipfs/lighthouse";
import { debugObj } from "@/src/lib/logging/logger";
import { hashCidMemoHex } from "@/src/lib/spv/hash";
import { getSpvAccount } from "@/src/utils/constants";
import type { ReserveProofPayload, SpvBalanceSummary } from "@/src/lib/types/spv";
import { formatXLM } from "@/src/lib/utils/format";

const DAY_MS = 24 * 60 * 60 * 1000;

export const MANAGE_DATA_KEY = "vesto.reserve.cid";

const isoWeekNumber = (date: Date): number => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
};

export type BuildReserveJsonArgs = {
  balance: SpvBalanceSummary;
  reserveUsdOverride?: number;
  lastTx?: string | null;
  asOf?: string;
  notes?: string;
  weekOverride?: number;
};

const formatSusd = (value: number): string => value.toFixed(2);

export const buildReserveJson = (args: BuildReserveJsonArgs): ReserveProofPayload => {
  const asOf = args.asOf ?? new Date().toISOString();
  const asOfDate = new Date(asOf);
  const week = Number.isFinite(args.weekOverride)
    ? Math.max(0, Math.trunc(args.weekOverride!))
    : isoWeekNumber(asOfDate);

  const reserveUsd =
    args.reserveUsdOverride ??
    Math.max(0, Number.parseFloat((args.balance.xlm + args.balance.susd).toFixed(2)));

  return {
    schema: "vesto.reserve@1",
    week,
    reserveUSD: reserveUsd,
    spvBalanceXLM: formatXLM(args.balance.xlm),
    spvBalanceSUSD: formatSusd(args.balance.susd),
    asOf,
    lastTx: args.lastTx ?? "",
    notes: args.notes,
  };
};

const resolveGateway = () => {
  const candidate =
    (process.env.IPFS_GATEWAY ?? process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? DEFAULT_GATEWAY).trim() ||
    DEFAULT_GATEWAY;
  return candidate.endsWith("/") ? candidate.slice(0, -1) : candidate;
};

const ensureManageDataSize = (cid: string) => {
  const bytes = Buffer.from(cid, "utf8");
  if (bytes.length > 64) {
    throw new Error("Reserve CID exceeds manage_data 64 byte limit.");
  }
};

export const uploadReserveJson = async (payload: ReserveProofPayload): Promise<{ cid: string; memoHashHex: string }> => {
  const apiKey = (process.env.LIGHTHOUSE_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("LIGHTHOUSE_API_KEY is not configured on the server.");
  }

  const gateway = resolveGateway();
  let cid: string;
  try {
    const result = await lighthouseUploadDagCbor(payload, apiKey, gateway);
    cid = result.cid;
  } catch (error) {
    if (error instanceof LighthouseUploadError) {
      throw new Error(error.message);
    }
    throw error instanceof Error ? error : new Error("Failed to upload reserve proof to IPFS.");
  }

  ensureManageDataSize(cid);

  const { hex: memoHashHex } = await hashCidMemoHex(cid);

  debugObj("[spv:reserve]", {
    cid,
    memoHashHex,
    gateway,
  });

  return { cid, memoHashHex };
};

export const assertSpvAccountConfigured = () => {
  const account = getSpvAccount().trim();
  if (!account) {
    throw new Error("SPV account is not configured.");
  }
  return account;
};
