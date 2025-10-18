"use client";

import useSWR from "swr";
import type { TokenizationRequest } from "@/src/lib/custodian/requests";
import { fetchTokenizationRequests } from "@/src/lib/custodian/requests";
import { HORIZON } from "@/src/utils/constants";

const REFRESH_INTERVAL_MS = 15_000;

type KeyTuple = ["tokenization-requests", string, number];

const fetcher = async ([, accountId, limit]: KeyTuple) => fetchTokenizationRequests(HORIZON, accountId, limit);

export const useTokenizationRequests = (accountId?: string, limit = 50) => {
  const swrKey = accountId ? (["tokenization-requests", accountId, limit] as KeyTuple) : null;
  const { data, error, isLoading, mutate } = useSWR<TokenizationRequest[]>(swrKey, fetcher, {
    refreshInterval: REFRESH_INTERVAL_MS,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  return {
    requests: data ?? [],
    isLoading: Boolean(isLoading && !data),
    error,
    mutate,
  };
};
