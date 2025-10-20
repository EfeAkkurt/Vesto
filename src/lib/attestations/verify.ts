import { decode as decodeCbor } from "cborg";
import { AttestationMetadataSchema, type AttestationMetadata } from "@/src/lib/custodian/schema";
import { getViaGateway } from "@/src/lib/ipfs/client";

export type VerifyAttestationContext = {
  metadataCid: string;
  proofCid?: string | null;
  memoHashHex?: string | null;
  requestCid?: string | null;
  requestMemoHashHex?: string | null;
};

export type VerifyAttestationOptions = {
  strict?: boolean;
  now?: number;
};

export type VerifyAttestationResult = {
  status: "Verified" | "Recorded" | "Invalid";
  metadata?: AttestationMetadata;
  reason?: string;
};

const metadataCache = new Map<string, Promise<AttestationMetadata>>();
const headStatusCache = new Map<string, Promise<number>>();

const fetchHeadStatus = async (cid: string): Promise<number> => {
  if (!headStatusCache.has(cid)) {
    const promise = (async () => {
      try {
        const url = getViaGateway(cid);
        const response = await fetch(url, { method: "HEAD" });
        return response.status;
      } catch {
        return 0;
      }
    })();
    promise
      .then((status) => {
        if (status === 0 || status >= 400) {
          headStatusCache.delete(cid);
        }
      })
      .catch(() => {
        headStatusCache.delete(cid);
      });
    headStatusCache.set(cid, promise);
  }
  return headStatusCache.get(cid)!;
};

const decodeBytes = (bytes: Uint8Array): unknown => {
  try {
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  } catch {
    try {
      return decodeCbor(bytes);
    } catch (error) {
      throw error instanceof Error ? error : new Error("Failed to decode attestation metadata");
    }
  }
};

const fetchMetadata = async (cid: string): Promise<AttestationMetadata> => {
  if (!metadataCache.has(cid)) {
    const promise = (async () => {
      const url = getViaGateway(cid);
      const response = await fetch(url, {
        headers: { Accept: "application/json, application/cbor" },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata (${response.status})`);
      }
      const buffer = await response.arrayBuffer();
      const parsed = decodeBytes(new Uint8Array(buffer));
      return AttestationMetadataSchema.parse(parsed);
    })();
    promise.catch(() => {
      metadataCache.delete(cid);
    });
    metadataCache.set(cid, promise);
  }
  return metadataCache.get(cid)!;
};

const equalsIgnoreCase = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
};

const matchesJoinRule = (
  metadata: AttestationMetadata,
  context: VerifyAttestationContext,
): boolean => {
  const proofCidMatch = Boolean(
    metadata.proofCid &&
      context.proofCid &&
      equalsIgnoreCase(metadata.proofCid, context.proofCid),
  );

  const requestCidMatch = Boolean(
    metadata.request?.cid &&
      context.requestCid &&
      equalsIgnoreCase(metadata.request.cid, context.requestCid),
  );

  const attestationRequestMatch = Boolean(
    metadata.attestation?.requestCid &&
      context.requestCid &&
      equalsIgnoreCase(metadata.attestation.requestCid, context.requestCid),
  );

  const memoHashMatch = Boolean(
    context.memoHashHex &&
      context.requestMemoHashHex &&
      equalsIgnoreCase(context.memoHashHex, context.requestMemoHashHex),
  );

  return proofCidMatch || requestCidMatch || attestationRequestMatch || memoHashMatch;
};

export const verifyAttestation = async (
  context: VerifyAttestationContext,
  options: VerifyAttestationOptions = {},
): Promise<VerifyAttestationResult> => {
  const status = await fetchHeadStatus(context.metadataCid).catch(() => 0);
  if (status === 0) {
    return { status: "Recorded", reason: "fetchError" };
  }
  if (status >= 400) {
    return { status: "Recorded", reason: `fetch:${status}` };
  }

  try {
    const metadata = await fetchMetadata(context.metadataCid);
    const joined = matchesJoinRule(metadata, context);
    if (joined) {
      return { status: "Verified", metadata };
    }

    if (options.strict ?? true) {
      return { status: "Invalid", metadata, reason: "mismatch" };
    }

    return { status: "Recorded", metadata, reason: "mismatch" };
  } catch (error) {
    return {
      status: "Recorded",
      reason: error instanceof Error ? error.message : "metadata-error",
    };
  }
};
