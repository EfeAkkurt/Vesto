"use client";

import useSWR from "swr";
import { mutate } from "swr";
import { getStoredProofs, upsertStoredProof, type StoredProof } from "@/src/lib/proofs/storage";

const LIST_KEY = "proofs:list" as const;

export type UseStoredProofsResult = {
  proofs: StoredProof[];
  isLoading: boolean;
  error?: Error;
  addProof: (entry: StoredProof) => Promise<void>;
  mutate: () => Promise<StoredProof[] | undefined>;
};

export const useStoredProofs = (): UseStoredProofsResult => {
  const { data, error, isLoading, mutate: mutateList } = useSWR<StoredProof[]>(LIST_KEY, getStoredProofs, {
    fallbackData: [],
  });

  const addProof = async (entry: StoredProof) => {
    const next = await upsertStoredProof(entry);
    await mutateList(next, false);
    await mutate("proofs:stats");
    await mutate("proofs:reserves");
  };

  return {
    proofs: data ?? [],
    isLoading: Boolean(isLoading && !data),
    error: error instanceof Error ? error : error ? new Error(String(error)) : undefined,
    addProof,
    mutate: mutateList,
  };
};
