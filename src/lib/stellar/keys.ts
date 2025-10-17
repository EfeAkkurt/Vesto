import nacl from "tweetnacl";
import { encodeEd25519PublicKey, decodeEd25519PublicKey, decodeEd25519SecretSeed } from "@/src/lib/stellar/strkey";

export type DerivedKeypair = {
  publicKey: string;
  publicKeyRaw: Uint8Array;
  secretSeedRaw: Uint8Array;
  secretKeyRaw: Uint8Array;
};

export const deriveKeypairFromSecret = (secret: string): DerivedKeypair => {
  const seed = decodeEd25519SecretSeed(secret);
  const keypair = nacl.sign.keyPair.fromSeed(seed);
  return {
    publicKey: encodeEd25519PublicKey(keypair.publicKey),
    publicKeyRaw: keypair.publicKey,
    secretSeedRaw: seed,
    secretKeyRaw: keypair.secretKey,
  };
};

export const rawPublicKeyFromAddress = (address: string): Uint8Array => decodeEd25519PublicKey(address);
