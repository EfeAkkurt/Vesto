import { Buffer } from "buffer";
import { decode } from "cborg";
import { z } from "zod";
import { CID } from "multiformats/cid";
import { AttestationMetadataSchema } from "@/src/lib/custodian/schema";
import type { HorizonEffect, HorizonOperation, HorizonPayment } from "@/src/hooks/horizon";
import type { Attestation } from "@/src/lib/types/proofs";
import { IPFS_GATEWAY } from "@/src/utils/constants";
import { extractMemoCid, memoHashB64ToHex } from "@/src/lib/horizon/memos";
import { verifyAttestationSignature, type SignatureBundle } from "@/src/lib/attestations/verify";

const ipfsBase = IPFS_GATEWAY.replace(/\/$/, "");
const absoluteUrlPattern = /^https?:\/\//i;

const buildGatewayUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (absoluteUrlPattern.test(trimmed)) return trimmed;
  const stripped = trimmed.replace(/^\/+/, "").replace(/^ipfs\/+/i, "");
  return `${ipfsBase}/${stripped}`;
};

const sharedTextDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;
const bytesToUtf8 = (bytes: Uint8Array): string =>
  sharedTextDecoder ? sharedTextDecoder.decode(bytes) : Buffer.from(bytes).toString("utf8");

const parseMetadataBody = (response: Response, bytes: Uint8Array): unknown => {
  if (bytes.byteLength === 0) {
    throw new Error("Empty attestation metadata response.");
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json") || contentType.includes("text/")) {
    const text = bytesToUtf8(bytes);
    return JSON.parse(text);
  }

  try {
    return decode(bytes);
  } catch {
    const text = bytesToUtf8(bytes);
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Failed to parse attestation metadata payload.");
    }
  }
};

const MetadataEnvelopeExtrasSchema = z.object({
  nonce: z.string().optional(),
  signature: z.string().optional(),
  publicKey: z.string().optional(),
  signedBy: z.string().optional(),
  requestCid: z.string().optional(),
  request: z
    .object({
      cid: z.string().min(1),
    })
    .optional(),
  attestation: z
    .object({
      nonce: z.string().optional(),
      signature: z.string().optional(),
      publicKey: z.string().optional(),
      signedBy: z.string().optional(),
      requestCid: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

type MetadataEnvelopeExtras = z.infer<typeof MetadataEnvelopeExtrasSchema>;

type MetadataEnvelope = {
  metadata: z.infer<typeof AttestationMetadataSchema>;
  extras: MetadataEnvelopeExtras;
};

const metadataCache = new Map<string, Promise<MetadataEnvelope>>();

const normaliseCid = (raw?: string | null): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    return CID.parse(value).toV1().toString();
  } catch {
    return null;
  }
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const parseMetadata = (raw: unknown): MetadataEnvelope => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid attestation metadata payload");
  }

  const base = raw as Record<string, unknown>;
  const candidate: Record<string, unknown> = { ...base };

  const coercedWeek = coerceNumber(candidate.week);
  if (coercedWeek != null) candidate.week = Math.trunc(coercedWeek);

  const coercedReserve = coerceNumber(candidate.reserveAmount);
  if (coercedReserve != null) candidate.reserveAmount = coercedReserve;

  const coercedSize = coerceNumber(candidate.size);
  if (coercedSize != null) candidate.size = coercedSize;

  const metadata = AttestationMetadataSchema.parse(candidate);
  const extras = MetadataEnvelopeExtrasSchema.parse(raw);

  return { metadata, extras };
};

const FALLBACK_GATEWAYS = [
  (process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "").trim(),
  (process.env.IPFS_GATEWAY ?? "").trim(),
  "https://gateway.lighthouse.storage/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
].filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);

const buildFallbackUrls = (cid: string): string[] =>
  FALLBACK_GATEWAYS.map((gateway) => {
    const normalised = gateway.endsWith("/") ? gateway.slice(0, -1) : gateway;
    return `${normalised}/${cid}`;
  });

