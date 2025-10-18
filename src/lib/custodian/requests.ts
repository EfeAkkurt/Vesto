import { Buffer } from "buffer";
import { z } from "zod";
import { loadSDK } from "@/src/lib/stellar/sdk";
import { IPFS_GATEWAY } from "@/src/utils/constants";

const MIN_STROOP_AMOUNT = 0.0000001;

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

export type TokenizationRequest = {
  txHash: string;
  ts: string;
  submittedAt: string;
  from: string;
  to: string;
  amount: string;
  assetCode: string;
  assetIssuer?: string;
  memoType: "text" | "hash" | "none";
  cid?: string;
  memoHashHex?: string;
  metadataCid?: string;
  metadata?: TokenRequestMetadata;
  metadataStatus: "loaded" | "pending" | "missing" | "error";
  metadataError?: string;
  issuer?: string;
  assetType?: string;
  assetName?: string;
  valueUSD?: number;
  expectedYieldPct?: number;
  proofCid?: string;
  proofUrl?: string;
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

const parseAmount = (value?: string): number => {
  if (!value) return 0;
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normaliseAssetCode = (assetType?: string, assetCode?: string): string => {
  if (!assetType || assetType === "native") return "XLM";
  return assetCode ?? assetType.toUpperCase();
};

const decodeMemoHashHex = (memo?: string | null): string | undefined => {
  if (!memo) return undefined;
  try {
    return Buffer.from(memo, "base64").toString("hex");
  } catch {
    return undefined;
  }
};

const pickMemo = (record: HorizonPaymentRecord): { memoType: "text" | "hash" | "none"; cid?: string; memoHashHex?: string } => {
  const memoType =
    record.transaction?.memo_type ??
    record.transaction_attr?.memo_type ??
    null;
  const memoValue =
    record.transaction?.memo ??
    record.transaction_attr?.memo ??
    record.memo ??
    null;

  if (!memoType || memoType === "none") {
    if (memoValue && memoValue.trim().length > 0) {
      return { memoType: "text", cid: memoValue.trim() };
    }
    return { memoType: "none" };
  }

  if (memoType === "text") {
    const trimmed = memoValue?.trim();
    return trimmed ? { memoType: "text", cid: trimmed } : { memoType: "text" };
  }

  if (memoType === "hash") {
    const memoHashHex = decodeMemoHashHex(memoValue);
    return { memoType: "hash", memoHashHex };
  }

  return { memoType: "none" };
};

const normalisePaymentRecord = (record: HorizonPaymentRecord, accountId: string): TokenizationRequest | null => {
  const toAccount = record.to ?? "";
  if (toAccount !== accountId) return null;

  const amount = record.amount ?? "0";
  if (parseAmount(amount) < MIN_STROOP_AMOUNT) return null;

  const memoInfo = pickMemo(record);
  if (!memoInfo.cid && !memoInfo.memoHashHex) return null;

  const fromAccount = record.from ?? record.source_account ?? "";

  return {
    txHash: record.transaction_hash,
    ts: record.created_at,
    submittedAt: record.created_at,
    from: fromAccount,
    to: toAccount,
    amount,
    assetCode: normaliseAssetCode(record.asset_type, record.asset_code),
    assetIssuer: record.asset_issuer,
    memoType: memoInfo.memoType,
    cid: memoInfo.cid,
    memoHashHex: memoInfo.memoHashHex,
    metadataCid: memoInfo.cid,
    metadataStatus: memoInfo.cid ? "pending" : "missing",
  };
};

type PaymentsCallBuilder = {
  forAccount(accountId: string): PaymentsCallBuilder;
  order(direction: "asc" | "desc"): PaymentsCallBuilder;
  limit(limit: number): PaymentsCallBuilder;
  includeTransactions(include: boolean): PaymentsCallBuilder;
  call(): Promise<{ records: HorizonPaymentRecord[] }>;
};

type StellarServer = {
  payments(): PaymentsCallBuilder;
};

type ServerConstructor = new (url: string) => StellarServer;

export const fetchTokenizationRequests = async (serverUrl: string, accountId: string, limit = 50): Promise<TokenizationRequest[]> => {
  const { Server } = (await loadSDK()) as unknown as { Server: ServerConstructor };
  const server = new Server(serverUrl.replace(/\/$/, ""));

  const page = await server
    .payments()
    .forAccount(accountId)
    .order("desc")
    .limit(limit)
    .includeTransactions(true)
    .call();

  const normalised = page.records
    .map((record) => normalisePaymentRecord(record, accountId))
    .filter((record): record is TokenizationRequest => Boolean(record));

  const withMetadata = await Promise.all(
    normalised.map(async (entry) => {
      if (!entry.cid) {
        return {
          ...entry,
          metadataStatus: "missing" as const,
        };
      }
      try {
        const metadata = await fetchMetadata(entry.cid);
        return {
          ...entry,
          metadata,
          metadataStatus: "loaded" as const,
          issuer: metadata.issuer,
          assetType: metadata.asset.type,
          assetName: metadata.asset.name,
          valueUSD: metadata.asset.valueUSD,
          expectedYieldPct: metadata.asset.expectedYieldPct,
          proofCid: metadata.proofCid,
          proofUrl: metadata.proofUrl,
        };
      } catch (error) {
        console.warn("Failed to fetch token request metadata", { cid: entry.cid, error });
        return {
          ...entry,
          metadataStatus: "error" as const,
          metadataError: error instanceof Error ? error.message : "Unknown metadata error",
        };
      }
    }),
  );

  return withMetadata.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
};
