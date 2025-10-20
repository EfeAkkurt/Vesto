"use client";

import { z } from "zod";
import { PROOF_TYPE_OPTIONS, type ProofType } from "@/src/lib/types/proofs";

export const PROOF_STORAGE_KEY = "proofs:v1";

const STORED_PROOF_SCHEMA = z.object({
  metadataCid: z.string().min(1),
  cid: z.string().min(1),
  type: z.string().min(1),
  name: z.string().optional(),
  size: z.number().nonnegative().optional(),
  mime: z.string().optional(),
  sha256: z.string().min(1),
  uploadedAt: z.string().min(1),
});

export type StoredProof = z.infer<typeof STORED_PROOF_SCHEMA> & {
  type: ProofType;
};

const safeParseProofs = (payload: unknown): StoredProof[] => {
  if (!Array.isArray(payload)) return [];
  const knownTypes = new Set(PROOF_TYPE_OPTIONS);
  return payload
    .map((item) => {
      try {
        const parsed = STORED_PROOF_SCHEMA.parse(item);
        const type = knownTypes.has(parsed.type as ProofType) ? (parsed.type as ProofType) : "Other";
        return {
          ...parsed,
          type,
        } satisfies StoredProof;
      } catch {
        return null;
      }
    })
    .filter((item): item is StoredProof => item !== null);
};

const readFromStorage = (): StoredProof[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROOF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return safeParseProofs(parsed);
  } catch {
    return [];
  }
};

const writeToStorage = (entries: StoredProof[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROOF_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore write failures (quota or private mode).
  }
};

export const getStoredProofs = async (): Promise<StoredProof[]> => readFromStorage();

export const upsertStoredProof = async (entry: StoredProof): Promise<StoredProof[]> => {
  const records = readFromStorage();
  const knownTypes = new Set(PROOF_TYPE_OPTIONS);
  const normalized: StoredProof = {
    ...entry,
    type: knownTypes.has(entry.type) ? entry.type : "Other",
  };
  const next = records.filter(
    (item) =>
      item.metadataCid !== normalized.metadataCid &&
      item.cid !== normalized.cid &&
      item.sha256 !== normalized.sha256,
  );
  next.unshift({
    ...normalized,
    uploadedAt: normalized.uploadedAt ?? new Date().toISOString(),
  });
  writeToStorage(next);
  return next;
};

export const replaceStoredProofs = async (entries: StoredProof[]): Promise<StoredProof[]> => {
  writeToStorage(entries);
  return entries;
};
