"use client";

import { useMemo } from "react";
import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";
import { getServer as getHorizonServer } from "@/src/lib/stellar/sdk";

const RATE_LIMIT_DELAY_MS = 15_000;
const DEFAULT_LIMIT = 25;
const MAX_RETRY_COUNT = 5;

type HorizonThresholds = {
  low_threshold: number;
  med_threshold: number;
  high_threshold: number;
  [key: string]: unknown;
};

type HorizonSigner = {
  key: string;
  type: string;
  weight: number;
  [key: string]: unknown;
};

export type HorizonAccountBalance = {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
  [key: string]: unknown;
};

export type HorizonAccount = {
  id: string;
  account_id: string;
  sequence: string;
  last_modified_time?: string;
  thresholds: HorizonThresholds;
  balances: HorizonAccountBalance[];
  signers: HorizonSigner[];
  [key: string]: unknown;
};

export type HorizonPayment = {
  id: string;
  created_at: string;
  type: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  transaction_hash: string;
  transaction_successful?: boolean;
  source_account?: string;
  to?: string;
  from?: string;
  memo?: string | null;
  transaction_attr?: {
    memo_type?: string;
    memo?: string;
    signatures?: string[];
    fee_charged?: string;
    source_account?: string;
    memo_hash?: string | null;
  };
};
export type HorizonEffect = {
  id?: string;
  type?: string;
  transaction_hash?: string;
  value?: string;
  paging_token?: string;
  [key: string]: unknown;
};

export type HorizonOperation = {
  id: string;
  type: string;
  created_at: string;
  transaction_hash: string;
  transaction_successful?: boolean;
  source_account?: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  name?: string;
  value?: string | null;
  body?: unknown;
  memo?: string | null;
  transaction_attr?: {
    memo_type?: string | null;
    memo?: string | null;
    signatures?: string[];
    fee_charged?: string | null;
    source_account?: string | null;
    memo_hash?: string | null;
  };
  [key: string]: unknown;
};
export type HorizonLedger = {
  id: string;
  sequence: number;
  closed_at: string;
  total_coins: string;
  operation_count: number;
  protocol_version: number;
  [key: string]: unknown;
};

export type RateLimitError = Error & { status?: number; retryAfter?: number };

type CollectionPage<T> = {
  records: T[];
};

type PaymentCallBuilder = {
  forAccount(accountId: string): PaymentCallBuilder;
  order(direction: "asc" | "desc"): PaymentCallBuilder;
  limit(limit: number): PaymentCallBuilder;
  cursor(token: string): PaymentCallBuilder;
  join?(resource: string): PaymentCallBuilder;
  includeTransactions?(include: boolean): PaymentCallBuilder;
  call(): Promise<CollectionPage<HorizonPayment>>;
  stream(config: { onmessage: (record: HorizonPayment) => void; onerror?: (error: unknown) => void }): () => void;
};

type EffectCallBuilder = {
  forAccount(accountId: string): EffectCallBuilder;
  order(direction: "asc" | "desc"): EffectCallBuilder;
  limit(limit: number): EffectCallBuilder;
  call(): Promise<CollectionPage<HorizonEffect>>;
};

type OperationCallBuilder = {
  forAccount(accountId: string): OperationCallBuilder;
  order(direction: "asc" | "desc"): OperationCallBuilder;
  limit(limit: number): OperationCallBuilder;
  includeTransactions?(include: boolean): OperationCallBuilder;
  join?(resource: string): OperationCallBuilder;
  call(): Promise<CollectionPage<HorizonOperation>>;
};

type LedgerCallBuilder = {
  order(direction: "asc" | "desc"): LedgerCallBuilder;
  limit(limit: number): LedgerCallBuilder;
  call(): Promise<CollectionPage<HorizonLedger>>;
};

type StellarServer = {
  loadAccount(accountId: string): Promise<HorizonAccount>;
  fetchBaseFee(): Promise<number>;
  payments(): PaymentCallBuilder;
  effects(): EffectCallBuilder;
  operations(): OperationCallBuilder;
  ledgers(): LedgerCallBuilder;
  submitTransaction(tx: unknown): Promise<{ hash: string }>;
};

