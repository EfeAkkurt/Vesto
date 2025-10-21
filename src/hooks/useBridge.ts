"use client";

import useSWR from "swr";
import { listLocks, listMints, listRedeems, getBridgeStats } from "@/src/lib/bridge/ingest";
import type { BridgeLock, BridgeMint, BridgeRedeem, BridgeStats } from "@/src/lib/types/bridge";
import { swrDefaults, type RateLimitError } from "@/src/hooks/horizon";
import { isBridgeEnvConfigured } from "@/src/utils/constants";

type Fetcher<T> = () => Promise<T>;

const makeFetcher =
  <T,>(fetcher: Fetcher<T>) =>
  () =>
    fetcher();

const enabledKey = (key: string) => (isBridgeEnvConfigured ? key : null);

export const useBridgeLocks = () =>
  useSWR<BridgeLock[], RateLimitError>(enabledKey("bridge:locks"), makeFetcher(() => listLocks()), {
    ...swrDefaults,
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    fallbackData: isBridgeEnvConfigured ? undefined : [],
  });

export const useBridgeMints = () =>
  useSWR<BridgeMint[], RateLimitError>(enabledKey("bridge:mints"), makeFetcher(() => listMints()), {
    ...swrDefaults,
    refreshInterval: 20_000,
    revalidateOnFocus: true,
    fallbackData: isBridgeEnvConfigured ? undefined : [],
  });

export const useBridgeRedeems = () =>
  useSWR<BridgeRedeem[], RateLimitError>(enabledKey("bridge:redeems"), makeFetcher(() => listRedeems()), {
    ...swrDefaults,
    refreshInterval: 20_000,
    revalidateOnFocus: true,
    fallbackData: isBridgeEnvConfigured ? undefined : [],
  });

export const useBridgeStats = () =>
  useSWR<BridgeStats, RateLimitError>(enabledKey("bridge:stats"), makeFetcher(() => getBridgeStats()), {
    ...swrDefaults,
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    fallbackData: isBridgeEnvConfigured ? undefined : {
      totalLockedXlm: "0.0000000",
      totalMintedSusd: "0.0000000",
      totalRedeemedSusd: "0.0000000",
      ops7d: 0,
      ops30d: 0,
    },
  });
