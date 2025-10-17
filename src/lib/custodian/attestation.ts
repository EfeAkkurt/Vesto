import { Buffer } from "buffer";
import { encode } from "cborg";
import nacl from "tweetnacl";
import {
  Asset,
  Keypair,
  Memo,
  Operation,
  Server,
  TransactionBuilder,
  hash as stellarHash,
} from "stellar-sdk";
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
      const key = await subtle.importKey("raw", rawKey, algorithm, false, type === "private" ? ["sign"] : ["verify"]);
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
    const signature = await getSubtle()!.sign(imported.algorithm, imported.key, bytes);
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
    return getSubtle()!.verify(imported.algorithm, imported.key, signature, bytes);
  }

  const normalizedKey = normalizePublicKey(publicKeyRaw);
  return nacl.sign.detached.verify(bytes, signature, normalizedKey);
};

export type MemoTxInput = {
  secret: string;
  memoTextCID: string;
  serverUrl: string;
  networkPassphrase: string;
};

const toTextMemo = (value: string): Memo => {
  const fitsText = /^[\x20-\x7E]*$/.test(value) && value.length <= 28;
  if (fitsText) {
    return Memo.text(value);
  }
  const digest = stellarHash(Buffer.from(value));
  return Memo.hash(digest);
};

export const buildAndSubmitMemoTx = async ({ secret, memoTextCID, serverUrl, networkPassphrase }: MemoTxInput): Promise<string> => {
  const keypair = Keypair.fromSecret(secret);
  const server = new Server(serverUrl, { allowHttp: serverUrl.startsWith("http://") });
  const account = await server.loadAccount(keypair.publicKey());
  const fee = await server.fetchBaseFee();

  const memo = toTextMemo(memoTextCID);

  const tx = new TransactionBuilder(account, {
    fee,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: keypair.publicKey(),
        asset: Asset.native(),
        amount: "0.0000001",
      }),
    )
    .addMemo(memo)
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
};
