"use client";

import useSWR from "swr";
import { getServer as getHorizonServer } from "@/src/lib/stellar/sdk";
import { swrDefaults, wrapCall, type RateLimitError } from "@/src/hooks/horizon";
import { fetchSpvIncome } from "@/src/lib/spv/ingest";
import { getHolders } from "@/src/lib/spv/holders";
import { getSpvAccount, getSusdAssetOrNull } from "@/src/utils/constants";
import type { SpvBalanceSummary, SpvHolder, SpvIncome } from "@/src/lib/types/spv";

type AccountsCallBuilder = {
  accountId(accountId: string): {
    call(): Promise<{
      id: string;
      account_id: string;
      last_modified_time?: string;
      balances: Array<{
        asset_type: string;
        balance: string;
        asset_code?: string;
        asset_issuer?: string;
      }>;
    }>;
  };
};

type HorizonServer = {
  accounts(): AccountsCallBuilder;
};

const toNumber = (value?: string | null): number => {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fetchSpvBalance = async (): Promise<SpvBalanceSummary> => {
  const accountId = getSpvAccount();
  const server = (await getHorizonServer()) as unknown as HorizonServer;
  const account = await wrapCall(() => server.accounts().accountId(accountId).call());

  const susd = getSusdAssetOrNull();
  let xlm = 0;
  let susdBalance = 0;

  account.balances.forEach((balance) => {
    if (balance.asset_type === "native") {
      xlm = toNumber(balance.balance);
      return;
    }
    if (
      susd &&
      balance.asset_code?.trim() === susd.code &&
      balance.asset_issuer?.trim() === susd.issuer
    ) {
      susdBalance = toNumber(balance.balance);
    }
  });

  return {
    accountId: account.account_id,
    xlm,
    susd: susdBalance,
    updatedAt: account.last_modified_time ?? new Date().toISOString(),
  };
};

const makeIncomeFetcher = (days: 7 | 30) => () => fetchSpvIncome({ days });

export const useSpvBalance = () =>
  useSWR<SpvBalanceSummary, RateLimitError>("spv:balance", fetchSpvBalance, {
    ...swrDefaults,
    refreshInterval: 15_000,
  });

export const useSpvIncome = (days: 7 | 30 = 7) =>
  useSWR<SpvIncome, RateLimitError>(`spv:income|${days}`, makeIncomeFetcher(days), {
    ...swrDefaults,
    refreshInterval: days === 7 ? 20_000 : 60_000,
  });

export const useSpvHolders = () =>
  useSWR<SpvHolder[], RateLimitError>("spv:holders", getHolders, {
    ...swrDefaults,
    refreshInterval: 60_000,
  });
