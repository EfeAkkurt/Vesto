import { Buffer } from "buffer";
import { encode } from "cborg";
import nacl from "tweetnacl";
import { loadStellar } from "@/src/lib/stellar/sdk";
import { AttestationMsgSchema, type AttestationMsgShape } from "@/src/lib/custodian/schema";
import { signTx } from "@/lib/wallet/freighter";

export type AttestationMsg = AttestationMsgShape;

const subtleAlgorithms: ReadonlyArray<{ name: "Ed25519" | "NODE-ED25519" }> = [
  { name: "Ed25519" },
  { name: "NODE-ED25519" },
];

const toUint8Array = (value: ArrayBuffer | Uint8Array): Uint8Array =>
  value instanceof Uint8Array ? value : new Uint8Array(value);

const sortObject = (value: Record<string, unknown>): Record<string, unknown> => {
  const sorted = Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const entry = value[key];
      acc[key] = normalize(entry);
      return acc;
    }, {});
  return sorted;
};

const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }
  if (value && typeof value === "object" && !(value instanceof Uint8Array)) {
    return sortObject(value as Record<string, unknown>);
  }
  return value;
};

export const canonicalizeToCbor = (message: AttestationMsg): Uint8Array => {
  const parsed = AttestationMsgSchema.parse(message);
  const normalized = normalize(parsed) as Record<string, unknown>;
  return encode(normalized);
};

const textEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

export const serializeAttestationMessage = (message: AttestationMsg) => {
  const canonicalBytes = canonicalizeToCbor(message);
  const base64 = Buffer.from(canonicalBytes).toString("base64");
  const bytes = textEncoder?.encode(base64) ?? Buffer.from(base64, "utf8");
  return {
    canonicalBytes,
    base64,
    textBytes: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
  };
};

const getSubtle = () => (typeof globalThis !== "undefined" ? globalThis.crypto?.subtle ?? null : null);

type ImportedKey = { key: CryptoKey; algorithm: "Ed25519" | "NODE-ED25519" };

const importSubtleKey = async (
  rawKey: Uint8Array,
  type: "private" | "public",
): Promise<ImportedKey | null> => {
  const subtle = getSubtle();
  if (!subtle) return null;

  for (const algorithm of subtleAlgorithms) {
    try {
      const key = await subtle.importKey(
        "raw",
        rawKey as unknown as BufferSource,
        algorithm,
        false,
        type === "private" ? ["sign"] : ["verify"],
      );
      return { key, algorithm: algorithm.name };
    } catch (error) {
      if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
        console.warn(`Failed to import ${type} key for ${algorithm.name}`, error);
      }
    }
  }
  return null;
};

const normalizePublicKey = (publicKey: Uint8Array): Uint8Array => {
  if (publicKey.length === nacl.sign.publicKeyLength) return publicKey;
  throw new Error("Invalid ed25519 public key length. Expected 32 bytes.");
};

