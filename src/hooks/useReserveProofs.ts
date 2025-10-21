"use client";

import { useEffect, useMemo, useState } from "react";
import type { HorizonOperation } from "@/src/hooks/horizon";
import { resolveReserveProofs, type ReserveProofRecord } from "@/src/lib/spv/store";

export type UseReserveProofsState = {
  data: ReserveProofRecord[];
  isLoading: boolean;
  error?: Error;
};

const buildSignatureKey = (operations?: HorizonOperation[]): string =>
  operations
    ?.map((operation) => `${operation.id}:${operation.transaction_hash}:${operation.type}`)
    .join("|") ?? "";

export const useReserveProofs = (
  operations?: HorizonOperation[],
): UseReserveProofsState => {
  const [state, setState] = useState<UseReserveProofsState>({ data: [], isLoading: false });
  const signatureKey = useMemo(() => buildSignatureKey(operations), [operations]);

  useEffect(() => {
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

    resolveReserveProofs(operations)
      .then((records) => {
        if (cancelled) return;
        setState({ data: records, isLoading: false });
      })
      .catch((error) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error("Failed to resolve reserve proofs");
        setState({ data: [], isLoading: false, error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [operations, signatureKey]);

  return state;
};
