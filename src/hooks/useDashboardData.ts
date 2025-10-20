"use client";

import useSWR from "swr";
import { getServer as getHorizonServer } from "@/src/lib/stellar/sdk";
import { wrapCall, swrDefaults, type RateLimitError } from "@/src/hooks/horizon";
import { resolveAttestations } from "@/src/lib/attestations/store";
import { deriveKpi, buildReservePoints } from "@/src/lib/dashboard/transformers";
import type { DashboardKpi, ReservePoint } from "@/src/lib/dashboard/types";
import type { Attestation } from "@/src/lib/types/proofs";
import {
  CUSTODIAN_ACCOUNT,
  TOKEN_ASSET_CODE,
  TOKEN_ASSET_ISSUER,
} from "@/src/utils/constants";
import type { HorizonAccount, HorizonEffect, HorizonOperation } from "@/src/hooks/horizon";

const DASHBOARD_ACCOUNT = CUSTODIAN_ACCOUNT?.trim();

type EffectsQuery = {
  forAccount(accountId: string): {
    order(direction: "asc" | "desc"): {
      limit(limit: number): {
        call(): Promise<{ records: HorizonEffect[] }>;
      };
    };
  };
};

type AssetsQuery = {
  forCode(code: string): {
    forIssuer(issuer: string): {
      call(): Promise<{ records: Array<{ amount?: string }> }>;
    };
  };
};

type OperationsQuery = {
  forAccount(accountId: string): OperationsQuery;
  order(direction: "asc" | "desc"): OperationsQuery;
  limit(limit: number): OperationsQuery;
  includeTransactions?(include: boolean): OperationsQuery;
  join?(resource: string): OperationsQuery;
  call(): Promise<{ records: HorizonOperation[] }>;
};

type HorizonDashboardServer = {
  loadAccount(accountId: string): Promise<HorizonAccount>;
  operations(): OperationsQuery;
  effects(): EffectsQuery;
  assets(): AssetsQuery;
};

const ensureAccount = () => {
  if (!DASHBOARD_ACCOUNT) {
    throw new Error("NEXT_PUBLIC_CUSTODIAN_ACCOUNT must be configured.");
  }
  return DASHBOARD_ACCOUNT;
};

const fetchDashboardAttestations = async (): Promise<Attestation[]> => {
  const accountId = ensureAccount();
  const server = (await getHorizonServer()) as unknown as HorizonDashboardServer;

  let operationsQuery = server.operations().forAccount(accountId).order("desc").limit(200);
  if (typeof operationsQuery.includeTransactions === "function") {
    operationsQuery = operationsQuery.includeTransactions(true);
  } else if (typeof operationsQuery.join === "function") {
    operationsQuery = operationsQuery.join("transactions");
  }

  const [operationsPage, effectsPage] = await Promise.all([
    wrapCall(() => operationsQuery.call()),
    wrapCall(() => server.effects().forAccount(accountId).order("desc").limit(200).call()),
  ]);

  return resolveAttestations(
    operationsPage.records as unknown as HorizonOperation[],
    effectsPage.records as unknown as HorizonEffect[],
  );
};

const fetchDashboardKpis = async (): Promise<DashboardKpi> => {
  const accountId = ensureAccount();
  const server = (await getHorizonServer()) as unknown as HorizonDashboardServer;

  const account = await wrapCall(() => server.loadAccount(accountId));
  const horizonAccount: HorizonAccount = {
    id: account.id,
    account_id: account.account_id,
    sequence: account.sequence,
    last_modified_time: account.last_modified_time,
    thresholds: account.thresholds,
    balances: account.balances,
    signers: account.signers,
  };

  let mintedSupply = 0;
  if (TOKEN_ASSET_CODE && TOKEN_ASSET_ISSUER) {
    const assetPage = await wrapCall(() =>
      server.assets().forCode(TOKEN_ASSET_CODE).forIssuer(TOKEN_ASSET_ISSUER).call(),
    );
    if (assetPage.records.length) {
      const amount = Number.parseFloat(assetPage.records[0].amount ?? "0");
      mintedSupply = Number.isFinite(amount) ? amount : 0;
    }
  }

  return deriveKpi(horizonAccount, mintedSupply);
};

const fetchDashboardReserves = async (): Promise<ReservePoint[]> => {
  const attestations = await fetchDashboardAttestations();
  return buildReservePoints(attestations);
};

const emptyKpi: DashboardKpi = {
  portfolioUSD: 0,
  minted: 0,
  coverage: 0,
  holders: 0,
  updatedAt: new Date(0).toISOString(),
};

export const useDashboardKpis = () =>
  useSWR<DashboardKpi, RateLimitError>("dashboard:kpis", fetchDashboardKpis, {
    ...swrDefaults,
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    fallbackData: emptyKpi,
  });

export const useDashboardAttestations = () =>
  useSWR<Attestation[], RateLimitError>("dashboard:attestations", fetchDashboardAttestations, {
    ...swrDefaults,
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    fallbackData: [],
  });

export const useDashboardReserves = () =>
  useSWR<ReservePoint[], RateLimitError>("dashboard:reserves", fetchDashboardReserves, {
    ...swrDefaults,
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    fallbackData: [],
  });
