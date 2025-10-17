"use client";

import { useMemo } from "react";
import { useLedgersLatest, type HorizonLedger } from "@/src/hooks/horizon";
import { STELLAR_NET } from "@/src/utils/constants";

export type NetworkHealth = {
  network: string;
  horizonHealthy: boolean;
  latencyMs: number;
  lastHorizonCheck: string;
  ledger?: HorizonLedger;
  isLoading: boolean;
  error?: Error;
};

const MAX_LEDGER_LAG_MS = 60_000;

export const useNetworkHealth = (): NetworkHealth => {
  const { data: ledger, error, isLoading } = useLedgersLatest();

  const latencyMs = useMemo(() => {
    if (!ledger?.closed_at) return 0;
    const closedAt = new Date(ledger.closed_at).getTime();
    return Math.max(0, Date.now() - closedAt);
  }, [ledger?.closed_at]);

  const networkEnv = STELLAR_NET ?? "TESTNET";
  const network = networkEnv.toUpperCase() === "TESTNET" ? "Testnet" : networkEnv.toUpperCase() === "MAINNET" ? "Mainnet" : networkEnv;

  return {
    network,
    horizonHealthy: latencyMs < MAX_LEDGER_LAG_MS && !error,
    latencyMs,
    lastHorizonCheck: new Date().toISOString(),
    ledger,
    isLoading,
    error: error ?? undefined,
  };
};
