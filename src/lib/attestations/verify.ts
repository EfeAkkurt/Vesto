import { decode as decodeCbor } from "cborg";
import { z } from "zod";
import { AttestationMetadataSchema, type AttestationMetadata } from "@/src/lib/custodian/schema";
import { getViaGateway } from "@/src/lib/ipfs/client";

export type VerifyAttestationContext = {
  metadataCid: string;
  proofCid?: string | null;
  memoHashHex?: string | null;
  requestCid?: string | null;
  requestMemoHashHex?: string | null;
  manageDataName?: string | null;
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
  try {
    const metadata = await fetchMetadata(context.metadataCid);
    const manageName = context.manageDataName?.trim().toLowerCase();
    const hasManageData = manageName === "vesto.attestation.cid" || manageName === "vesto.reserve.cid";
    const joined = matchesJoinRule(metadata, context);

    if (hasManageData || joined) {
      return { status: "Verified", metadata };
    }

    if (options.strict) {
      return { status: "Invalid", metadata, reason: "join-mismatch" };
    }

    return { status: "Recorded", metadata, reason: "join-mismatch" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "metadata-error";
    return {
      status: "Recorded",
      reason: message,
    };
  }
};

const BRIDGE_RETRY_DELAYS_MS = [0, 5000, 15_000, 30_000] as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const encodeText = (value: string): Uint8Array => {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value);
  }
  const buffer = Buffer.from(value, "utf8");
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

const sha256HexString = async (value: string): Promise<string> => {
  if (typeof globalThis.crypto?.subtle !== "undefined") {
    const bytes = encodeText(value);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  const { createHash } = await import("crypto");
  return createHash("sha256").update(value).digest("hex");
};

const AmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => {
    const numeric = typeof value === "number" ? value : Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      throw new Error("Invalid amount");
    }
    return numeric.toFixed(7);
  });

const BridgeLockMetadataSchema = z.object({
  schema: z.literal("vesto.lock@1"),
  bridgeAccount: z.string(),
  chain: z.string(),
  asset: z.string(),
  assetIssuer: z.string().optional(),
  amount: AmountSchema,
  recipient: z.string(),
  timestamp: z.string(),
});

const BridgeMintMetadataSchema = z.object({
  schema: z.literal("vesto.mint@1"),
  bridgeAccount: z.string(),
  targetAccount: z.string(),
  amount: AmountSchema,
  asset: z.object({
    code: z.string(),
    issuer: z.string(),
  }),
  evmLockProofCid: z.string(),
  timestamp: z.string(),
});

const BridgeRedeemMetadataSchema = z.object({
  schema: z.literal("vesto.redeem@1"),
  bridgeAccount: z.string(),
  targetChain: z.string(),
  recipient: z.string(),
  amount: AmountSchema,
  asset: z.object({
    code: z.string(),
    issuer: z.string(),
  }),
  burnTx: z.string().optional(),
  timestamp: z.string(),
});

export type BridgeLockMetadata = z.infer<typeof BridgeLockMetadataSchema>;
export type BridgeMintMetadata = z.infer<typeof BridgeMintMetadataSchema>;
export type BridgeRedeemMetadata = z.infer<typeof BridgeRedeemMetadataSchema>;

export type VerifyBridgeMetadataResult<T> = {
  status: "Verified" | "Recorded" | "Invalid";
  metadata?: T;
  reason?: string;
};

const shouldRetry = (status: number) => status === 404 || status === 502 || status === 504;

const fetchBridgeMetadata = async <T>(
  cid: string,
  memoHashHex: string | undefined,
  schema: z.ZodSchema<T>,
): Promise<VerifyBridgeMetadataResult<T>> => {
  if (!cid) {
    return { status: "Recorded", reason: "missing-cid" };
  }
  const url = getViaGateway(cid);
  let headOk = false;

  for (let attempt = 0; attempt < BRIDGE_RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = BRIDGE_RETRY_DELAYS_MS[attempt];
    if (delay) await wait(delay);
    try {
      const head = await fetch(url, { method: "HEAD" });
      if (head.ok || head.status === 405) {
        headOk = true;
        break;
      }
      if (shouldRetry(head.status) && attempt < BRIDGE_RETRY_DELAYS_MS.length - 1) {
        continue;
      }
      return { status: "Recorded", reason: `head:${head.status}` };
    } catch {
      if (attempt === BRIDGE_RETRY_DELAYS_MS.length - 1) {
        return { status: "Recorded", reason: "head:failed" };
      }
    }
  }

  if (!headOk) {
    return { status: "Recorded", reason: "head:unavailable" };
  }

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return { status: "Recorded", reason: `get:${response.status}` };
    }
    const payload = (await response.json()) as unknown;
    const metadata = schema.parse(payload);
    const memoHex = (memoHashHex ?? "").replace(/^0x/i, "").toLowerCase();
    const cidHex = (await sha256HexString(cid)).toLowerCase();
    let status: "Verified" | "Recorded" | "Invalid" = "Recorded";
    if (memoHex) {
      status = memoHex === cidHex ? "Verified" : "Invalid";
    }
    return { status, metadata };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const reason = error.issues.map((issue) => issue.message).join("|") || "schema-invalid";
      return {
        status: "Invalid",
        reason,
      };
    }
    const message = error instanceof Error ? error.message : "metadata-error";
    return { status: "Recorded", reason: message };
  }
};

export const verifyBridgeMetadata = async (
  cid: string,
  memoHashHex: string | undefined,
  kind: "lock" | "mint" | "redeem",
): Promise<
  VerifyBridgeMetadataResult<BridgeLockMetadata | BridgeMintMetadata | BridgeRedeemMetadata>
> => {
  if (kind === "lock") {
    return fetchBridgeMetadata(cid, memoHashHex, BridgeLockMetadataSchema);
  }
  if (kind === "mint") {
    return fetchBridgeMetadata(cid, memoHashHex, BridgeMintMetadataSchema);
  }
  return fetchBridgeMetadata(cid, memoHashHex, BridgeRedeemMetadataSchema);
};
