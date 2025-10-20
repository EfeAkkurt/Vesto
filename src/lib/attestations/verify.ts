import { Buffer } from "buffer";
import { sha256 } from "@noble/hashes/sha256";
import { serializeAttestationMessage, verifyEd25519 } from "@/src/lib/custodian/attestation";
import type { AttestationMetadata } from "@/src/lib/custodian/schema";
import { rawPublicKeyFromAddress } from "@/src/lib/stellar/keys";

const textEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

const encodeText = (value: string): Uint8Array => {
  if (!textEncoder) {
    return Buffer.from(value, "utf8");
  }
  return textEncoder.encode(value);
};

const tryDecodeBase64 = (value: string): Uint8Array | null => {
  try {
    return Buffer.from(value, "base64");
  } catch {
    return null;
  }
};

const hashSep23 = (payload: Uint8Array): Uint8Array => {
  const prefixBytes = encodeText("Stellar Signed Message:\n");
  const lengthBytes = new Uint8Array(4);
  new DataView(lengthBytes.buffer).setUint32(0, payload.length, true);
  const combined = new Uint8Array(prefixBytes.length + lengthBytes.length + payload.length);
  combined.set(prefixBytes, 0);
  combined.set(lengthBytes, prefixBytes.length);
  combined.set(payload, prefixBytes.length + lengthBytes.length);
  return Uint8Array.from(sha256(combined));
};

const hashSha256 = (payload: Uint8Array): Uint8Array => Uint8Array.from(sha256(payload));

export type SignatureBundle = {
  signatureString?: string;
  signatureBytes?: Uint8Array;
  publicKey?: string;
  nonce?: string;
  requestCid?: string;
  messageBase64?: string;
};

export type VerificationCandidate = {
  source: string;
  bytes: Uint8Array;
};

const dedupeCandidates = (candidates: VerificationCandidate[]): VerificationCandidate[] => {
  const seen = new Set<string>();
  const result: VerificationCandidate[] = [];
  for (const candidate of candidates) {
    const key = Buffer.from(candidate.bytes).toString("base64");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
};

export const buildVerificationCandidates = (
  metadata: AttestationMetadata,
  bundle: SignatureBundle,
): VerificationCandidate[] => {
  const candidates: VerificationCandidate[] = [];
  const messageBase64 = bundle.messageBase64?.trim();

  const registerCandidate = (source: string, bytes: Uint8Array | null | undefined) => {
    if (!bytes || bytes.length === 0) return;
    candidates.push({ source, bytes });
    candidates.push({ source: `${source}:sep23`, bytes: hashSep23(bytes) });
    candidates.push({ source: `${source}:sha256`, bytes: hashSha256(bytes) });
  };

  if (messageBase64) {
    registerCandidate("bundle:message-text", encodeText(messageBase64));
    registerCandidate("bundle:message-bytes", tryDecodeBase64(messageBase64));
  }

  if (bundle.nonce) {
    try {
      const message = {
        week: metadata.week,
        reserveAmount: metadata.reserveAmount,
        timestamp: metadata.timestamp,
        nonce: bundle.nonce,
      };
      const { base64, textBytes, canonicalBytes } = serializeAttestationMessage(message);
      registerCandidate("metadata:serialized-text", textBytes);
      registerCandidate("metadata:canonical-bytes", canonicalBytes);
      if (!messageBase64 || messageBase64 !== base64) {
        registerCandidate("metadata:serialized-bytes", tryDecodeBase64(base64));
      }
    } catch {
      // Ignore serialization issues; verification will fall back to bundle data.
    }
  }

  return dedupeCandidates(candidates);
};

export type VerificationOutcome =
  | { status: "Pending"; reason?: string }
  | { status: "Verified"; matched: string }
  | { status: "Invalid"; reason: string };

export const verifyAttestationSignature = async (
  metadata: AttestationMetadata,
  bundle: SignatureBundle,
): Promise<VerificationOutcome> => {
  if (!bundle.signatureBytes || !bundle.publicKey || !bundle.nonce) {
    const hasSignature = Boolean(bundle.signatureString);
    return {
      status: "Pending",
      reason: hasSignature ? "Awaiting attestation nonce or signer details" : "Awaiting attestation signature",
    };
  }

  let publicKeyRaw: Uint8Array;
  try {
    publicKeyRaw = rawPublicKeyFromAddress(bundle.publicKey);
  } catch {
    return {
      status: "Invalid",
      reason: "Invalid signer public key",
    };
  }

  const candidates = buildVerificationCandidates(metadata, bundle);
  if (!candidates.length) {
    return {
      status: "Pending",
      reason: "No verification payloads available yet",
    };
  }

  for (const candidate of candidates) {
    try {
      const verified = await verifyEd25519(publicKeyRaw, candidate.bytes, bundle.signatureBytes);
      if (verified) {
        return { status: "Verified", matched: candidate.source };
      }
    } catch {
      // Ignore individual candidate errors; try the next candidate.
    }
  }

  return {
    status: "Invalid",
    reason: "Signature verification failed",
  };
};
