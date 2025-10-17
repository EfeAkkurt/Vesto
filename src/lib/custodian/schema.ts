import { z } from "zod";

export const AttestationMetadataSchema = z.object({
  schema: z.string(),
  week: z.number().int().nonnegative(),
  reserveAmount: z.number().nonnegative(),
  fileCid: z.string().min(1),
  issuer: z.string().min(1),
  timestamp: z.string().min(1),
  mime: z.string().optional(),
  size: z.number().nonnegative().optional(),
});

export type AttestationMetadata = z.infer<typeof AttestationMetadataSchema>;

export const AttestationMsgSchema = z.object({
  week: z.number().int().nonnegative(),
  reserveAmount: z.number().nonnegative(),
  timestamp: z.string().min(1),
  nonce: z.string().min(8),
});

export type AttestationMsgShape = z.infer<typeof AttestationMsgSchema>;