const parseRetryAfter = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 1_000 ? value : value * 1_000;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed * 1_000;
  }
  return undefined;
};

type SdkError = Error & {
  response?: {
    status?: number;
    statusText?: string;
    headers?: Headers | Record<string, unknown>;
    data?: unknown;
  };
  status?: number;
};

const getRetryAfterFromHeaders = (headers?: Headers | Record<string, unknown>): number | undefined => {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    const header = headers.get("Retry-After") ?? headers.get("retry-after");
    return parseRetryAfter(header ?? undefined);
  }
  const candidate =
    (headers["retry-after"] as unknown) ??
    (headers["Retry-After"] as unknown) ??
    (headers["Retry-after"] as unknown);
  return parseRetryAfter(candidate);
};

const toRateLimitError = (error: unknown): RateLimitError => {
  const baseMessage = "Horizon request failed";
  if (error instanceof Error) {
    const sdkError = error as SdkError;
    const message = sdkError.message && sdkError.message !== "" ? sdkError.message : baseMessage;
    const rateError: RateLimitError = sdkError;
    rateError.message = message;
    if (sdkError.response) {
      const { response } = sdkError;
      if (response.status != null) {
        rateError.status = response.status;
      }
      const retryAfter = getRetryAfterFromHeaders(response.headers);
      if (retryAfter != null) {
        rateError.retryAfter = retryAfter;
      }
      const data = response.data;
      if (data && typeof data === "object" && "title" in data && typeof data.title === "string") {
        rateError.message = `${message}: ${data.title}`;
      }
    } else if (sdkError.status != null) {
      rateError.status = sdkError.status;
    }
    return rateError;
  }
  const rateError: RateLimitError = new Error(baseMessage);
  return rateError;
};

const withRateLimitRetry: SWRConfiguration["onErrorRetry"] = (error, _key, _config, revalidate, context) => {
  const rateError = error as RateLimitError;
  if (rateError?.status === 404) return;
  if (context.retryCount >= MAX_RETRY_COUNT) return;
  const delay =
    rateError?.status === 429
      ? rateError.retryAfter ?? RATE_LIMIT_DELAY_MS
      : Math.min(60_000, 2 ** context.retryCount * 1_000);
  setTimeout(() => {
    revalidate({ retryCount: context.retryCount + 1 });
  }, delay);
};

export const swrDefaults: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,
  refreshInterval: 30_000,
  shouldRetryOnError: true,
  onErrorRetry: withRateLimitRetry,
};

export const wrapCall = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    throw toRateLimitError(error);
  }
};

const fetchAccount = async ([, accountId]: [string, string]): Promise<HorizonAccount> => {
  const server = (await getHorizonServer()) as unknown as StellarServer;
  const account = await wrapCall(() => server.loadAccount(accountId));
  return {
    id: account.id,
    account_id: account.account_id,
    sequence: account.sequence,
    last_modified_time: account.last_modified_time,
    thresholds: account.thresholds,
    balances: account.balances,
    signers: account.signers,
  };
};

const fetchPayments = async ([, accountId, limit]: [string, string, number | undefined]): Promise<HorizonPayment[]> => {
  const server = (await getHorizonServer()) as unknown as StellarServer;
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.trunc(limit!))) : DEFAULT_LIMIT;
  let builder = server.payments().forAccount(accountId).order("desc").limit(safeLimit);
  if (typeof builder.includeTransactions === "function") {
    builder = builder.includeTransactions(true);
  } else if (typeof builder.join === "function") {
    builder = builder.join("transactions");
  }
  const page = await wrapCall(() => builder.call());
  return page.records.map((record) => {
    if (record.transaction_attr || !(record as unknown as { transaction?: unknown }).transaction) {
      return record;
    }
    const tx = (record as unknown as { transaction?: unknown }).transaction;
    if (!tx || typeof tx !== "object") {
      return record;
    }
    return {
      ...record,
      transaction_attr: tx as HorizonPayment["transaction_attr"],
    };
  });
};

