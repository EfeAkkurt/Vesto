import { Buffer } from "buffer";
import { getViaGateway } from "@/src/lib/ipfs/client";
import type { HorizonOperation } from "@/src/hooks/horizon";
import { memoHashB64ToHex } from "@/src/lib/horizon/memos";
import { debugObj } from "@/src/lib/logging/logger";
import { hashCidMemoHex } from "@/src/lib/spv/hash";
import { ReserveMetadataSchema, type ReserveMetadata } from "@/src/lib/spv/schema";

const RESERVE_MANAGE_DATA_KEY = "vesto.reserve.cid";

export type ReserveProofRecord = {
  cid: string;
  txHash: string;
  memoHashHex?: string;
  status: "Verified" | "Recorded" | "Invalid";
  ts: string;
  metadata?: ReserveMetadata;
  metadataError?: string;
  gatewayUrl: string;
  signatureCount?: number;
  feeXlm?: number;
};

const metadataCache = new Map<string, Promise<ReserveMetadata>>();

const fetchReserveMetadata = async (cid: string): Promise<ReserveMetadata> => {
  if (!metadataCache.has(cid)) {
    metadataCache.set(
      cid,
      (async () => {
        const response = await fetch(getViaGateway(cid), {
          headers: { Accept: "application/json, application/cbor" },
        });
        if (!response.ok) {
          throw new Error(`Reserve metadata fetch failed (${response.status})`);
        }
        const payload = await response.json();
        return ReserveMetadataSchema.parse(payload);
      })(),
    );
  }
  return metadataCache.get(cid)!;
};

const decodeManageDataValue = (value?: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  try {
    const buffer = Buffer.from(value, "base64");
    const normalizedInput = value.replace(/=+$/u, "");
    const normalizedOutput = buffer.toString("base64").replace(/=+$/u, "");
    if (normalizedInput !== normalizedOutput) {
      return undefined;
    }
    return buffer.toString("utf8").trim();
  } catch {
    return undefined;
  }
};

const resolveMemoHash = (operation: HorizonOperation): string | undefined => {
  const transaction = operation.transaction_attr ?? (operation as unknown as { transaction?: unknown }).transaction;
  if (!transaction || typeof transaction !== "object") return undefined;
  const memoType = (transaction as { memo_type?: unknown }).memo_type;
  if (memoType !== "hash") return undefined;
  const base64 =
    (transaction as { memo_hash?: string | null }).memo_hash ??
    (transaction as { memo?: string | null }).memo ??
    null;
  if (!base64) return undefined;
  try {
    return memoHashB64ToHex(base64);
  } catch {
    return undefined;
  }
};

const feeFromOperation = (operation: HorizonOperation): number | undefined => {
  const transaction = operation.transaction_attr ?? (operation as unknown as { transaction?: unknown }).transaction;
  const fee = (transaction as { fee_charged?: string | number | null } | undefined)?.fee_charged;
  if (fee == null) return undefined;
  const numeric = typeof fee === "number" ? fee : Number.parseFloat(String(fee));
  if (!Number.isFinite(numeric)) return undefined;
  return numeric / 1e7;
};

const signatureCountFromOperation = (operation: HorizonOperation): number | undefined => {
  const transaction = operation.transaction_attr ?? (operation as unknown as { transaction?: unknown }).transaction;
  const signatures = (transaction as { signatures?: unknown } | undefined)?.signatures;
  return Array.isArray(signatures) ? signatures.length : undefined;
};

export const resolveReserveProofs = async (
  operations: HorizonOperation[],
): Promise<ReserveProofRecord[]> => {
  const proofs: ReserveProofRecord[] = [];

  for (const operation of operations) {
    if (operation.type !== "manage_data") continue;
    const name = typeof operation.name === "string" ? operation.name : "";
    if (name !== RESERVE_MANAGE_DATA_KEY) continue;

    const cid = decodeManageDataValue(operation.value);
    if (!cid) continue;

    const memoHashHex = resolveMemoHash(operation);
    const txHash = operation.transaction_hash ?? "";
    const createdAt = operation.created_at ?? new Date().toISOString();
    const gatewayUrl = getViaGateway(cid);

    let status: ReserveProofRecord["status"] = "Recorded";
    let metadata: ReserveMetadata | undefined;
    let metadataError: string | undefined;

    try {
      metadata = await fetchReserveMetadata(cid);
      status = "Verified";
    } catch (error) {
      metadataError = error instanceof Error ? error.message : "metadata-fetch-failed";
      status = "Recorded";
    }

    if (memoHashHex && status === "Verified") {
      try {
        const { hex } = await hashCidMemoHex(cid);
        if (hex.toLowerCase() !== memoHashHex.toLowerCase()) {
          status = "Invalid";
        }
      } catch (error) {
        metadataError = error instanceof Error ? error.message : "memo-hash-mismatch";
        status = "Invalid";
      }
    }

    proofs.push({
      cid,
      txHash,
      memoHashHex: memoHashHex ?? undefined,
      status,
      ts: createdAt,
      metadata,
      metadataError,
      gatewayUrl,
      signatureCount: signatureCountFromOperation(operation),
      feeXlm: feeFromOperation(operation),
    });
  }

  debugObj("[spv:reserve] proofs resolved", {
    total: proofs.length,
    verified: proofs.filter((proof) => proof.status === "Verified").length,
  });

  return proofs.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
};
