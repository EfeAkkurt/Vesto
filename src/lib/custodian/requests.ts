import { Buffer } from "buffer";
import { z } from "zod";
import type { HorizonPayment } from "@/src/hooks/horizon";
import { extractMemoCid } from "@/src/lib/horizon/memos";
import { getViaGateway } from "@/src/lib/ipfs/client";

const TokenRequestMetadataSchema = z.object({
  schema: z.string().min(1),
  asset: z.object({
    type: z.string().min(1),
    name: z.string().min(1),
    valueUSD: z.number().nonnegative(),
    expectedYieldPct: z.number().optional(),
  }),
  proofCid: z.string().min(1),
  proofUrl: z.string().optional(),
  issuer: z.string().min(1),
  timestamp: z.string().min(1),
});

export type TokenRequestMetadata = z.infer<typeof TokenRequestMetadataSchema>;

export type TokenizationRequest = {
  id: string;
  txHash: string;
  metadataCid: string;
  submittedAt: string;
  issuer: string;
  assetType: string;
  assetName: string;
  valueUSD: number;
  expectedYieldPct?: number;
  proofCid: string;
  proofUrl: string;
};

const metadataCache = new Map<string, Promise<TokenRequestMetadata>>();

const fetchMetadata = async (cid: string): Promise<TokenRequestMetadata> => {
  if (!metadataCache.has(cid)) {
    metadataCache.set(
      cid,
      (async () => {
        const url = `https://ipfs.io/ipfs/${cid}`;
        const res = await fetch(url, { headers: { Accept: "application/json, application/cbor" } });
        if (!res.ok) {
          throw new Error(`Failed to load token request metadata (${res.status})`);
        }
        const data = await res.json();
        return TokenRequestMetadataSchema.parse(data);
      })(),
    );
  }
  return metadataCache.get(cid)!;
};

const decodeLegacyMemo = (memo: string): string | null => {
  try {
    const buffer = Buffer.from(memo, "base64");
    return buffer.toString("utf8");
  } catch {
    return null;
  }
};

const extractRequestCid = (payment: HorizonPayment): string | null => {
  const cid = extractMemoCid(payment);
  if (cid) return cid;

  const memo = payment.memo?.trim();
  if (memo) {
    const decoded = decodeLegacyMemo(memo);
    if (decoded) return decoded;
  }

  const attrMemo = payment.transaction_attr?.memo?.trim();
  if (attrMemo) {
    const decoded = decodeLegacyMemo(attrMemo);
    if (decoded) return decoded;
  }

  return null;
};

export const resolveTokenizationRequests = async (
  payments: HorizonPayment[],
): Promise<TokenizationRequest[]> => {
  if (!payments.length) return [];

  const resolved = await Promise.all(
    payments.map(async (payment) => {
      const metadataCid = extractRequestCid(payment);
      if (!metadataCid) return null;
      try {
        const metadata = await fetchMetadata(metadataCid);
        const proofUrl = metadata.proofUrl ?? getViaGateway(metadata.proofCid);
        return {
          id: metadataCid,
          txHash: payment.transaction_hash,
          metadataCid,
          submittedAt: payment.created_at,
          issuer: metadata.issuer,
          assetType: metadata.asset.type,
          assetName: metadata.asset.name,
          valueUSD: metadata.asset.valueUSD,
          expectedYieldPct: metadata.asset.expectedYieldPct,
          proofCid: metadata.proofCid,
          proofUrl,
        } satisfies TokenizationRequest;
      } catch (error) {
        console.warn("Failed to resolve token request", { metadataCid, error });
        return null;
      }
    }),
  );

  const filtered: TokenizationRequest[] = [];
  resolved.forEach((item) => {
    if (item) filtered.push(item);
  });
  return filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
};
