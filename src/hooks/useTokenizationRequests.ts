"use client";

import useSWR from "swr";
import {
  fetchCustodianRequests,
  type CustodianRequestDiagnostics,
  type CustodianRequestResult,
} from "@/src/lib/custodian/requests";
import { CUSTODIAN_ACCOUNT, STELLAR_NET } from "@/src/utils/constants";

const REFRESH_INTERVAL_MS = 12_000;
const KEY_PREFIX = "custodian-requests" as const;
const DEFAULT_LIMIT = 100;

type KeyTuple = [typeof KEY_PREFIX, string, string, number];

const EMPTY_DIAGNOSTICS: CustodianRequestDiagnostics = {
  timestamp: "",
  account: "",
  limit: 0,
  total: 0,
  kept: 0,
  memoTypes: { cid: 0, hash: 0 },
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
    if (
      result &&
      (result.items?.length ?? 0) === 0 &&
      typeof window !== "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      console.groupCollapsed(
        "[custodian:report]",
        `account=${maskAccount(result.diagnostics.account)}`,
      );
      console.log("diagnostics", {
        total: result.diagnostics.total,
        kept: result.diagnostics.kept,
        memoTypes: result.diagnostics.memoTypes,
        droppedByReason: result.diagnostics.droppedByReason,
        lastQuery: result.diagnostics.timestamp,
      });
      result.diagnostics.samples.forEach((sample) => {
        console.log("sample", {
          to: maskAccount(sample.to),
          amount: sample.amount,
          memoType: sample.transaction?.memo_type,
          memo: sample.transaction?.memo,
          transactionHash: sample.transaction_hash,
        });
      });
      console.groupEnd();
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
