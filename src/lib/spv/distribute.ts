import type { SpvAssetCode, SpvDistributionSummary, SpvHolder, SpvPayout } from "@/src/lib/types/spv";
import { formatXLM } from "@/src/lib/utils/format";

const STROOPS_PER_UNIT = 10_000_000;
const MIN_STROOPS = 1;

const toStroops = (amount: number): number => Math.round(amount * STROOPS_PER_UNIT);

const fromStroops = (stroops: number): number => stroops / STROOPS_PER_UNIT;

const normaliseAsset = (asset: SpvAssetCode): SpvAssetCode => (asset === "SUSD" ? "SUSD" : "XLM");

const toAmountString = (stroops: number): string => {
  const normalized = fromStroops(stroops);
  return formatXLM(normalized);
};

const sumBalances = (holders: SpvHolder[]): number =>
  holders.reduce((total, holder) => total + Math.max(0, holder.balance), 0);

export const calculateDistribution = ({
  holders,
  income,
  asset,
}: {
  holders: SpvHolder[];
  income: number;
  asset: SpvAssetCode;
}): SpvDistributionSummary & { payouts: SpvPayout[]; underStroopDropped: number } => {
  const totalSupply = sumBalances(holders);
  if (totalSupply <= 0) {
    throw new Error("Holder balances must sum to more than zero.");
  }
  if (income <= 0) {
    throw new Error("Income must be positive to build a distribution.");
  }

  const payouts: SpvPayout[] = [];
  let totalPaid = 0;
  let underStroopDropped = 0;
  const resolvedAsset = normaliseAsset(asset);

  holders.forEach((holder) => {
    if (holder.balance <= 0) return;
    const share = holder.balance / totalSupply;
    if (!Number.isFinite(share) || share <= 0) return;
    const nominalAmount = income * share;
    const stroops = toStroops(nominalAmount);
    if (stroops < MIN_STROOPS) {
      underStroopDropped += 1;
      return;
    }
    const amount = fromStroops(stroops);
    payouts.push({
      account: holder.account,
      asset: resolvedAsset,
      amount,
      share,
    });
    totalPaid += amount;
  });

  if (!payouts.length) {
    throw new Error("Distribution resulted in zero payouts after threshold filtering.");
  }

  return {
    payouts,
    totalPaid,
    underStroopDropped,
  };
};

export const formatPaymentAmount = (amount: number): string => {
  const stroops = toStroops(amount);
  return toAmountString(stroops);
};
