import { Buffer } from "buffer";
import { CID } from "multiformats/cid";
import { z } from "zod";
import { canonicalizeToCbor, verifyEd25519 } from "@/src/lib/custodian/attestation";
import { AttestationMetadataSchema } from "@/src/lib/custodian/schema";
import type { HorizonEffect, HorizonPayment } from "@/src/hooks/horizon";
import type { Attestation } from "@/src/lib/types/proofs";
import { IPFS_ENDPOINT } from "@/src/utils/constants";
import { rawPublicKeyFromAddress } from "@/src/lib/stellar/keys";

const ipfsBase = IPFS_ENDPOINT.replace(/\/$/, "");

const MetadataEnvelopeExtrasSchema = z.object({
  nonce: z.string().optional(),
  signature: z.string().optional(),
  publicKey: z.string().optional(),
  signedBy: z.string().optional(),
  attestation: z
    .object({
      nonce: z.string().optional(),
      signature: z.string().optional(),
      publicKey: z.string().optional(),
      signedBy: z.string().optional(),
    })
    .optional(),
});

type MetadataEnvelopeExtras = z.infer<typeof MetadataEnvelopeExtrasSchema>;

type MetadataEnvelope = {
  metadata: z.infer<typeof AttestationMetadataSchema>;
  extras: MetadataEnvelopeExtras;
};

const metadataCache = new Map<string, Promise<MetadataEnvelope>>();

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

