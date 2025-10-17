import type { Attestation } from "@/src/lib/types/proofs";

export type TrendDirection = "up" | "down" | "flat";

export type DashboardKpi = {
  portfolioUSD: number;
  minted: number;
  coverage: number;
  holders: number;
  updatedAt: string;
};

export type DashboardMetric = {
  key: keyof Omit<DashboardKpi, "updatedAt">;
  label: string;
  description: string;
  suffix?: "USD" | "%";
  precision?: number;
  delta: number;
  trend: TrendDirection;
  value: number;
};

export type HoldingDatum = {
  assetCode: string;
  assetIssuer?: string;
  type: "RWA" | "Stable";
  category: "Invoice" | "Rent" | "Subscription" | "Stablecoin" | "Other";
  amount: number;
  usd: number;
  changePct: number;
};

export type ReservePoint = {
  date: string;
  reserveUSD: number;
  payoutProjected: number;
};

export type PayoutHistoryEntry = {
  date: string;
  amount: number;
  asset: string;
  ipfs: string;
};

export type PayoutSchedule = {
  nextPayoutDate: string;
  nextAmount: number;
  asset: string;
  windowDays: number;
  note: string;
  history: PayoutHistoryEntry[];
};

export type AttestationSummary = Pick<Attestation, "week" | "status" | "metadataCid" | "reserveUSD" | "ts" | "signedBy">;
