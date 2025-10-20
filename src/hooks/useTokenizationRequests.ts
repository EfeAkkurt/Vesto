"use client";

import useSWR from "swr";
import { fetchCustodianRequests, type CustodianRequestDiagnostics, type CustodianRequestResult } from "@/src/lib/custodian/requests";
import { CUSTODIAN_ACCOUNT, STELLAR_NET } from "@/src/utils/constants";
import { debugObj } from "@/src/lib/logging/logger";

const REFRESH_INTERVAL_MS = 12_000;
const KEY_PREFIX = "custodian-requests" as const;
const DEFAULT_LIMIT = 100;

type KeyTuple = [typeof KEY_PREFIX, string, string, number];

const EMPTY_DIAGNOSTICS: CustodianRequestDiagnostics = {
  timestamp: "",
  account: "",
  limit: 0,
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
};

const maskAccount = (value?: string) => {
  if (!value) return "";
  if (value.length <= 10) return value;
  return `${value.slice(0, 5)}…${value.slice(-4)}`;
};

const resolveAccount = (value?: string) => {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  const fallback = CUSTODIAN_ACCOUNT?.trim();
  return fallback || "";
};

const fetcher = async ([, accountId, , limit]: KeyTuple): Promise<CustodianRequestResult> => {
  if (!accountId) {
    return {
      items: [],
      diagnostics: {
        ...EMPTY_DIAGNOSTICS,
        limit,
      },
    };
  }
  return fetchCustodianRequests(accountId, limit);
};

export const useTokenizationRequests = (accountId?: string) => {
  const networkKey = STELLAR_NET?.trim() || "TESTNET";
  const resolvedAccount = resolveAccount(accountId);
  const limit = DEFAULT_LIMIT;

  const swrKey = resolvedAccount
    ? ([KEY_PREFIX, resolvedAccount, networkKey, limit] as KeyTuple)
    : null;

  const { data, error, isLoading, mutate } = useSWR<CustodianRequestResult>(swrKey, fetcher, {
    refreshInterval: REFRESH_INTERVAL_MS,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const diagnostics = data?.diagnostics ?? EMPTY_DIAGNOSTICS;

  const rescan = async () => {
    const result = await mutate();
    if (result && (result.items?.length ?? 0) === 0) {
      debugObj("[pipeline:custodian] rescan-empty", {
        account: maskAccount(result.diagnostics.account),
        totals: {
          horizon: result.diagnostics.horizonCount,
          accepted: result.diagnostics.acceptedCount,
          memo: result.diagnostics.memoSummary,
          drops: result.diagnostics.dropSummary,
        },
        lastQuery: result.diagnostics.timestamp,
        samples: result.diagnostics.samples,
      });
    }
    return result;
  };

  return {
    items: data?.items ?? [],
    diagnostics,
    isLoading: Boolean(isLoading && !data),
    error,
    mutate,
    rescan,
  };
};
