import { z } from "zod";

const numberish = z.union([z.number(), z.string()]).transform((value) => {
  if (typeof value === "number") return value;
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error("Invalid number");
  }
  const normalised = cleaned.replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(normalised);
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid number");
  }
  return parsed;
});

const nonNegativeNumber = numberish.pipe(z.number().nonnegative());
const nonNegativeInt = numberish.pipe(z.number().int().nonnegative());

export const AttestationMetadataSchema = z.object({
  schema: z.string(),
  week: nonNegativeInt,
  reserveAmount: nonNegativeNumber,
  fileCid: z.string().min(1),
  proofCid: z.string().min(1).optional(),
  issuer: z.string().min(1),
  timestamp: z.string().min(1),
  mime: z.string().optional(),
  size: nonNegativeNumber.optional(),
  attestation: z
    .object({
      nonce: z.string().min(8),
      message: z.string().optional(),
      signedBy: z.string().optional(),
      signature: z.string().optional(),
      requestCid: z.string().optional(),
    })
    .optional(),
  request: z
    .object({
      cid: z.string().min(1),
      asset: z
        .object({
          type: z.string().optional(),
          name: z.string().optional(),
          valueUSD: nonNegativeNumber.optional(),
        })
        .optional(),
    })
    .optional(),
});

export type AttestationMetadata = z.infer<typeof AttestationMetadataSchema>;

export const AttestationMsgSchema = z.object({
  week: nonNegativeInt,
  reserveAmount: nonNegativeNumber,
  timestamp: z.string().min(1),
  nonce: z.string().min(8),
});

export type AttestationMsgShape = z.infer<typeof AttestationMsgSchema>;
