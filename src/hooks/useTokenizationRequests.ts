"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccountPayments } from "@/src/hooks/horizon";
import type { TokenizationRequest } from "@/src/lib/custodian/requests";
import { resolveTokenizationRequests } from "@/src/lib/custodian/requests";

type RequestState = {
  data: TokenizationRequest[];
  isResolving: boolean;
  error?: Error;
};

export const useTokenizationRequests = (accountId?: string, limit = 50) => {
  const paymentsResponse = useAccountPayments(accountId, limit);
  const [state, setState] = useState<RequestState>({ data: [], isResolving: false });

  useEffect(() => {
    if (!accountId) {
      setState({ data: [], isResolving: false });
      return;
    }

    const payments = paymentsResponse.data;
    if (!payments) {
      setState((prev) => ({ ...prev, isResolving: false }));
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, isResolving: true }));

    resolveTokenizationRequests(payments)
      .then((resolved) => {
        if (cancelled) return;
        setState({ data: resolved, isResolving: false });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ data: [], isResolving: false, error: error instanceof Error ? error : new Error("Failed to load requests") });
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, paymentsResponse.data]);

  return useMemo(
    () => ({
      requests: state.data,
      isLoading: paymentsResponse.isLoading || state.isResolving,
      error: state.error ?? paymentsResponse.error,
    }),
    [paymentsResponse.error, paymentsResponse.isLoading, state.data, state.error, state.isResolving],
  );
};
