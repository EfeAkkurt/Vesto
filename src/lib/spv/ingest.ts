import { wrapCall, type HorizonPayment } from "@/src/hooks/horizon";
import { debugObj } from "@/src/lib/logging/logger";
import { getSpvAccount, getSusdAssetOrNull } from "@/src/utils/constants";
import { formatXLM } from "@/src/lib/utils/format";
export { getHolders } from "@/src/lib/spv/holders";
import type { SpvIncome, SpvPayment } from "@/src/lib/types/spv";
import { getHorizonServer } from "@/src/lib/stellar/horizon";

const MAX_RECORDS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

type PaymentsCallBuilder = {
  forAccount(accountId: string): PaymentsCallBuilder;
  order(direction: "asc" | "desc"): PaymentsCallBuilder;
  limit(limit: number): PaymentsCallBuilder;
  includeTransactions?(include: boolean): PaymentsCallBuilder;
  join?(resource: string): PaymentsCallBuilder;
  call(): Promise<{ records: HorizonPayment[] }>;
};

type HorizonServer = {
  payments(): PaymentsCallBuilder;
};

const toFixedAmount = (stroops: number): string => formatXLM(stroops / 10_000_000);

const toNumber = (value?: string | number | null): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normaliseAccount = (value?: string | null): string => (value ?? "").trim();

const buildPayment = (record: HorizonPayment, asset: "XLM" | "SUSD", amount: number): SpvPayment => ({
  hash: record.transaction_hash,
  amount,
  asset,
  createdAt: record.created_at,
  from: record.from,
  to: record.to,
  memo: record.transaction_attr?.memo ?? record.memo ?? null,
});

export const fetchSpvIncome = async ({ days = 7 }: { days?: 7 | 30 } = {}): Promise<SpvIncome> => {
  const windowDays = days === 30 ? 30 : 7;
  const account = getSpvAccount();
  if (!account) {
    throw new Error("SPV account is not configured.");
  }

  const server = (await getHorizonServer()) as HorizonServer;
  let builder = server.payments().forAccount(account).order("desc").limit(MAX_RECORDS);
  if (typeof builder.includeTransactions === "function") {
    builder = builder.includeTransactions(true);
  } else if (typeof builder.join === "function") {
    builder = builder.join("transactions");
  }

  const page = typeof window === "undefined" ? await builder.call() : await wrapCall(() => builder.call());

  const since = Date.now() - windowDays * DAY_MS;
  const susd = getSusdAssetOrNull();

  let incomeXlm = 0;
  let incomeSusd = 0;
  let opsCount = 0;
  let lastTxHash: string | null = null;
  let lastSeenCursor: string | null = null;
  const payments: SpvPayment[] = [];

  page.records.forEach((record) => {
    if (!record || record.type !== "payment") return;
    if (normaliseAccount(record.to) !== account.trim()) return;

    const createdMs = record.created_at ? new Date(record.created_at).getTime() : NaN;
    if (!Number.isFinite(createdMs) || createdMs < since) return;

    const amount = toNumber(record.amount);
    if (amount <= 0) return;

    const assetType = (record.asset_type ?? "").toLowerCase();
    if (assetType === "native") {
      incomeXlm += amount;
      opsCount += 1;
      payments.push(buildPayment(record, "XLM", amount));
    } else if (
      susd &&
      record.asset_code?.trim() === susd.code &&
      normaliseAccount(record.asset_issuer) === susd.issuer
    ) {
      incomeSusd += amount;
      opsCount += 1;
      payments.push(buildPayment(record, "SUSD", amount));
    } else {
      return;
    }

    if (!lastTxHash) {
      lastTxHash = record.transaction_hash;
      const cursor = (record as unknown as { paging_token?: string }).paging_token;
      if (cursor) {
        lastSeenCursor = cursor;
      }
    }
  });

  debugObj("[spv:ingest] income snapshot", {
    windowDays,
    incomeXlm: toFixedAmount(Math.round(incomeXlm * 10_000_000)),
    incomeSusd: formatXLM(incomeSusd),
    opsCount,
    lastTxHash,
  });

  return {
    incomeXlm,
    incomeSusd,
    opsCount,
    lastTxHash,
    lastSeenCursor,
    windowDays,
    fetchedAt: new Date().toISOString(),
    payments,
  };
};

export const getIncomeWindow = async ({ days = 7 }: { days?: 7 | 30 } = {}) => fetchSpvIncome({ days });
