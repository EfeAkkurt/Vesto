import { z } from "zod";

export const ReserveMetadataSchema = z.object({
  schema: z.literal("vesto.reserve@1"),
  week: z.coerce.number().int().nonnegative(),
  reserveUSD: z.coerce.number(),
  spvBalanceXLM: z.string().min(1),
  spvBalanceSUSD: z.string().min(1),
  asOf: z.string().min(1),
  lastTx: z.string().optional(),
  notes: z.string().optional(),
});

export type ReserveMetadata = z.infer<typeof ReserveMetadataSchema>;
