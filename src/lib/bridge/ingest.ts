import { createHash } from "crypto";
import { CID } from "multiformats/cid";
import { z } from "zod";
import { memoHashB64ToHex } from "@/src/lib/horizon/memos";
import { debugObj } from "@/src/lib/logging/logger";
import { getHorizonServer } from "@/src/lib/stellar/horizon";
import {
  BRIDGE_PUBLIC_ACCOUNT,
  IPFS_GATEWAY,
  SUSD_PUBLIC_CODE,
  SUSD_PUBLIC_ISSUER,
  isBridgeEnvConfigured,
} from "@/src/utils/constants";
import type { BridgeLock, BridgeMint, BridgeRedeem, BridgeStats } from "@/src/lib/types/bridge";
import { formatXLM } from "@/src/lib/utils/format";

const DEFAULT_LIMIT = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

type OperationsCallBuilder = {
  forAccount(accountId: string): OperationsCallBuilder;
  order(direction: "asc" | "desc"): OperationsCallBuilder;
  limit(limit: number): OperationsCallBuilder;
  includeTransactions?(include: boolean): OperationsCallBuilder;
  join?(resource: string): OperationsCallBuilder;
  call(): Promise<{ records: HorizonOperationRecord[] }>;
};

type HorizonServer = {
  operations(): OperationsCallBuilder;
};

type HorizonTransactionEnvelope = {
  memo_type?: string | null;
  memo?: string | null;
  memo_hash?: string | null;
  fee_charged?: string | number | null;
  signatures?: string[] | null;
  source_account?: string | null;
};

type HorizonOperationRecord = {
  id: string;
  type: string;
  created_at: string;
  transaction_hash: string;
  source_account?: string | null;
  from?: string | null;
  to?: string | null;
  amount?: string | null;
  asset_type?: string | null;
  asset_code?: string | null;
  asset_issuer?: string | null;
  name?: string | null;
  value?: string | null;
  value_hex?: string | null;
  transaction?: HorizonTransactionEnvelope | null;
  transaction_attr?: HorizonTransactionEnvelope | null;
};

type BridgeSnapshot = {
  locks: BridgeLock[];
  mints: BridgeMint[];
  redeems: BridgeRedeem[];
  stats: BridgeStats;
};

const EMPTY_STATS: BridgeStats = {
  totalLockedXlm: "0.0000000",
  totalMintedSusd: "0.0000000",
  totalRedeemedSusd: "0.0000000",
  ops7d: 0,
  ops30d: 0,
};

const RETRY_DELAYS_MS = [0, 5000, 15_000, 30_000] as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildGatewayUrl = (cid: string): string => `${IPFS_GATEWAY}/${cid}`;

const sha256Hex = (value: string): string => createHash("sha256").update(value).digest("hex");


const AmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => {
    const numeric = typeof value === "number" ? value : Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      throw new Error("Invalid amount");
    }
    return formatXLM(numeric);
  });

const BridgeLockMetadataSchema = z.object({
  schema: z.literal("vesto.lock@1"),
  bridgeAccount: z.string(),
  chain: z.string(),
  asset: z.string(),
  assetIssuer: z.string().optional(),
  amount: AmountSchema,
  recipient: z.string(),
  timestamp: z.string(),
});

const BridgeMintMetadataSchema = z.object({
  schema: z.literal("vesto.mint@1"),
  bridgeAccount: z.string(),
  targetAccount: z.string(),
  amount: AmountSchema,
  asset: z.object({
    code: z.string(),
    issuer: z.string(),
  }),
  evmLockProofCid: z.string(),
  timestamp: z.string(),
});

const BridgeRedeemMetadataSchema = z.object({
  schema: z.literal("vesto.redeem@1"),
  bridgeAccount: z.string(),
  targetChain: z.string(),
  recipient: z.string(),
  amount: AmountSchema,
  asset: z.object({
    code: z.string(),
    issuer: z.string(),
  }),
  burnTx: z.string().optional(),
  timestamp: z.string(),
});

type BridgeLockMetadata = z.infer<typeof BridgeLockMetadataSchema>;
type BridgeMintMetadata = z.infer<typeof BridgeMintMetadataSchema>;
type BridgeRedeemMetadata = z.infer<typeof BridgeRedeemMetadataSchema>;

type MetadataResult<T> = {
  status: "Verified" | "Recorded" | "Invalid";
  data?: T;
  error?: string;
};

const metadataCache = new Map<string, Promise<MetadataResult<unknown>>>();

const shouldRetryHead = (status: number) => status === 404 || status === 502 || status === 504;

