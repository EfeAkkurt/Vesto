import { decode as decodeCbor } from "cborg";
import { AttestationMetadataSchema, type AttestationMetadata } from "@/src/lib/custodian/schema";
import { TokenRequestMetadataSchema } from "@/src/lib/custodian/requests";
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

const metadataCache = new Map<string, Promise<unknown>>();
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

const fetchMetadata = async (cid: string): Promise<unknown> => {
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
      return decodeBytes(new Uint8Array(buffer));
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
  const strict = options.strict ?? false;
  try {
    const headStatus = await fetchHeadStatus(context.metadataCid).catch(() => 0);
    if (headStatus === 0) {
      throw new Error("fetchError");
    }
    if (headStatus >= 400) {
      throw new Error(`fetch:${headStatus}`);
    }

    const raw = await fetchMetadata(context.metadataCid);
    const attParsed = AttestationMetadataSchema.safeParse(raw);
    if (attParsed.success) {
      const metadata = attParsed.data;
      const joined = matchesJoinRule(metadata, context);
      if (joined) {
        return { status: "Verified", metadata };
      }

      if (strict) {
        return { status: "Invalid", metadata, reason: "mismatch" };
      }

      return { status: "Recorded", metadata, reason: "mismatch" };
    }

    const tokenParsed = TokenRequestMetadataSchema.safeParse(raw);
    if (tokenParsed.success) {
      const token = tokenParsed.data;
      const reserveRaw = token.asset.valueUSD;
      const reserve =
        typeof reserveRaw === "number"
          ? reserveRaw
          : Number.parseFloat(String(reserveRaw ?? 0)) || 0;
      const synthetic = AttestationMetadataSchema.parse({
        schema: token.schema,
        week: 0,
        reserveAmount: reserve,
        fileCid: token.proofCid,
        proofCid: token.proofCid,
        issuer: token.issuer,
        timestamp: token.timestamp,
        attestation: {
          signedBy: token.issuer,
          requestCid: context.requestCid ?? undefined,
        },
        request: {
          cid: context.requestCid ?? context.metadataCid,
          asset: {
            type: token.asset.type,
            name: token.asset.name,
            valueUSD: reserve,
          },
        },
      });
      return { status: "Verified", metadata: synthetic };
    }

    if (strict) {
      return { status: "Invalid", reason: "metadata-schema-mismatch" };
    }

    return { status: "Recorded", reason: "metadata-schema-mismatch" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "metadata-error";
    return { status: strict ? "Invalid" : "Recorded", reason };
  }
};
