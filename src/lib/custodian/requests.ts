import { z } from "zod";
import { getHorizonServer } from "@/src/lib/stellar/horizon";
import { debug, debugObj } from "@/src/lib/logging/logger";
import { CUSTODIAN_ACCOUNT, HORIZON, IPFS_GATEWAY } from "@/src/utils/constants";
import { parseAmountToStroops } from "@/src/lib/utils/format";
import { memoHashB64ToHex } from "@/src/lib/horizon/memos";
import { CID } from "multiformats/cid";

const numberish = z.union([z.number(), z.string()]).transform((value) => {
  if (typeof value === "number") return value;
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error("Invalid number");
  }
  const normalised = cleaned.replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(normalised);
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid number");
  }
  return parsed;
});

export const TokenRequestMetadataSchema = z.object({
  schema: z.string().min(1),
  asset: z.object({
    type: z.string().min(1),
    name: z.string().min(1),
    valueUSD: numberish.pipe(z.number().nonnegative()),
    expectedYieldPct: numberish.pipe(z.number().nonnegative()).optional(),
  }),
  proofCid: z.string().min(1),
  proofUrl: z.string().optional(),
  issuer: z.string().min(1),
  timestamp: z.string().min(1),
});

export type TokenRequestMetadata = z.infer<typeof TokenRequestMetadataSchema> & {
  proofUrl: string;
};

export type TokenizationMemo =
  | { kind: "cid"; value: string }
  | { kind: "hash"; value: string };

export type TokenizationRequest = {
  txHash: string;
  createdAt: string;
  from: string;
  to: string;
  amount: string;
  memo: TokenizationMemo;
  memoHashHex?: string;
  meta?: {
    name?: string;
    type?: string;
    valueUsd?: number;
    expectedYieldPct?: number;
    proofCid?: string;
  };
  metadataStatus: "loaded" | "missing" | "error" | "pending";
  metadataError?: string;
  feeXlm?: number;
  sigCount?: number;
  signedBy?: string | null;
};

type HorizonPaymentRecord = {
  id: string;
  created_at: string;
  type: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  transaction_hash: string;
  source_account?: string;
  from?: string;
  to?: string;
  memo?: string | null;
  transaction?: {
    memo_type?: string | null;
    memo?: string | null;
    memo_hash?: string | null;
    fee_charged?: string | number | null;
    signatures?: string[];
    source_account?: string | null;
  };
  transaction_attr?: {
    memo_type?: string | null;
    memo?: string | null;
    memo_hash?: string | null;
    fee_charged?: string | number | null;
    signatures?: string[];
    source_account?: string | null;
  };
};

const metadataCache = new Map<string, Promise<TokenRequestMetadata>>();

const buildGatewayUrl = (cid: string): string => {
  const base = IPFS_GATEWAY.endsWith("/") ? IPFS_GATEWAY.slice(0, -1) : IPFS_GATEWAY;
  return `${base}/${cid}`;
};

