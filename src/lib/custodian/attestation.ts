import { encode } from "cborg";
import nacl from "tweetnacl";
import { loadStellar } from "@/src/lib/stellar/sdk";
import { AttestationMsgSchema, type AttestationMsgShape } from "@/src/lib/custodian/schema";

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

const normalizePrivateKey = (secretKey: Uint8Array): Uint8Array => {
  if (secretKey.length === nacl.sign.secretKeyLength) return secretKey;
  if (secretKey.length === nacl.sign.seedLength) {
    return nacl.sign.keyPair.fromSeed(secretKey).secretKey;
  }
  throw new Error("Invalid ed25519 private key length. Expected 32 or 64 bytes.");
};

export const signEd25519 = async (privateKeyRaw: Uint8Array, bytes: Uint8Array): Promise<Uint8Array> => {
  const imported = await importSubtleKey(privateKeyRaw, "private");
  if (imported) {
    const signature = await getSubtle()!.sign(
      imported.algorithm,
      imported.key,
      bytes as unknown as BufferSource,
    );
    return toUint8Array(signature);
  }

  const normalized = normalizePrivateKey(privateKeyRaw);
  return nacl.sign.detached(bytes, normalized);
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
  secret: string;
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
  }>;
  fetchBaseFee(): Promise<number>;
  submitTransaction(tx: unknown): Promise<{ hash: string }>;
};

type TransactionEnvelopeLike = {
  sign(...signers: Array<Record<string, unknown>>): void;
};

type TransactionBuilderLike = {
  addOperation(operation: unknown): TransactionBuilderLike;
  addMemo(memo: unknown): TransactionBuilderLike;
  setTimeout(timeout: number): TransactionBuilderLike;
  build(): TransactionEnvelopeLike;
};

type MemoFactory = {
  text(value: string): unknown;
  hash(value: string): unknown;
};

type OperationFactory = {
  payment(args: { destination: string; asset: unknown; amount: string }): unknown;
};

type KeypairFactory = {
  fromSecret(secret: string): Record<string, unknown> & { publicKey(): string };
};

type AssetFactory = {
  native(): unknown;
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

export const buildAndSubmitMemoTx = async ({
  secret,
  destination,
  memoCid,
  networkPassphrase,
  serverUrl,
  amount,
}: SubmitMemoTxArgs): Promise<{ txHash: string }> => {
  const stellar = await loadStellar();
  const ServerCtor = stellar.Server as unknown as new (serverUrl: string) => StellarServerLike;
  const TransactionBuilderCtor = stellar.TransactionBuilder as unknown as new (
    account: Record<string, unknown>,
    options: { fee: string; networkPassphrase: string },
  ) => TransactionBuilderLike;
  const operationFactory = stellar.Operation as unknown as OperationFactory;
  const memoFactory = stellar.Memo as unknown as MemoFactory;
  const keypairFactory = stellar.Keypair as unknown as KeypairFactory;
  const assetFactory = stellar.Asset as unknown as AssetFactory;
  const horizonUrl = serverUrl.replace(/\/$/, "");
  if (!horizonUrl) {
    throw new Error("Horizon server URL is required to submit attestation transactions.");
  }

  const trimmedSecret = secret.trim();
  if (!trimmedSecret) {
    throw new Error("Custodian secret key is required.");
  }

  const memoValue = memoCid.trim();
  if (!memoValue) {
    throw new Error("Attestation metadata CID is required.");
  }

  const server = new ServerCtor(horizonUrl);
  const signer = keypairFactory.fromSecret(trimmedSecret);
  const account = await server.loadAccount(signer.publicKey());
  const baseFee = await server.fetchBaseFee();

  const encoder = new TextEncoder();
  const memoBytes = encoder.encode(memoValue);
  const memo =
    memoBytes.byteLength <= 28 ? memoFactory.text(memoValue) : memoFactory.hash(await hashCidToHex(memoValue));

  const target = destination?.trim() || signer.publicKey();
  const tx = new TransactionBuilderCtor(account, {
    fee: baseFee.toString(),
    networkPassphrase,
  })
    .addOperation(
      operationFactory.payment({
        destination: target,
        asset: assetFactory.native(),
        amount: amount ?? "0.0000001",
      }),
    )
    .addMemo(memo)
    .setTimeout(60)
    .build();

  tx.sign(signer);
  const response = await server.submitTransaction(tx);
  return { txHash: response.hash };
};