const fetchMetadataForCid = async <T>(
  cid: string,
  memoHashHex: string | undefined,
  schema: z.ZodSchema<T>,
  kind: "lock" | "mint" | "redeem",
): Promise<MetadataResult<T>> => {
  if (!cid) {
    return { status: "Recorded", error: `missing-cid:${kind}` };
  }
  const url = buildGatewayUrl(cid);
  let headSucceeded = false;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay) await wait(delay);
    try {
      const head = await fetch(url, { method: "HEAD" });
      if (head.ok || head.status === 405) {
        headSucceeded = true;
        break;
      }
      if (shouldRetryHead(head.status) && attempt < RETRY_DELAYS_MS.length - 1) {
        continue;
      }
      return { status: "Recorded", error: `head:${head.status}` };
    } catch {
      if (attempt === RETRY_DELAYS_MS.length - 1) {
        return { status: "Recorded", error: "head:fetch-failed" };
      }
    }
  }

  if (!headSucceeded) {
    return { status: "Recorded", error: "head:unavailable" };
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json, application/cbor" },
    });
    if (!response.ok) {
      return { status: "Recorded", error: `get:${response.status}` };
    }
    const payload = (await response.json()) as unknown;
    const parsed = schema.parse(payload);
    const memoHex = (memoHashHex ?? "").replace(/^0x/i, "").toLowerCase();
    const cidHex = sha256Hex(cid).toLowerCase();
    let status: "Verified" | "Recorded" | "Invalid" = "Recorded";
    if (memoHex) {
      status = memoHex === cidHex ? "Verified" : "Invalid";
    }
    return { status, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "Invalid",
        error: `schema:${error.issues.map((issue) => issue.message).join("|") || "invalid"}`,
      };
    }
    const message = error instanceof Error ? error.message : "metadata-error";
    return { status: "Recorded", error: message };
  }
};

const getMetadata = async <T>(
  cid: string,
  memoHashHex: string | undefined,
  schema: z.ZodSchema<T>,
  kind: "lock" | "mint" | "redeem",
): Promise<MetadataResult<T>> => {
  const key = `${kind}:${cid}`;
  if (!metadataCache.has(key)) {
    metadataCache.set(key, fetchMetadataForCid(cid, memoHashHex, schema, kind));
  }
  const result = await metadataCache.get(key)!;
  return result as MetadataResult<T>;
};

let snapshotPromise: Promise<BridgeSnapshot> | null = null;
let snapshotLimit = DEFAULT_LIMIT;

const ensureSnapshot = (limit: number): Promise<BridgeSnapshot> => {
  if (!isBridgeEnvConfigured || !BRIDGE_PUBLIC_ACCOUNT) {
    return Promise.resolve({ locks: [], mints: [], redeems: [], stats: EMPTY_STATS });
  }
  if (!snapshotPromise || snapshotLimit !== limit) {
    snapshotLimit = limit;
    snapshotPromise = buildSnapshot(limit).finally(() => {
      snapshotPromise = null;
    });
  }
  return snapshotPromise;
};

const normaliseAccount = (value?: string | null): string => value?.trim() ?? "";

const getTransactionEnvelope = (record: HorizonOperationRecord): HorizonTransactionEnvelope | null =>
  record.transaction_attr ?? record.transaction ?? null;