const fetchMetadataEnvelope = async (cid: string): Promise<MetadataEnvelope> => {
  if (!metadataCache.has(cid)) {
    metadataCache.set(
      cid,
      (async () => {
        const urls = buildFallbackUrls(cid);
        const errors: Error[] = [];

        for (const url of urls) {
          try {
            const response = await fetch(url, {
              headers: { Accept: "application/json, application/cbor" },
            });
            if (!response.ok) {
              errors.push(new Error(`Gateway ${url} responded ${response.status}`));
              continue;
            }
            const arrayBuffer = await response.arrayBuffer();
            const body = parseMetadataBody(response, new Uint8Array(arrayBuffer));
            return parseMetadata(body);
          } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)));
          }
        }

        const message =
          errors.length > 0
            ? `Failed to fetch attestation metadata for ${cid}: ${errors[errors.length - 1]?.message ?? "unknown error"}`
            : `Failed to fetch attestation metadata for ${cid}`;
        throw new Error(message);
      })(),
    );
  }
  return metadataCache.get(cid)!;
};

const isAccountDataEffect = (effect: HorizonEffect): effect is HorizonEffect & { value: string } =>
  (effect.type === "data_created" || effect.type === "data_updated") && typeof effect.value === "string";

type EffectBundle = {
  metadataCid?: string;
  signatureString?: string;
  publicKey?: string;
  nonce?: string;
  requestCid?: string;
};

const mergeEffectBundle = (existing: EffectBundle | undefined, incoming: EffectBundle): EffectBundle => ({
  metadataCid: incoming.metadataCid ?? existing?.metadataCid,
  signatureString: incoming.signatureString ?? existing?.signatureString,
  publicKey: incoming.publicKey ?? existing?.publicKey,
  nonce: incoming.nonce ?? existing?.nonce,
  requestCid: incoming.requestCid ?? existing?.requestCid,
});

