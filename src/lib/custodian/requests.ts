import { Buffer } from "buffer";
import { CID } from "multiformats/cid";
import { z } from "zod";
import { getServer } from "@/src/lib/stellar/sdk";
import { debug, debugObj } from "@/src/lib/logging/logger";
import { CUSTODIAN_ACCOUNT, HORIZON, IPFS_GATEWAY } from "@/src/utils/constants";
import { parseAmountToStroops } from "@/src/lib/utils/format";

const TokenRequestMetadataSchema = z.object({
  schema: z.string().min(1),
  asset: z.object({
    type: z.string().min(1),
    name: z.string().min(1),
    valueUSD: z.number().nonnegative(),
    expectedYieldPct: z.number().optional(),
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
  meta?: {
    name?: string;
    type?: string;
    valueUsd?: number;
    expectedYieldPct?: number;
    proofCid?: string;
  };
  metadataStatus: "loaded" | "missing" | "error" | "pending";
  metadataError?: string;
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
  };
  transaction_attr?: {
    memo_type?: string | null;
    memo?: string | null;
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

const decodeMemoHashHex = (memo?: string | null): string | undefined => {
  if (!memo) return undefined;
  try {
    return Buffer.from(memo, "base64").toString("hex");
  } catch {
    return undefined;
  }
};

const normaliseCid = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return CID.parse(trimmed).toV1().toString();
  } catch {
    return undefined;
  }
};

const pickMemo = (record: HorizonPaymentRecord): TokenizationMemo | null => {
  const transaction = record.transaction_attr ?? record.transaction ?? null;
  const memoType = transaction?.memo_type ?? null;

  if (memoType === "text") {
    const rawValue = transaction?.memo ?? record.memo ?? null;
    const cid = normaliseCid(rawValue);
    return cid ? { kind: "cid", value: cid } : null;
  }

  if (memoType === "hash") {
    const hashValue =
      (transaction as { memo_hash?: string } | null)?.memo_hash ??
      transaction?.memo ??
      record.memo ??
      null;
    const memoHashHex = decodeMemoHashHex(hashValue);
    return memoHashHex ? { kind: "hash", value: memoHashHex } : null;
  }

  return null;
};

const normalisePaymentRecord = (
  record: HorizonPaymentRecord,
  memo: TokenizationMemo,
): TokenizationRequest => {
  const amount = record.amount ?? "0";
  const toAccount = record.to ?? "";
  const fromAccount = record.from ?? record.source_account ?? "";

  return {
    txHash: record.transaction_hash,
    createdAt: record.created_at,
    from: fromAccount,
    to: toAccount,
    amount,
    memo,
    metadataStatus: memo.kind === "cid" ? "pending" : "missing",
  };
};

const DEFAULT_LIMIT = 100;

type PaymentsQuery = {
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
  total: number;
  kept: number;
  memoTypes: Record<"cid" | "hash", number>;
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
        total: 0,
        kept: 0,
        memoTypes: { cid: 0, hash: 0 },
        droppedByReason: {},
        samples: [],
      },
    };
  }

  const server = (await getServer()) as HorizonServerApi;
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

  const memoTypes: Record<"cid" | "hash", number> = { cid: 0, hash: 0 };
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

    const memo = pickMemo(record);
    if (!memo) {
      registerDrop(
        "invalid-memo",
        {
          id: record.id,
          memo_type: record.transaction_attr?.memo_type ?? record.transaction?.memo_type,
          memo: record.transaction_attr?.memo ?? record.transaction?.memo ?? record.memo,
        },
        droppedByReason,
      );
      continue;
    }

    memoTypes[memo.kind] += 1;
    normalised.push(normalisePaymentRecord(record, memo));
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

  const diagnostics: CustodianRequestDiagnostics = {
    timestamp: new Date().toISOString(),
    account: resolvedAccount,
    limit: safeLimit,
    total: page.records.length,
    kept: sorted.length,
    memoTypes,
    droppedByReason,
    samples,
  };

  debug("[custodian:requests:summary]", {
    total: diagnostics.total,
    kept: diagnostics.kept,
    memoTypes,
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
