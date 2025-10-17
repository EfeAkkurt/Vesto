"use client";

import { useEffect, useMemo, useState } from "react";
import type { HorizonEffect, HorizonPayment } from "@/src/hooks/horizon";
import { resolveAttestations } from "@/src/lib/attestations/store";
import type { Attestation } from "@/src/lib/types/proofs";

export type UseAttestationsState = {
  data: Attestation[];
  isLoading: boolean;
  error?: Error;
};

const buildSignatureKey = (payments?: HorizonPayment[], effects?: HorizonEffect[]): string => {
  const paymentKey = payments?.map((payment) => `${payment.id}:${payment.transaction_hash}`).join("|") ?? "";
  const effectKey =
    effects?.map((effect) => `${effect.id ?? effect.paging_token ?? effect.type}:${effect.transaction_hash ?? ""}`).join("|") ?? "";
  return `${paymentKey}::${effectKey}`;
};

export const useAttestations = (
  accountId?: string,
  payments?: HorizonPayment[],
  effects?: HorizonEffect[],
): UseAttestationsState => {
  const [state, setState] = useState<UseAttestationsState>({ data: [], isLoading: false });
  const signatureKey = useMemo(() => buildSignatureKey(payments, effects), [payments, effects]);

  useEffect(() => {
    if (!accountId) {
      setState({ data: [], isLoading: false });
      return;
    }

    if (!payments?.length) {
      setState({ data: [], isLoading: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({
      data: prev.data,
      isLoading: true,
      error: undefined,
    }));

    resolveAttestations(payments, effects ?? [])
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
  }, [accountId, payments, effects, signatureKey]);

  return state;
};
