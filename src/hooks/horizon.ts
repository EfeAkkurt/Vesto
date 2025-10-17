"use client";

import { useMemo } from "react";
import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";
import { Server, type ServerApi } from "stellar-sdk";
import { z } from "zod";
import { HORIZON } from "@/src/utils/constants";

const RATE_LIMIT_DELAY_MS = 15_000;
const DEFAULT_LIMIT = 25;

const HorizonAccountBalanceSchema = z.object({
  asset_type: z.string(),
  asset_code: z.string().optional(),
  asset_issuer: z.string().optional(),
  balance: z.string(),
});

const HorizonAccountSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  sequence: z.string(),
  last_modified_time: z.string().optional(),
  thresholds: z.object({
    low_threshold: z.number(),
    med_threshold: z.number(),
    high_threshold: z.number(),
  }),
  balances: z.array(HorizonAccountBalanceSchema),
});

const HorizonPaymentSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  type: z.string(),
  amount: z.string().optional(),
  asset_type: z.string().optional(),
  asset_code: z.string().optional(),
  asset_issuer: z.string().optional(),
  transaction_hash: z.string(),
  transaction_successful: z.boolean().optional(),
  source_account: z.string().optional(),
});

const HorizonLedgerSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  closed_at: z.string(),
  total_coins: z.string(),
  operation_count: z.number(),
  protocol_version: z.number(),
});

const PaymentCollectionSchema = z.object({
  _embedded: z.object({
    records: z.array(HorizonPaymentSchema),
  }),
});

export type HorizonAccount = z.infer<typeof HorizonAccountSchema>;
export type HorizonAccountBalance = z.infer<typeof HorizonAccountBalanceSchema>;
export type HorizonPayment = z.infer<typeof HorizonPaymentSchema>;
export type HorizonEffect = ServerApi.EffectRecord;
export type HorizonLedger = z.infer<typeof HorizonLedgerSchema>;

type HorizonCollection<T> = {
  _embedded: { records: T[] };
};

export type RateLimitError = Error & { status?: number; retryAfter?: number };

const toUrl = (path: string) => `${HORIZON}${path}`;

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/hal+json, application/json",
    },
  });

  if (!response.ok) {
    const error: RateLimitError = new Error(`Horizon request failed (${response.status})`);
    error.status = response.status;
    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get("Retry-After") ?? "", 10);
      error.retryAfter = Number.isFinite(retryAfter) ? retryAfter * 1000 : RATE_LIMIT_DELAY_MS;
    }
    throw error;
  }

  return response.json() as Promise<T>;
};

const withRateLimitRetry: SWRConfiguration["onErrorRetry"] = (error, key, config, revalidate, context) => {
  const rateError = error as RateLimitError;
  if (rateError?.status === 404) return;
  if (context.retryCount >= 5) return;

  const delay = rateError?.status === 429 ? rateError.retryAfter ?? RATE_LIMIT_DELAY_MS : Math.min(60_000, 2 ** context.retryCount * 1000);
  setTimeout(() => {
    revalidate({ retryCount: context.retryCount + 1 });
  }, delay);
};

const swrDefaults: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,
  refreshInterval: 30_000,
  shouldRetryOnError: true,
  onErrorRetry: withRateLimitRetry,
};

export const useAccount = (accountId?: string) => {
  const url = accountId ? toUrl(`/accounts/${accountId}`) : null;
  const response = useSWR<HorizonAccount, RateLimitError>(
    url,
    async (key) => HorizonAccountSchema.parse(await fetchJson(key)),
    swrDefaults,
  );
  return response;
};

export const useAccountPayments = (accountId?: string, limit = DEFAULT_LIMIT) => {
  const url = accountId
    ? toUrl(`/payments?for_account=${encodeURIComponent(accountId)}&order=desc&limit=${limit}`)
    : null;
  const response = useSWR<HorizonPayment[], RateLimitError>(
    url,
    async (key) => {
      const raw = await fetchJson(key);
      const parsed = PaymentCollectionSchema.parse(raw);
      return parsed._embedded.records;
    },
    swrDefaults,
  );
  return response;
};

export const useAccountEffects = (accountId?: string, limit = DEFAULT_LIMIT) => {
  const url = accountId
    ? toUrl(`/effects?for_account=${encodeURIComponent(accountId)}&order=desc&limit=${limit}`)
    : null;
  const response = useSWR<HorizonCollection<HorizonEffect>>(url, fetchJson, swrDefaults);
  const effects = useMemo(() => response.data?._embedded.records ?? [], [response.data]);
  return { ...response, data: effects } as SWRResponse<HorizonEffect[], RateLimitError>;
};

export const useLedgersLatest = () => {
  const response = useSWR<HorizonLedger, RateLimitError>(
    toUrl(`/ledgers/latest`),
    async (key) => HorizonLedgerSchema.parse(await fetchJson(key)),
    {
      ...swrDefaults,
      refreshInterval: 15_000,
    },
  );
  return response;
};

export const streamPayments = (
  accountId: string,
  onMessage: (payment: HorizonPayment) => void,
): (() => void) => {
  const server = new Server(HORIZON, { allowHttp: HORIZON.startsWith("http://") });
  const close = server
    .payments()
    .forAccount(accountId)
    .cursor("now")
    .stream({
      onmessage: (message) => {
        onMessage(message);
      },
      reconnectTimeout: RATE_LIMIT_DELAY_MS,
    });
  return () => close();
};
