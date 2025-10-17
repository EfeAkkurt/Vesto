import { keccak_256 } from "@noble/hashes/sha3";
import { decodeEd25519PublicKey } from "@/src/lib/stellar/strkey";

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export const isValidEth = (addr: string): boolean => {
  const normalized = addr.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    return false;
  }

  const hex = normalized.slice(2);
  const isAllLower = hex === hex.toLowerCase();
  const isAllUpper = hex === hex.toUpperCase();
  if (isAllLower || isAllUpper) {
    return true;
  }

  const hash = toHex(keccak_256(new TextEncoder().encode(hex.toLowerCase())));
  for (let index = 0; index < hex.length; index += 1) {
    const char = hex[index];
    if (/[a-fA-F]/.test(char)) {
      const nibble = parseInt(hash[index], 16);
      if ((nibble >= 8 && char !== char.toUpperCase()) || (nibble < 8 && char !== char.toLowerCase())) {
        return false;
      }
    }
  }
  return true;
};

export const isValidStellar = (addr: string): boolean => {
  try {
    decodeEd25519PublicKey(addr.trim());
    return true;
  } catch {
    return false;
  }
};