const fetchMetadata = async (cid: string): Promise<TokenRequestMetadata> => {
  if (!metadataCache.has(cid)) {
    metadataCache.set(
      cid,
      (async () => {
        const response = await fetch(buildGatewayUrl(cid), {
          headers: { Accept: "application/json, application/cbor" },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch token request metadata (${response.status})`);
        }
        const payload = await response.json();
        const parsed = TokenRequestMetadataSchema.parse(payload);
        return {
          ...parsed,
          proofUrl: parsed.proofUrl ?? buildGatewayUrl(parsed.proofCid),
        };
      })(),
    );
  }
  return metadataCache.get(cid)!;
};

const normaliseCid = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = CID.parse(trimmed);
    const v1 = parsed.toV1().toString();
    if (parsed.version === 0 && parsed.toString() !== v1) {
      debug("[custodian:memo] CID upgraded to v1", { original: trimmed, upgraded: v1 });
    }
    return v1;
  } catch {
    return undefined;
  }
};

type MemoParseResult =
  | { memo: TokenizationMemo }
  | { memo: null; reason: string; context?: Record<string, unknown> };

const parseMemo = (record: HorizonPaymentRecord): MemoParseResult => {
  const transaction = record.transaction_attr ?? record.transaction ?? null;
  const memoType = transaction?.memo_type ?? null;

  if (memoType === "text") {
    const rawValue = transaction?.memo ?? record.memo ?? null;
    const cid = normaliseCid(rawValue);
    if (cid) {
      return { memo: { kind: "cid", value: cid } };
    }
    return {
      memo: null,
      reason: "invalid-cid",
      context: {
        id: record.id,
        memo: rawValue,
      },
    };
  }

  if (memoType === "hash") {
    const hashValue =
      (transaction as { memo_hash?: string } | null)?.memo_hash ??
      transaction?.memo ??
      record.memo ??
      null;
    if (!hashValue) {
      return {
        memo: null,
        reason: "missing-memo-hash",
        context: { id: record.id },
      };
    }
    try {
      const memoHashHex = memoHashB64ToHex(hashValue);
      return { memo: { kind: "hash", value: memoHashHex } };
    } catch {
      return {
        memo: null,
        reason: "invalid-memo-hash",
        context: { id: record.id },
      };
    }
  }

  if (!memoType) {
    return {
      memo: null,
      reason: "missing-memo",
      context: { id: record.id },
    };
  }

  return {
    memo: null,
    reason: "unsupported-memo",
    context: { id: record.id, memo_type: memoType },
  };
};

const normalisePaymentRecord = (
  record: HorizonPaymentRecord,
  memo: TokenizationMemo,
): TokenizationRequest => {
  const amount = record.amount ?? "0";
  const toAccount = record.to ?? "";
  const fromAccount = record.from ?? record.source_account ?? "";
  const tx = record.transaction_attr ?? record.transaction ?? undefined;
  const feeXlm =
    tx?.fee_charged != null ? Number(tx.fee_charged) / 1e7 : undefined;
  const sigCount = tx?.signatures?.length ?? undefined;
  const signedBy = tx?.source_account ?? record.source_account ?? null;

  return {
    txHash: record.transaction_hash,
    createdAt: record.created_at,
    from: fromAccount,
    to: toAccount,
    amount,
    memo,
    memoHashHex: memo.kind === "hash" ? memo.value : undefined,
    metadataStatus: memo.kind === "cid" ? "pending" : "missing",
    feeXlm,
    sigCount,
    signedBy,
  };
};

const DEFAULT_LIMIT = 100;

export type PaymentsQuery = {
  forAccount(accountId: string): PaymentsQuery;
  order(direction: "asc" | "desc"): PaymentsQuery;
  limit(limit: number): PaymentsQuery;
  join(resource: string): PaymentsQuery;
  includeTransactions?: (include: boolean) => PaymentsQuery;
  call(): Promise<{ records: HorizonPaymentRecord[] }>;
};

type HorizonServerApi = {
  payments(): PaymentsQuery;
};

export type CustodianRequestDiagnostics = {
  timestamp: string;
  account: string;
  limit: number;
  horizonCount: number;
  acceptedCount: number;
  memoSummary: Record<"cid" | "hash", number>;
  dropSummary: {
    underStroop: number;
    noMemo: number;
    invalidCid: number;
    invalidDag: number;
  };
  droppedByReason: Record<string, number>;
  samples: CustodianRecordSample[];
};

export type CustodianRequestResult = {
  items: TokenizationRequest[];
  diagnostics: CustodianRequestDiagnostics;
};

type CustodianRecordSample = {
  id: string;
  created_at: string;
  amount?: string;
  asset_type?: string;
  from?: string;
  to?: string;
  transaction_hash: string;
  transaction?: HorizonPaymentRecord["transaction"];
};

const sanitizeRecord = (record: HorizonPaymentRecord): CustodianRecordSample => ({
  id: record.id,
  created_at: record.created_at,
  amount: record.amount,
  asset_type: record.asset_type,
  from: record.from ?? record.source_account,
  to: record.to,
  transaction_hash: record.transaction_hash,
  transaction: record.transaction ?? record.transaction_attr ?? undefined,
});

const registerDrop = (
  reason: string,
  context: Record<string, unknown>,
  droppedByReason: Record<string, number>,
) => {
  droppedByReason[reason] = (droppedByReason[reason] ?? 0) + 1;
  debugObj(`[custodian:drop:${reason}]`, context);
};

export const fetchCustodianRequests = async (
  accountId = CUSTODIAN_ACCOUNT,
  limit = DEFAULT_LIMIT,
): Promise<CustodianRequestResult> => {
  const resolvedAccount = accountId?.trim() || CUSTODIAN_ACCOUNT;
  if (!resolvedAccount) {
    debug("[custodian:query] skipped - missing account id");
    return {
      items: [],
      diagnostics: {
        timestamp: new Date().toISOString(),
        account: "",
        limit: limit ?? DEFAULT_LIMIT,
        horizonCount: 0,
        acceptedCount: 0,
        memoSummary: { cid: 0, hash: 0 },
        dropSummary: {
          underStroop: 0,
          noMemo: 0,
          invalidCid: 0,
          invalidDag: 0,
        },
        droppedByReason: {},
        samples: [],
      },
    };
  }

  const server = (await getHorizonServer()) as HorizonServerApi;
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(200, Math.trunc(limit)))
    : 100;
  let query = server.payments().forAccount(resolvedAccount).order("desc").limit(safeLimit);

  if (typeof query.includeTransactions === "function") {
    query = query.includeTransactions(true);
  } else {
    query = query.join("transactions");
  }

  debug("[custodian:query]", {
    url: HORIZON,
    account: resolvedAccount,
    limit: safeLimit,
  });

  const page = await query.call();

  const memoSummary: Record<"cid" | "hash", number> = { cid: 0, hash: 0 };
  const droppedByReason: Record<string, number> = {};
  const normalised: TokenizationRequest[] = [];
  const samples: CustodianRecordSample[] = [];

  for (const record of page.records) {
    debug("[custodian:record]", {
      id: record.id,
      amount: record.amount,
      memo_type: record.transaction?.memo_type ?? record.transaction_attr?.memo_type,
      has_tx: Boolean(record.transaction),
    });

    if (samples.length < 2) {
      samples.push(sanitizeRecord(record));
    }

    if (record.type !== "payment") {
      registerDrop("not-payment", { id: record.id }, droppedByReason);
      continue;
    }

    if ((record.asset_type ?? "native") !== "native") {
      registerDrop(
        "non-native-asset",
        { id: record.id, asset_type: record.asset_type },
        droppedByReason,
      );
      continue;
    }

    const toAccount = record.to ?? "";
    if (toAccount !== resolvedAccount) {
      registerDrop(
        "not-to-custodian",
        { id: record.id, to: record.to, expected: resolvedAccount },
        droppedByReason,
      );
      continue;
    }

    const amount = record.amount ?? "0";
    const stroops = parseAmountToStroops(amount);
    if (stroops < 1) {
      registerDrop("under-stroop", { id: record.id, amount }, droppedByReason);
      continue;
    }

    const memoResult = parseMemo(record);
    if (!("memo" in memoResult) || memoResult.memo === null) {
      registerDrop(memoResult.reason, memoResult.context ?? {}, droppedByReason);
      continue;
    }

    memoSummary[memoResult.memo.kind] += 1;
    normalised.push(normalisePaymentRecord(record, memoResult.memo));
  }

  const withMetadata = await Promise.all(
    normalised.map(async (entry) => {
      if (entry.memo.kind !== "cid") {
        return entry;
      }
      try {
        debugObj("[custodian:ipfs:request]", {
          cid: entry.memo.value,
          url: buildGatewayUrl(entry.memo.value),
        });
        const metadata = await fetchMetadata(entry.memo.value);
        const hydrated = {
          ...entry,
          metadataStatus: "loaded" as const,
          meta: {
            name: metadata.asset.name,
            type: metadata.asset.type,
            valueUsd: metadata.asset.valueUSD,
            expectedYieldPct: metadata.asset.expectedYieldPct,
            proofCid: metadata.proofCid,
          },
        } satisfies TokenizationRequest;
        debugObj("[custodian:ipfs:success]", { cid: entry.memo.value });
        return hydrated;
      } catch (error) {
        debugObj("[custodian:ipfs:error]", {
          cid: entry.memo.value,
          message: error instanceof Error ? error.message : "unknown",
        });
        registerDrop("metadata-error", { cid: entry.memo.value }, droppedByReason);
        return {
          ...entry,
          metadataStatus: "error" as const,
          metadataError: error instanceof Error ? error.message : "Unknown metadata error",
        } satisfies TokenizationRequest;
      }
    }),
  );

  const sorted = withMetadata.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const dropSummary = {
    underStroop: droppedByReason["under-stroop"] ?? 0,
    noMemo:
      (droppedByReason["missing-memo"] ?? 0) +
      (droppedByReason["missing-memo-hash"] ?? 0) +
      (droppedByReason["unsupported-memo"] ?? 0),
    invalidCid: droppedByReason["invalid-cid"] ?? 0,
    invalidDag: droppedByReason["metadata-error"] ?? 0,
  };

  const diagnostics: CustodianRequestDiagnostics = {
    timestamp: new Date().toISOString(),
    account: resolvedAccount,
    limit: safeLimit,
    horizonCount: page.records.length,
    acceptedCount: sorted.length,
    memoSummary,
    dropSummary,
    droppedByReason,
    samples,
  };

  debug("[custodian:requests:summary]", {
    total: diagnostics.horizonCount,
    kept: diagnostics.acceptedCount,
    memoSummary,
    samples: diagnostics.samples.slice(0, 2).map((sample) => ({
      id: sample.id,
      memoType: sample.transaction?.memo_type,
      memo: sample.transaction?.memo,
    })),
  });
  debugObj("[custodian:requests]", diagnostics);

  return {
    items: sorted,
    diagnostics,
  };
};

export const fetchTokenizationRequests = fetchCustodianRequests;