const decodeBase64 = (raw?: string | null): string => {
  if (!raw) return "";
  const value = raw.trim();
  if (!value) return "";
  const globalBuffer = (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer;
  try {
    if (globalBuffer) {
      return globalBuffer.from(value, "base64").toString("utf8");
    }
  } catch {
    // Fallback to browser decoding.
  }
  if (typeof globalThis.atob === "function") {
    try {
      const binary = globalThis.atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch {
      return value;
    }
  }
  return value;
};

const normaliseCid = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  try {
    return CID.parse(trimmed).toV1().toString();
  } catch {
    return trimmed;
  }
};

const getMemoHashHex = (record: HorizonOperationRecord): string => {
  const envelope = getTransactionEnvelope(record);
  const memoHash = envelope?.memo_hash ?? null;
  if (!memoHash) return "";
  try {
    return memoHashB64ToHex(memoHash);
  } catch {
    return "";
  }
};

const toFeeXlm = (record: HorizonOperationRecord): number => {
  const envelope = getTransactionEnvelope(record);
  const feeValue = envelope?.fee_charged ?? null;
  const stroops =
    typeof feeValue === "number"
      ? feeValue
      : typeof feeValue === "string"
        ? Number.parseInt(feeValue, 10)
        : 0;
  if (!Number.isFinite(stroops) || stroops <= 0) return 0;
  return Number(stroops) / 10_000_000;
};

const getSignatureCount = (record: HorizonOperationRecord): number => {
  const envelope = getTransactionEnvelope(record);
  const signatures = envelope?.signatures;
  return Array.isArray(signatures) ? signatures.length : 0;
};

const isSusdPayment = (record: HorizonOperationRecord): boolean =>
  (record.asset_code ?? "").trim() === SUSD_PUBLIC_CODE && normaliseAccount(record.asset_issuer) === SUSD_PUBLIC_ISSUER;

const buildSnapshot = async (limit: number): Promise<BridgeSnapshot> => {
  const server = (await getHorizonServer()) as HorizonServer;
  let builder = server.operations().forAccount(BRIDGE_PUBLIC_ACCOUNT).order("desc").limit(limit);
  if (typeof builder.includeTransactions === "function") {
    builder = builder.includeTransactions(true);
  } else if (typeof builder.join === "function") {
    builder = builder.join("transactions");
  }

  const page = await builder.call();
  const grouped = new Map<string, HorizonOperationRecord[]>();
  page.records.forEach((record) => {
    if (!record?.transaction_hash) return;
    const hash = record.transaction_hash;
    if (!grouped.has(hash)) {
      grouped.set(hash, []);
    }
    grouped.get(hash)!.push(record);
  });

  const locks: BridgeLock[] = [];
  const mints: BridgeMint[] = [];
  const redeems: BridgeRedeem[] = [];

  grouped.forEach((records, hash) => {
    records
      .filter((record) => record.type === "manage_data" && typeof record.name === "string")
      .forEach((manageRecord) => {
        const name = manageRecord.name ?? "";
        const decoded = normaliseCid(decodeBase64(manageRecord.value));
        const memoHashHex = getMemoHashHex(manageRecord);
        const feeXlm = toFeeXlm(manageRecord);
        const sigs = getSignatureCount(manageRecord);
        const createdAt = manageRecord.created_at;
        const sourceAccount = normaliseAccount(manageRecord.source_account) || BRIDGE_PUBLIC_ACCOUNT;

        if (name === "vesto.bridge.lock.cid") {
          const payment = records.find(
            (record) =>
              record.type === "payment" &&
              (normaliseAccount(record.source_account) === BRIDGE_PUBLIC_ACCOUNT ||
                normaliseAccount(record.from) === BRIDGE_PUBLIC_ACCOUNT),
          );
          if (!payment) return;
          const asset =
            (payment.asset_type ?? "").toLowerCase() === "native"
              ? "XLM"
              : isSusdPayment(payment)
                ? "SUSD"
                : null;
          if (!asset) return;
          locks.push({
            id: hash,
            amount: payment.amount ?? "0",
            asset,
            chain: "EVM",
            recipient: payment.to ?? "",
            proofCid: decoded,
            memoHashHex,
            account: sourceAccount,
            createdAt,
            feeXlm,
            sigs,
            status: "Recorded",
          });
          return;
        }

        if (name === "vesto.bridge.mint.cid") {
          const payment = records.find(
            (record) =>
              record.type === "payment" &&
              isSusdPayment(record) &&
              normaliseAccount(record.source_account) === BRIDGE_PUBLIC_ACCOUNT,
          );
          if (!payment) return;
          mints.push({
            id: hash,
            amount: payment.amount ?? "0",
            asset: "SUSD",
            targetAccount: payment.to ?? "",
            proofCid: decoded,
            memoHashHex,
            createdAt,
            feeXlm,
            sigs,
            status: "Recorded",
          });
          return;
        }

        if (name === "vesto.bridge.redeem.cid") {
          const payment = records.find(
            (record) =>
              record.type === "payment" &&
              isSusdPayment(record) &&
              normaliseAccount(record.to) === BRIDGE_PUBLIC_ACCOUNT,
          );
          if (!payment) return;
          redeems.push({
            id: hash,
            amount: payment.amount ?? "0",
            asset: "SUSD",
            targetChain: "EVM",
            recipient: "",
            burnTx: undefined,
            proofCid: decoded,
            memoHashHex,
            createdAt,
            feeXlm,
            sigs,
            status: "Recorded",
          });
        }
      });
  });

  await Promise.all([
    ...locks.map(async (lock) => {
      const result = await getMetadata<BridgeLockMetadata>(
        lock.proofCid,
        lock.memoHashHex,
        BridgeLockMetadataSchema,
        "lock",
      );
      lock.status = result.status;
      if (result.data) {
        lock.recipient = result.data.recipient;
        lock.chain = "EVM";
        lock.amount = result.data.amount;
        lock.asset = result.data.asset.toUpperCase() === "SUSD" ? "SUSD" : "XLM";
      }
      lock.metadataError = result.error;
      if (result.status === "Invalid" && !lock.metadataError) {
        lock.metadataError = "memo-mismatch";
      }
    }),
    ...mints.map(async (mint) => {
      const result = await getMetadata<BridgeMintMetadata>(
        mint.proofCid,
        mint.memoHashHex,
        BridgeMintMetadataSchema,
        "mint",
      );
      mint.status = result.status;
      if (result.data) {
        mint.amount = result.data.amount;
        mint.targetAccount = result.data.targetAccount;
      }
      mint.metadataError = result.error;
      if (result.status === "Invalid" && !mint.metadataError) {
        mint.metadataError = "memo-mismatch";
      }
    }),
    ...redeems.map(async (redeem) => {
      const result = await getMetadata<BridgeRedeemMetadata>(
        redeem.proofCid,
        redeem.memoHashHex,
        BridgeRedeemMetadataSchema,
        "redeem",
      );
      redeem.status = result.status;
      if (result.data) {
        redeem.recipient = result.data.recipient;
        redeem.amount = result.data.amount;
        redeem.burnTx = result.data.burnTx;
      }
      redeem.metadataError = result.error;
      if (result.status === "Invalid" && !redeem.metadataError) {
        redeem.metadataError = "memo-mismatch";
      }
    }),
  ]);

  const stats = computeStats(locks, mints, redeems);
  debugObj("[bridge:ingest]", {
    locks: locks.length,
    mints: mints.length,
    redeems: redeems.length,
    totals: stats,
  });

  return { locks, mints, redeems, stats };
};

const computeStats = (locks: BridgeLock[], mints: BridgeMint[], redeems: BridgeRedeem[]): BridgeStats => {
  const now = Date.now();
  const isWithin = (timestamp: string, days: number) => {
    const created = Date.parse(timestamp);
    if (!Number.isFinite(created)) return false;
    return created >= now - days * DAY_MS;
  };

  const sumAmounts = (entries: { amount: string }[]): number =>
    entries.reduce((acc, entry) => {
      const parsed = Number.parseFloat(entry.amount);
      return Number.isFinite(parsed) ? acc + parsed : acc;
    }, 0);

  const formatTotal = (value: number): string => formatXLM(value);

  const lockXlmTotal = sumAmounts(locks.filter((lock) => lock.asset === "XLM"));
  const mintSusdTotal = sumAmounts(mints);
  const redeemSusdTotal = sumAmounts(redeems);

  const combinedCounts = [...locks, ...mints, ...redeems];

  const ops7d = combinedCounts.filter((entry) => isWithin(entry.createdAt, 7)).length;
  const ops30d = combinedCounts.filter((entry) => isWithin(entry.createdAt, 30)).length;

  return {
    totalLockedXlm: formatTotal(lockXlmTotal),
    totalMintedSusd: formatTotal(mintSusdTotal),
    totalRedeemedSusd: formatTotal(redeemSusdTotal),
    ops7d,
    ops30d,
  };
};

export const listLocks = async ({ limit = DEFAULT_LIMIT } = {}): Promise<BridgeLock[]> => {
  if (!isBridgeEnvConfigured || !BRIDGE_PUBLIC_ACCOUNT) return [];
  const snapshot = await ensureSnapshot(limit);
  return snapshot.locks;
};

export const listMints = async ({ limit = DEFAULT_LIMIT } = {}): Promise<BridgeMint[]> => {
  if (!isBridgeEnvConfigured || !BRIDGE_PUBLIC_ACCOUNT) return [];
  const snapshot = await ensureSnapshot(limit);
  return snapshot.mints;
};

export const listRedeems = async ({ limit = DEFAULT_LIMIT } = {}): Promise<BridgeRedeem[]> => {
  if (!isBridgeEnvConfigured || !BRIDGE_PUBLIC_ACCOUNT) return [];
  const snapshot = await ensureSnapshot(limit);
  return snapshot.redeems;
};

export const getBridgeStats = async ({ limit = DEFAULT_LIMIT } = {}): Promise<BridgeStats> => {
  if (!isBridgeEnvConfigured || !BRIDGE_PUBLIC_ACCOUNT) return EMPTY_STATS;
  const snapshot = await ensureSnapshot(limit);
  return snapshot.stats;
};
