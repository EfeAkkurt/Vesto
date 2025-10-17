/* eslint-disable @typescript-eslint/no-require-imports */

const nacl = require("tweetnacl");
const { Buffer } = require("buffer");

const toUint8 = (value) => {
  if (value instanceof Uint8Array) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  const buffer = Buffer.from(value);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

const actualMethods = {
  generate(secretKey) {
    const seed = toUint8(secretKey);
    const keypair = nacl.sign.keyPair.fromSeed(seed);
    return Buffer.from(keypair.publicKey);
  },
  sign(data, secretKey) {
    const messageView = toUint8(data);
    const secret = toUint8(secretKey);
    const signature = nacl.sign.detached(messageView, secret);
    return Buffer.from(signature);
  },
  verify(data, signature, publicKey) {
    const message = toUint8(data);
    const sig = toUint8(signature);
    const pub = toUint8(publicKey);
    try {
      return nacl.sign.detached.verify(message, sig, pub);
    } catch {
      return false;
    }
  },
};

module.exports = {
  FastSigning: false,
  generate(secretKey) {
    return actualMethods.generate(secretKey);
  },
  sign(data, secretKey) {
    return actualMethods.sign(data, secretKey);
  },
  verify(data, signature, publicKey) {
    return actualMethods.verify(data, signature, publicKey);
  },
};
