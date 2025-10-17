declare module "base32.js" {
  type Base32Options = {
    type?: "crockford" | "base32" | "rfc4648";
    lc?: boolean;
  };

  class EncoderCodec {
    constructor(options?: Base32Options);
    write(data: Uint8Array | Buffer | string): this;
    finalize(): string;
  }

  class DecoderCodec {
    constructor(options?: Base32Options);
    write(data: Uint8Array | Buffer | string): this;
    finalize(): Uint8Array;
  }

  export class Encoder extends EncoderCodec {}
  export class Decoder extends DecoderCodec {}

  const base32: {
    Encoder: typeof Encoder;
    Decoder: typeof Decoder;
  };

  export default base32;
}