const buildEffectBundles = (effects: HorizonEffect[]): Map<string, EffectBundle> => {
  const map = new Map<string, EffectBundle>();
  for (const effect of effects) {
    if (!isAccountDataEffect(effect)) continue;
    const txHash = effect.transaction_hash;
    if (!txHash) continue;
    try {
      const decoded = Buffer.from(effect.value, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      const attestationExtras = (parsed.attestation ?? {}) as Record<string, unknown>;
      const metadataCidRaw =
        (typeof parsed.metadataCid === "string" && parsed.metadataCid) ||
        (typeof attestationExtras.metadataCid === "string" && attestationExtras.metadataCid) ||
        undefined;
      const bundle: EffectBundle = {
        metadataCid: normaliseCid(metadataCidRaw) ?? undefined,
        signatureString:
          (typeof parsed.signature === "string" && parsed.signature) ||
          (typeof attestationExtras.signature === "string" && attestationExtras.signature) ||
          undefined,
        publicKey:
          (typeof parsed.publicKey === "string" && parsed.publicKey) ||
          (typeof parsed.signedBy === "string" && parsed.signedBy) ||
          (typeof attestationExtras.publicKey === "string" && attestationExtras.publicKey) ||
          (typeof attestationExtras.signedBy === "string" && attestationExtras.signedBy) ||
          undefined,
        nonce:
          (typeof parsed.nonce === "string" && parsed.nonce) ||
          (typeof attestationExtras.nonce === "string" && attestationExtras.nonce) ||
          undefined,
        requestCid:
          (typeof parsed.requestCid === "string" && parsed.requestCid) ||
          (typeof attestationExtras.requestCid === "string" && attestationExtras.requestCid) ||
          undefined,
      };
      const merged = mergeEffectBundle(map.get(txHash), bundle);
      map.set(txHash, merged);
    } catch {
      continue;
    }
  }
  return map;
};

const mergeManageDataBundles = (
  operations: HorizonOperation[],
  effectBundles: Map<string, EffectBundle>,
) => {
  for (const operation of operations) {
    if (operation.type !== "manage_data") continue;
    const txHash = operation.transaction_hash;
    if (!txHash) continue;
    const rawValue = typeof operation.value === "string" ? operation.value : null;
    if (!rawValue) continue;
    const decoded = Buffer.from(rawValue, "base64").toString("utf8");
    let metadataCidRaw: string | undefined;
    let signatureString: string | undefined;
    let publicKey: string | undefined;
    let nonce: string | undefined;
    let requestCid: string | undefined;

    try {
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      const attestationExtras = (parsed.attestation ?? {}) as Record<string, unknown>;
      metadataCidRaw =
        (typeof parsed.metadataCid === "string" && parsed.metadataCid) ||
        (typeof attestationExtras.metadataCid === "string" && attestationExtras.metadataCid) ||
        undefined;
      signatureString =
        (typeof parsed.signature === "string" && parsed.signature) ||
        (typeof attestationExtras.signature === "string" && attestationExtras.signature) ||
        undefined;
      publicKey =
        (typeof parsed.publicKey === "string" && parsed.publicKey) ||
        (typeof parsed.signedBy === "string" && parsed.signedBy) ||
        (typeof attestationExtras.publicKey === "string" && attestationExtras.publicKey) ||
        (typeof attestationExtras.signedBy === "string" && attestationExtras.signedBy) ||
        undefined;
      nonce =
        (typeof parsed.nonce === "string" && parsed.nonce) ||
        (typeof attestationExtras.nonce === "string" && attestationExtras.nonce) ||
        undefined;
      requestCid =
        (typeof parsed.requestCid === "string" && parsed.requestCid) ||
        (typeof attestationExtras.requestCid === "string" && attestationExtras.requestCid) ||
        undefined;
    } catch {
      metadataCidRaw = decoded;
    }

    const bundle: EffectBundle = {
      metadataCid: metadataCidRaw ? normaliseCid(metadataCidRaw) ?? metadataCidRaw : undefined,
      signatureString,
      publicKey,
      nonce,
      requestCid,
    };
    const merged = mergeEffectBundle(effectBundles.get(txHash), bundle);
    effectBundles.set(txHash, merged);
  }
};

type PaymentExtractionResult = {
  payments: HorizonPayment[];
  memoHashByTx: Map<string, string>;
};

const buildPaymentsFromOperations = (operations: HorizonOperation[]): PaymentExtractionResult => {
  const memoAttrByTx = new Map<
    string,
    {
      memo_type?: string | null;
      memo?: string | null;
      signatures?: string[];
    }
  >();

  const normalizeMemoAttr = (
    txHash: string,
    candidate?: { memo_type?: string | null; memo?: string | null; signatures?: string[] },
  ) => {
    if (!candidate) return;
    const existing = memoAttrByTx.get(txHash) ?? {};
    if (candidate.memo_type && !existing.memo_type) {
      existing.memo_type = candidate.memo_type;
    }
    if (candidate.memo && !existing.memo) {
      existing.memo = candidate.memo;
    }
    if (candidate.signatures && candidate.signatures.length) {
      existing.signatures = candidate.signatures;
    }
    memoAttrByTx.set(txHash, existing);
  };

  for (const operation of operations) {
    const txHash = operation.transaction_hash;
    if (!txHash) continue;
    const attr =
      operation.transaction_attr ??
      ((operation as unknown as { transaction?: { memo_type?: string | null; memo?: string | null; signatures?: string[] } }).transaction ??
        undefined);
    normalizeMemoAttr(txHash, attr);
  }

  const memoHashByTx = new Map<string, string>();
  memoAttrByTx.forEach((attr, txHash) => {
    if (attr.memo && attr.memo_type === "hash") {
      try {
        const hash = memoHashB64ToHex(attr.memo).toLowerCase();
        memoHashByTx.set(txHash, hash);
      } catch {
        // ignore malformed memo
      }
    }
  });

  const payments: HorizonPayment[] = [];
  for (const operation of operations) {
    if (operation.type !== "payment") continue;
    const txHash = operation.transaction_hash;
    if (!txHash) continue;
    const attr = memoAttrByTx.get(txHash);
    const normalizedAttr = attr
      ? {
          memo_type: attr.memo_type ?? undefined,
          memo: attr.memo ?? undefined,
          signatures: attr.signatures,
        }
      : undefined;
    payments.push({
      id: operation.id,
      created_at: operation.created_at,
      type: "payment",
      amount: typeof operation.amount === "string" ? operation.amount : operation.amount != null ? String(operation.amount) : undefined,
      asset_type: typeof operation.asset_type === "string" ? operation.asset_type : undefined,
      asset_code: typeof operation.asset_code === "string" ? operation.asset_code : undefined,
      asset_issuer: typeof operation.asset_issuer === "string" ? operation.asset_issuer : undefined,
      transaction_hash: txHash,
      transaction_successful: operation.transaction_successful,
      source_account: operation.source_account ?? (typeof operation.from === "string" ? operation.from : undefined),
      to: typeof operation.to === "string" ? operation.to : undefined,
      from: typeof operation.from === "string" ? operation.from : operation.source_account,
      memo: normalizedAttr?.memo ?? null,
      transaction_attr: normalizedAttr,
    });
  }

  return { payments, memoHashByTx };
};

const decodeSignature = (value: string): Uint8Array | null => {
  if (/^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0) {
    const bytes = new Uint8Array(value.length / 2);
    for (let i = 0; i < value.length; i += 2) {
      bytes[i / 2] = Number.parseInt(value.slice(i, i + 2), 16);
    }
    return bytes;
  }
  try {
    return new Uint8Array(Buffer.from(value, "base64"));
  } catch {
    return null;
  }
};

const bytesToBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64");

const deriveSignatureBundle = (
  envelope: MetadataEnvelope,
  payment: HorizonPayment,
  effectBundle?: EffectBundle,
): SignatureBundle => {
  const { metadata, extras } = envelope;

  const attestationExtras = extras.attestation ?? {};
  const signatureCandidate =
    attestationExtras.signature ?? extras.signature ?? undefined;
  const messageCandidate =
    attestationExtras.message ?? (extras as { message?: unknown }).message ?? undefined;

  const publicKeyCandidate =
    attestationExtras.publicKey ??
    attestationExtras.signedBy ??
    extras.publicKey ??
    extras.signedBy ??
    payment.source_account ??
    payment.from;

  const nonceCandidate = attestationExtras.nonce ?? extras.nonce;

  const signatureString = effectBundle?.signatureString ?? signatureCandidate;
  const publicKey = effectBundle?.publicKey ?? publicKeyCandidate ?? metadata.issuer;
  const nonce = effectBundle?.nonce ?? nonceCandidate;
  const requestCid =
    effectBundle?.requestCid ??
    attestationExtras.requestCid ??
    extras.requestCid ??
    extras.request?.cid ??
    undefined;

  const signatureBytes = signatureString ? decodeSignature(signatureString) ?? undefined : undefined;

  return {
    signatureString,
    signatureBytes,
    publicKey: publicKey ?? undefined,
    nonce: nonce ?? undefined,
    requestCid,
    messageBase64: typeof messageCandidate === "string" ? messageCandidate : undefined,
  };
};

const determineStatus = async (
  metadata: z.infer<typeof AttestationMetadataSchema>,
  bundle: SignatureBundle,
): Promise<Attestation["status"]> => {
  const outcome = await verifyAttestationSignature(metadata, bundle);
  return outcome.status;
};

type AttestationCandidate = {
  payment: HorizonPayment;
  metadataCid: string;
  memoHashHex?: string;
};

const buildAttestation = async (
  candidate: AttestationCandidate,
  effectBundle?: EffectBundle,
): Promise<Attestation | null> => {
  try {
    const envelope = await fetchMetadataEnvelope(candidate.metadataCid);
    const bundle = deriveSignatureBundle(envelope, candidate.payment, effectBundle);
    const status = await determineStatus(envelope.metadata, bundle);
    const signature = bundle.signatureBytes
      ? bytesToBase64(bundle.signatureBytes)
      : bundle.signatureString ?? "";
    const signedBy =
      bundle.publicKey ??
      envelope.metadata.issuer ??
      candidate.payment.source_account ??
      candidate.payment.from ??
      "";

    return {
      week: envelope.metadata.week,
      reserveUSD: envelope.metadata.reserveAmount,
      ipfs: {
        hash: envelope.metadata.fileCid,
        url: buildGatewayUrl(envelope.metadata.fileCid),
      },
      metadataCid: candidate.metadataCid,
      memoHashHex: candidate.memoHashHex,
      signedBy,
      signature,
      signatureType: "ed25519",
      nonce: bundle.nonce ?? "",
      status,
      ts: envelope.metadata.timestamp,
      txHash: candidate.payment.transaction_hash,
      requestCid: bundle.requestCid,
    } satisfies Attestation;
  } catch {
    const fallbackSignedBy =
      candidate.payment.source_account ??
      candidate.payment.from ??
      effectBundle?.publicKey ??
      "";
    const fallbackSignature = effectBundle?.signatureString ?? "";
    const fallbackNonce = effectBundle?.nonce ?? "";
    return {
      week: 0,
      reserveUSD: 0,
      ipfs: {
        hash: candidate.metadataCid,
        url: buildGatewayUrl(candidate.metadataCid),
      },
      metadataCid: candidate.metadataCid,
      memoHashHex: candidate.memoHashHex,
      signedBy: fallbackSignedBy,
      signature: fallbackSignature,
      signatureType: "ed25519",
      nonce: fallbackNonce,
      status: "Pending",
      ts: candidate.payment.created_at,
      txHash: candidate.payment.transaction_hash,
      requestCid: effectBundle?.requestCid,
    } satisfies Attestation;
  }
};

const dedupeCandidates = (
  payments: HorizonPayment[],
  effectBundles: Map<string, EffectBundle>,
  memoHashByTx: Map<string, string>,
): AttestationCandidate[] => {
  const map = new Map<string, AttestationCandidate>();
  payments.forEach((payment) => {
    const txHash = payment.transaction_hash;
    const effect = txHash ? effectBundles.get(txHash) : undefined;
    const rawCid = extractMemoCid(payment) ?? effect?.metadataCid ?? null;
    const metadataCid = rawCid ? normaliseCid(rawCid) ?? rawCid : null;
    if (!metadataCid) return;

    const candidate: AttestationCandidate = {
      payment,
      metadataCid,
      memoHashHex: txHash ? memoHashByTx.get(txHash) : undefined,
    };

    const existing = map.get(metadataCid);
    if (!existing) {
      map.set(metadataCid, candidate);
      return;
    }

    const existingDate = new Date(existing.payment.created_at).getTime();
    const currentDate = new Date(payment.created_at).getTime();
    if (currentDate > existingDate) {
      map.set(metadataCid, candidate);
    }
  });
  return Array.from(map.values());
};

export const resolveAttestations = async (
  operations?: HorizonOperation[],
  effects?: HorizonEffect[],
): Promise<Attestation[]> => {
  if (!operations?.length) return [];
  const { payments, memoHashByTx } = buildPaymentsFromOperations(operations);
  if (!payments.length) return [];
  const effectBundles = buildEffectBundles(effects ?? []);
  mergeManageDataBundles(operations, effectBundles);
  const candidates = dedupeCandidates(payments, effectBundles, memoHashByTx);
  const resolved = await Promise.all(
    candidates.map((candidate) =>
      buildAttestation(candidate, candidate.payment.transaction_hash ? effectBundles.get(candidate.payment.transaction_hash) : undefined),
    ),
  );
  return resolved
    .filter((item): item is Attestation => item !== null)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
};