const fetchEffects = async ([, accountId, limit]: [string, string, number | undefined]): Promise<HorizonEffect[]> => {
  const server = (await getHorizonServer()) as unknown as StellarServer;
  const page = await wrapCall(() =>
    server.effects().forAccount(accountId).order("desc").limit(limit ?? DEFAULT_LIMIT).call(),
  );
  return page.records;
};

const fetchOperations = async ([, accountId, limit]: [string, string, number | undefined]): Promise<HorizonOperation[]> => {
  const server = (await getHorizonServer()) as unknown as StellarServer;
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.trunc(limit!))) : DEFAULT_LIMIT;
  let builder = server.operations().forAccount(accountId).order("desc").limit(safeLimit);
  if (typeof builder.includeTransactions === "function") {
    builder = builder.includeTransactions(true);
  } else if (typeof builder.join === "function") {
    builder = builder.join("transactions");
  }
  const page = await wrapCall(() => builder.call());
  return page.records.map((record) => {
    if (record.transaction_attr || !(record as unknown as { transaction?: unknown }).transaction) {
      return record;
    }
    const tx = (record as unknown as { transaction?: unknown }).transaction;
    if (!tx || typeof tx !== "object") {
      return record;
    }
    return {
      ...record,
      transaction_attr: tx as HorizonOperation["transaction_attr"],
    };
  });
};

const fetchLatestLedger = async (): Promise<HorizonLedger> => {
  const server = (await getHorizonServer()) as unknown as StellarServer;
  const page = await wrapCall(() => server.ledgers().order("desc").limit(1).call());
  if (!page.records.length) {
    throw new Error("No ledger records returned");
  }
  return page.records[0];
};

export const useAccount = (accountId?: string) =>
  useSWR<HorizonAccount, RateLimitError>(accountId ? ["account", accountId] : null, fetchAccount, {
    ...swrDefaults,
    refreshInterval: 15_000,
  });

export const useAccountPayments = (accountId?: string, limit = DEFAULT_LIMIT) =>
  useSWR<HorizonPayment[], RateLimitError>(
    accountId ? ["payments", accountId, limit] : null,
    fetchPayments,
    {
      ...swrDefaults,
      refreshInterval: 20_000,
    },
  );

export const useAccountEffects = (accountId?: string, limit = DEFAULT_LIMIT) => {
  const response = useSWR<HorizonEffect[], RateLimitError>(
    accountId ? ["effects", accountId, limit] : null,
    fetchEffects,
    {
      ...swrDefaults,
      refreshInterval: 30_000,
    },
  );
  const effects = useMemo(() => response.data ?? [], [response.data]);
  return {
    ...response,
    data: effects,
  } as SWRResponse<HorizonEffect[], RateLimitError>;
};

export const useAccountOperations = (accountId?: string, limit = DEFAULT_LIMIT) =>
  useSWR<HorizonOperation[], RateLimitError>(
    accountId ? ["operations", accountId, limit] : null,
    fetchOperations,
    {
      ...swrDefaults,
      refreshInterval: 20_000,
    },
  );

export const useLedgersLatest = () =>
  useSWR<HorizonLedger, RateLimitError>(["ledger", "latest"], fetchLatestLedger, {
    ...swrDefaults,
    refreshInterval: 15_000,
  });

export const streamPayments = async (
  accountId: string,
  onMessage: (record: HorizonPayment) => void,
  onError?: (error: RateLimitError) => void,
): Promise<() => void> => {
  const server = (await getHorizonServer()) as unknown as StellarServer;
  const close = server
    .payments()
    .forAccount(accountId)
    .cursor("now")
    .stream({
      onmessage: (record) => {
        onMessage(record as HorizonPayment);
      },
      onerror: (error) => {
        if (onError) {
          onError(toRateLimitError(error));
        }
      },
    });
  return () => {
    close();
  };
};
