import type { HorizonAccount, HorizonAccountBalance } from "@/src/hooks/horizon";
import type { Attestation } from "@/src/lib/types/proofs";
import {
  type DashboardKpi,
  type DashboardMetric,
  type HoldingDatum,
  type PayoutSchedule,
  type ReservePoint,
} from "./types";

const METRIC_CONFIG: Array<Omit<DashboardMetric, "value" | "delta" | "trend">> = [
  {
    key: "portfolioUSD",
    label: "Portfolio Value",
    description: "Total RWA + stablecoin holdings",
    suffix: "USD",
  },
  {
    key: "minted",
    label: "Minted Tokens",
    description: "Outstanding RWA supply",
  },
  {
    key: "coverage",
    label: "Reserve Coverage",
    description: "Reserve vs outstanding liabilities",
    suffix: "%",
    precision: 0,
  },
  {
    key: "holders",
    label: "Active Holders",
    description: "Distinct assets with positive balances",
  },
];

const safeParseFloat = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const classifyBalance = (
  balance: HorizonAccountBalance,
): Pick<HoldingDatum, "type" | "category"> => {
  if (balance.asset_type === "native") {
    return { type: "Stable", category: "Other" };
  }

  const code = (balance.asset_code ?? "").toUpperCase();
  if (code === "SUSD" || code === "USDC" || code === "USDT") {
    return { type: "Stable", category: "Stablecoin" };
  }

  if (code.startsWith("RWA")) {
    if (code.includes("INV")) return { type: "RWA", category: "Invoice" };
    if (code.includes("RENT")) return { type: "RWA", category: "Rent" };
    if (code.includes("SUB")) return { type: "RWA", category: "Subscription" };
    return { type: "RWA", category: "Other" };
  }

  return { type: "Stable", category: "Other" };
};

const toUsd = (balance: HorizonAccountBalance, amount: number): number => {
  if (balance.asset_type === "native") return amount;
  const code = (balance.asset_code ?? "").toUpperCase();
  if (code === "SUSD") return amount;
  if (code.startsWith("RWA")) return amount;
  return amount;
};

export const deriveHoldings = (account?: HorizonAccount | null): HoldingDatum[] => {
  if (!account) return [];
  return account.balances
    .map<HoldingDatum | null>((balance) => {
      const amount = safeParseFloat(balance.balance);
      if (amount <= 0) return null;
      const classification = classifyBalance(balance);
      return {
        assetCode: balance.asset_code ?? "XLM",
        assetIssuer: balance.asset_issuer,
        amount,
        usd: toUsd(balance, amount),
        changePct: 0,
        ...classification,
      } satisfies HoldingDatum;
    })
    .filter((item): item is HoldingDatum => item !== null);
};

export const deriveKpi = (account?: HorizonAccount | null): DashboardKpi => {
  const holdings = deriveHoldings(account);
  const portfolioUSD = holdings.reduce((total, holding) => total + holding.usd, 0);
  const rwaUSD = holdings.filter((holding) => holding.type === "RWA").reduce((total, holding) => total + holding.usd, 0);
  const reserveUSD = holdings.filter((holding) => holding.type === "Stable").reduce((total, holding) => total + holding.usd, 0);
  const coverageBase = rwaUSD <= 0 ? (reserveUSD > 0 ? 100 : 0) : (reserveUSD / rwaUSD) * 100;
  const coverage = Number.isFinite(coverageBase) ? Math.max(0, Math.min(coverageBase, 100)) : 0;
  const holders = account?.balances.filter((balance) => safeParseFloat(balance.balance) > 0 && balance.asset_type !== "liquidity_pool_shares").length ?? 0;

  return {
    portfolioUSD,
    minted: rwaUSD,
    coverage,
    holders,
    updatedAt: account?.last_modified_time ?? new Date().toISOString(),
  } satisfies DashboardKpi;
};

export const buildMetrics = (kpi: DashboardKpi): DashboardMetric[] =>
  METRIC_CONFIG.map((config) => ({
    ...config,
    value: kpi[config.key],
    delta: 0,
    trend: "flat" as const,
  }));

const sortByTimestampDesc = <T extends { ts: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

const sortByTimestampAsc = <T extends { ts: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

export const buildReservePoints = (attestations: Attestation[]): ReservePoint[] => {
  if (!attestations.length) return [];
  const chronological = sortByTimestampAsc(attestations);
  const points: ReservePoint[] = chronological.map((att, index) => {
    const previous = chronological[index - 1];
    const delta = previous ? att.reserveUSD - previous.reserveUSD : att.reserveUSD;
    return {
      date: att.ts,
      reserveUSD: att.reserveUSD,
      payoutProjected: Math.max(delta, 0),
    } satisfies ReservePoint;
  });

  if (chronological.length >= 2) {
    const deltas = chronological
      .map((att, index) => {
        if (index === 0) return 0;
        const previous = chronological[index - 1];
        return att.reserveUSD - previous.reserveUSD;
      })
      .filter((delta) => Number.isFinite(delta) && delta > 0);
    const averageDelta = deltas.length ? deltas.reduce((total, delta) => total + delta, 0) / deltas.length : 0;
    const last = chronological[chronological.length - 1];
    if (averageDelta > 0) {
      const nextDate = new Date(last.ts);
      nextDate.setDate(nextDate.getDate() + 7);
      points.push({
        date: nextDate.toISOString(),
        reserveUSD: last.reserveUSD + averageDelta,
        payoutProjected: averageDelta,
      });
    }
  }

  return points;
};

export const buildPayoutSchedule = (attestations: Attestation[]): PayoutSchedule | undefined => {
  const verified = sortByTimestampDesc(attestations.filter((att) => att.status === "Verified"));
  if (!verified.length) return undefined;

  const history = verified.slice(0, 4).map((att, index) => {
    const previous = verified[index + 1];
    const amount = previous ? Math.max(att.reserveUSD - previous.reserveUSD, 0) : att.reserveUSD;
    return {
      date: att.ts,
      amount,
      asset: "SUSD",
      ipfs: att.metadataCid,
    };
  });

  const [latest, prior] = verified;
  const cadenceDays = prior
    ? Math.max(1, Math.round((new Date(latest.ts).getTime() - new Date(prior.ts).getTime()) / (1000 * 60 * 60 * 24)))
    : 7;

  const positiveAmounts = history.map((item) => item.amount).filter((amount) => amount > 0);
  const averageAmount = positiveAmounts.length
    ? positiveAmounts.reduce((total, amount) => total + amount, 0) / positiveAmounts.length
    : latest.reserveUSD;

  const nextDate = new Date(latest.ts);
  nextDate.setDate(nextDate.getDate() + cadenceDays);

  return {
    nextPayoutDate: nextDate.toISOString(),
    nextAmount: averageAmount,
    asset: "SUSD",
    windowDays: cadenceDays,
    note: `Forecast based on ${verified.length} verified attestations`,
    history,
  } satisfies PayoutSchedule;
};
