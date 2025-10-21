import { Buffer } from "buffer";

const textEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

export const encodeUtf8 = (value: string): Uint8Array =>
  textEncoder?.encode(value) ?? Buffer.from(value, "utf8");

export const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const digestSha256 = async (bytes: Uint8Array): Promise<Uint8Array> => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    const normalized =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes : bytes.slice();
    const digest = await globalThis.crypto.subtle.digest("SHA-256", normalized.buffer as ArrayBuffer);
    return new Uint8Array(digest);
  }
  const { sha256 } = await import("@noble/hashes/sha256");
  return sha256(bytes) as Uint8Array;
};

export const hashCidMemoHex = async (cid: string): Promise<{ hex: string; bytes: Uint8Array }> => {
  const cidBytes = encodeUtf8(cid);
  const digest = await digestSha256(cidBytes);
  return { hex: bytesToHex(digest), bytes: digest };
};

export const cidToBase64 = (cid: string): string => {
  const trimmed = cid.trim();
  if (!trimmed) {
    throw new Error("CID must be a non-empty string.");
  }
  return Buffer.from(trimmed, "utf8").toString("base64");
};

export const cidSha256Hex = async (cid: string): Promise<string> => {
  const { hex } = await hashCidMemoHex(cid);
  return hex;
};