const fetchMetadataEnvelope = async (cid: string): Promise<MetadataEnvelope> => {
  if (!metadataCache.has(cid)) {
    metadataCache.set(
      cid,
      (async () => {
        const response = await fetch(`${ipfsBase}/ipfs/${cid}`, {
          headers: { Accept: "application/json, application/cbor" },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch attestation metadata (${response.status})`);
        }
        const body = await response.json();
        return parseMetadata(body);
      })(),
    );
  }
  return metadataCache.get(cid)!;
};

const isAccountDataEffect = (effect: HorizonEffect): effect is HorizonEffect & { value: string } =>
  (effect.type === "data_created" || effect.type === "data_updated") && typeof effect.value === "string";

type SignatureBundle = {
  signatureString?: string;
  signatureBytes?: Uint8Array;
  publicKey?: string;
  nonce?: string;
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

const extractEffectEnvelope = (
  transactionHash: string,
  metadataCid: string,
  effects: HorizonEffect[],
): Partial<SignatureBundle> => {
  for (const effect of effects) {
    if (effect.transaction_hash !== transactionHash) continue;
    if (!isAccountDataEffect(effect)) continue;
    if (!effect.value) continue;

    try {
      const decoded = Buffer.from(effect.value, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      const cidMatch =
        typeof parsed.metadataCid === "string" ? parsed.metadataCid === metadataCid : true;

      if (!cidMatch) continue;

      return {
        signatureString: typeof parsed.signature === "string" ? parsed.signature : undefined,
        publicKey:
          typeof parsed.publicKey === "string"
            ? parsed.publicKey
            : typeof parsed.signedBy === "string"
              ? parsed.signedBy
              : undefined,
        nonce: typeof parsed.nonce === "string" ? parsed.nonce : undefined,
      };
    } catch {
      continue;
    }
  }

  return {};
};

const deriveSignatureBundle = (
  envelope: MetadataEnvelope,
  payment: HorizonPayment,
  metadataCid: string,
  effects: HorizonEffect[],
): SignatureBundle => {
  const { metadata, extras } = envelope;

  const attestationExtras = extras.attestation ?? {};
  const signatureCandidate =
    attestationExtras.signature ?? extras.signature ?? undefined;

  const publicKeyCandidate =
    attestationExtras.publicKey ??
    attestationExtras.signedBy ??
    extras.publicKey ??
    extras.signedBy ??
    payment.source_account ??
    payment.from;

  const nonceCandidate = attestationExtras.nonce ?? extras.nonce;

  const effectBundle = extractEffectEnvelope(payment.transaction_hash, metadataCid, effects);

  const signatureString = effectBundle.signatureString ?? signatureCandidate;
  const publicKey = effectBundle.publicKey ?? publicKeyCandidate ?? metadata.issuer;
  const nonce = effectBundle.nonce ?? nonceCandidate;

  const signatureBytes = signatureString ? decodeSignature(signatureString) ?? undefined : undefined;

  return {
    signatureString,
    signatureBytes,
    publicKey: publicKey ?? undefined,
    nonce: nonce ?? undefined,
  };
};

const determineStatus = async (
  metadata: z.infer<typeof AttestationMetadataSchema>,
  bundle: SignatureBundle,
): Promise<Attestation["status"]> => {
  if (!bundle.signatureBytes || !bundle.publicKey || !bundle.nonce) {
    return "Pending";
  }

  try {
    const message = {
      week: metadata.week,
      reserveAmount: metadata.reserveAmount,
      timestamp: metadata.timestamp,
      nonce: bundle.nonce,
    };
    const messageBytes = canonicalizeToCbor(message);
    const publicKeyRaw = rawPublicKeyFromAddress(bundle.publicKey);
    const verified = await verifyEd25519(publicKeyRaw, messageBytes, bundle.signatureBytes);
    return verified ? "Verified" : "Invalid";
  } catch {
    return "Invalid";
  }
};

type AttestationCandidate = {
  payment: HorizonPayment;
  metadataCid: string;
};

const buildAttestation = async (
  candidate: AttestationCandidate,
  effects: HorizonEffect[],
): Promise<Attestation | null> => {
  try {
    const envelope = await fetchMetadataEnvelope(candidate.metadataCid);
    const bundle = deriveSignatureBundle(envelope, candidate.payment, candidate.metadataCid, effects);
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
        url: `${ipfsBase}/ipfs/${envelope.metadata.fileCid}`,
      },
      metadataCid: candidate.metadataCid,
      signedBy,
      signature,
      signatureType: "ed25519",
      nonce: bundle.nonce ?? "",
      status,
      ts: envelope.metadata.timestamp,
      txHash: candidate.payment.transaction_hash,
    } satisfies Attestation;
  } catch {
    return null;
  }
};

const extractMemoCid = (payment: HorizonPayment): string | null => {
  const directMemo = payment.memo?.trim();
  if (directMemo) {
    try {
      CID.parse(directMemo);
      return directMemo;
    } catch {
      return null;
    }
  }

  const attrMemo = payment.transaction_attr?.memo?.trim();
  if (!attrMemo) return null;

  if (payment.transaction_attr?.memo_type && payment.transaction_attr.memo_type !== "text") {
    try {
      const bytes = Buffer.from(attrMemo, "base64");
      const cid = CID.decode(bytes).toString();
      return cid;
    } catch {
      return null;
    }
  }

  try {
    CID.parse(attrMemo);
    return attrMemo;
  } catch {
    return null;
  }
};

const dedupeCandidates = (payments: HorizonPayment[]): AttestationCandidate[] => {
  const map = new Map<string, AttestationCandidate>();
  payments.forEach((payment) => {
    const metadataCid = extractMemoCid(payment);
    if (!metadataCid) return;

    const existing = map.get(metadataCid);
    if (!existing) {
      map.set(metadataCid, { payment, metadataCid });
      return;
    }

    const existingDate = new Date(existing.payment.created_at).getTime();
    const currentDate = new Date(payment.created_at).getTime();
    if (currentDate > existingDate) {
      map.set(metadataCid, { payment, metadataCid });
    }
  });
  return Array.from(map.values());
};

export const resolveAttestations = async (
  payments?: HorizonPayment[],
  effects?: HorizonEffect[],
): Promise<Attestation[]> => {
  if (!payments?.length) return [];
  const candidates = dedupeCandidates(payments);
  const resolved = await Promise.all(candidates.map((candidate) => buildAttestation(candidate, effects ?? [])));
  return resolved
    .filter((item): item is Attestation => item !== null)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
};
