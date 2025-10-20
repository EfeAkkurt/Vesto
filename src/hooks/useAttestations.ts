"use client";

import { useEffect, useMemo, useState } from "react";
import type { HorizonEffect, HorizonOperation } from "@/src/hooks/horizon";
import { resolveAttestations } from "@/src/lib/attestations/store";
import type { Attestation } from "@/src/lib/types/proofs";

export type UseAttestationsState = {
  data: Attestation[];
  isLoading: boolean;
  error?: Error;
};

const buildSignatureKey = (operations?: HorizonOperation[], effects?: HorizonEffect[]): string => {
  const operationKey = operations?.map((operation) => `${operation.id}:${operation.transaction_hash}`).join("|") ?? "";
  const effectKey =
    effects?.map((effect) => `${effect.id ?? effect.paging_token ?? effect.type}:${effect.transaction_hash ?? ""}`).join("|") ?? "";
  return `${operationKey}::${effectKey}`;
};

export const useAttestations = (
  accountId?: string,
  operations?: HorizonOperation[],
  effects?: HorizonEffect[],
): UseAttestationsState => {
  const [state, setState] = useState<UseAttestationsState>({ data: [], isLoading: false });
  const signatureKey = useMemo(() => buildSignatureKey(operations, effects), [operations, effects]);

  useEffect(() => {
    if (!accountId) {
      setState({ data: [], isLoading: false });
      return;
    }

    if (!operations?.length) {
      setState({ data: [], isLoading: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({
      data: prev.data,
      isLoading: true,
      error: undefined,
    }));

    resolveAttestations(operations, effects ?? [])
      .then((attestations) => {
        if (cancelled) return;
        setState({ data: attestations, isLoading: false });
      })
      .catch((error) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error("Failed to resolve attestations");
        setState({ data: [], isLoading: false, error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, operations, effects, signatureKey]);

  return state;
};