export const verifyEd25519 = async (
  publicKeyRaw: Uint8Array,
  bytes: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> => {
  const imported = await importSubtleKey(publicKeyRaw, "public");
  if (imported) {
    return getSubtle()!.verify(
      imported.algorithm,
      imported.key,
      signature as unknown as BufferSource,
      bytes as unknown as BufferSource,
    );
  }

  const normalizedKey = normalizePublicKey(publicKeyRaw);
  return nacl.sign.detached.verify(bytes, signature, normalizedKey);
};

type SubmitMemoTxArgs = {
  account: string;
  destination?: string;
  memoCid: string;
  networkPassphrase: string;
  serverUrl: string;
  amount?: string;
};

type StellarServerLike = {
  loadAccount(accountId: string): Promise<{
    id: string;
    account_id: string;
    sequence: string;
    last_modified_time?: string;
    thresholds: Record<string, number>;
    balances: Array<Record<string, unknown>>;
    signers: Array<Record<string, unknown>>;
    accountId(): string;
    sequenceNumber(): string;
    incrementSequenceNumber(): void;
  }>;
  fetchBaseFee(): Promise<number>;
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const digestSha256 = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const subtle = getSubtle();
  if (subtle) {
    const normalized =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes : bytes.slice();
    const digest = await subtle.digest("SHA-256", normalized.buffer as ArrayBuffer);
    return toUint8Array(digest);
  }
  const { sha256 } = await import("@noble/hashes/sha256");
  const result = sha256(bytes);
  return result instanceof Uint8Array ? result : Uint8Array.from(result);
};

const hashCidToHex = async (cid: string): Promise<string> => {
  const normalized = cid.trim();
  if (!normalized) {
    throw new Error("CID is required for attestation memo.");
  }
  const encoder = new TextEncoder();
  const cidBytes = encoder.encode(normalized);
  const digest = await digestSha256(cidBytes);
  return bytesToHex(digest);
};

type HorizonSubmitSuccess = {
  hash?: string;
  id?: string;
  transaction_hash?: string;
};

type HorizonSubmitFailure = {
  error?: string;
  title?: string;
  detail?: string;
  extras?: {
    result_codes?: {
      transaction?: string;
      operations?: string[];
    };
  };
};

const extractHorizonHash = (payload: HorizonSubmitSuccess): string => {
  if (payload.hash && payload.hash.length > 0) return payload.hash;
  if (payload.transaction_hash && payload.transaction_hash.length > 0) return payload.transaction_hash;
  if (payload.id && payload.id.length > 0) return payload.id;
  throw new Error("Horizon response missing transaction hash.");
};

const buildHorizonError = (status: number, payload: HorizonSubmitFailure | null, fallback: string): Error => {
  const base = payload ?? {};
  const codes = base.extras?.result_codes;
  const parts: string[] = [];

  if (codes?.transaction) {
    parts.push(codes.transaction);
  }
  if (codes?.operations?.length) {
    parts.push(`ops: ${codes.operations.join(", ")}`);
  }
  if (base.detail) {
    parts.push(base.detail);
  } else if (base.title) {
    parts.push(base.title);
  } else if (base.error) {
    parts.push(base.error);
  }

  const message =
    parts.length > 0 ? `Horizon submission failed (${status}): ${parts.join(" | ")}` : `Horizon submission failed (${status}): ${fallback}`;

  const error = new Error(message);
  (error as Error & { status?: number }).status = status;
  return error;
};

const submitSignedTransaction = async (serverUrl: string, signedTxXdr: string): Promise<string> => {
  const endpoint = `${serverUrl.replace(/\/$/, "")}/transactions`;
  const body = `tx=${encodeURIComponent(signedTxXdr)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      Accept: "application/json",
    },
    body,
  });

  const raw = await response.text();
  let parsed: Record<string, unknown> | null = null;

  if (raw) {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    throw buildHorizonError(response.status, parsed as HorizonSubmitFailure | null, raw || response.statusText || "Unknown error");
  }

  const payload = (parsed ?? {}) as HorizonSubmitSuccess;
  return extractHorizonHash(payload);
};

export const buildAndSubmitMemoTx = async ({
  account,
  destination,
  memoCid,
  networkPassphrase,
  serverUrl,
  amount,
}: SubmitMemoTxArgs): Promise<{ txHash: string }> => {
  const stellar = await loadStellar();
  const { Server, TransactionBuilder, Operation, Memo, Asset } = stellar as unknown as {
    Server: new (url: string) => StellarServerLike;
    TransactionBuilder: typeof import("stellar-sdk").TransactionBuilder;
    Operation: typeof import("stellar-sdk").Operation;
    Memo: typeof import("stellar-sdk").Memo;
    Asset: typeof import("stellar-sdk").Asset;
  };

  const horizonUrl = serverUrl.replace(/\/$/, "");
  if (!horizonUrl) {
    throw new Error("Horizon server URL is required to submit attestation transactions.");
  }
  const trimmedAccount = account.trim();
  if (!trimmedAccount) {
    throw new Error("Custodian account is required.");
  }
  const memoValue = memoCid.trim();
  if (!memoValue) {
    throw new Error("Attestation metadata CID is required.");
  }

  const server = new Server(horizonUrl);
  const sourceAccount = await server.loadAccount(trimmedAccount);
  const baseFee = await server.fetchBaseFee();

  const encodedMemo = (typeof TextEncoder !== "undefined" ? new TextEncoder() : null)?.encode(memoValue) ?? Buffer.from(memoValue, "utf8");
  const memo =
    encodedMemo.length <= 28 ? Memo.text(memoValue) : Memo.hash(await hashCidToHex(memoValue));

  const target = destination?.trim() || trimmedAccount;
  const tx = new TransactionBuilder(sourceAccount, {
    fee: baseFee.toString(),
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: target,
        asset: Asset.native(),
        amount: amount ?? "0.0000001",
      }),
    )
    .addMemo(memo)
    .setTimeout(60)
    .build();

  const { signedTxXdr } = await signTx(tx.toXDR(), {
    networkPassphrase,
    address: trimmedAccount,
  });

  const txHash = await submitSignedTransaction(horizonUrl, signedTxXdr);
  return { txHash };
};
