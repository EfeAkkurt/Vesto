"use client";

import useSWR from "swr";
import { getServer as getHorizonServer } from "@/src/lib/stellar/sdk";

type HorizonServerLike = {
  assets(): {
    forCode(code: string): {
      forIssuer(issuer: string): {
        call(): Promise<{ records: Array<{ amount?: string }> }>;
      };
    };
  };
};

const fetchAssetSupply = async (_: string, code: string, issuer: string) => {
  const server = (await getHorizonServer()) as unknown as HorizonServerLike;
  const page = await server.assets().forCode(code).forIssuer(issuer).call();
  if (!page.records.length) return 0;
  const amount = Number.parseFloat(page.records[0].amount ?? "0");
  return Number.isFinite(amount) ? amount : 0;
};

export const useAssetSupply = (code?: string, issuer?: string) => {
  const key = code && issuer ? ["asset-supply", code, issuer] : null;
  return useSWR(key, fetchAssetSupply, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });
};
