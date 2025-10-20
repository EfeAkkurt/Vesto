import { z } from "zod";

export const AttestationMetadataSchema = z.object({
  schema: z.string(),
  week: z.number().int().nonnegative(),
  reserveAmount: z.number().nonnegative(),
  fileCid: z.string().min(1),
  proofCid: z.string().min(1).optional(),
  issuer: z.string().min(1),
  timestamp: z.string().min(1),
  mime: z.string().optional(),
  size: z.number().nonnegative().optional(),
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
          valueUSD: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type AttestationMetadata = z.infer<typeof AttestationMetadataSchema>;

export const AttestationMsgSchema = z.object({
  week: z.number().int().nonnegative(),
  reserveAmount: z.number().nonnegative(),
  timestamp: z.string().min(1),
  nonce: z.string().min(8),
});

export type AttestationMsgShape = z.infer<typeof AttestationMsgSchema>;
