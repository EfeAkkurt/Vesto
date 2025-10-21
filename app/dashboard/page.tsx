"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { KpiCard } from "@/src/components/cards/KpiCard";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { PortfolioBars } from "@/src/components/charts/PortfolioBars";
import { DonutAttestations } from "@/src/components/charts/DonutAttestations";
import { ReserveProjection } from "@/src/components/charts/ReserveProjection";
import { TransactionsTable } from "@/src/components/tables/TransactionsTable";
import { UpcomingPayoutCard } from "@/src/components/cards/UpcomingPayoutCard";
import { NetworkStatusCard } from "@/src/components/cards/NetworkStatusCard";
import { useWallet } from "@/src/hooks/useWallet";
import { useAccount, useAccountPayments } from "@/src/hooks/horizon";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import {
  buildMetrics,
  buildPayoutSchedule,
  deriveHoldings,
} from "@/src/lib/dashboard/transformers";
import type { DashboardKpi, PayoutSchedule } from "@/src/lib/dashboard/types";
import { useDashboardAttestations, useDashboardKpis, useDashboardReserves } from "@/src/hooks/useDashboardData";
import { stagger } from "@/src/components/motion/presets";
import { CUSTODIAN_ACCOUNT, getSusdAssetOrNull } from "@/src/utils/constants";
import { useSpvBalance, useSpvIncome, useSpvHolders } from "@/src/hooks/useSpv";
import type { SpvIncome, SpvHolder } from "@/src/lib/types/spv";

import { formatCurrency } from "@/src/lib/utils/format";

const projectSchedule = (
  base: PayoutSchedule | undefined,
  income?: SpvIncome,
  holders?: SpvHolder[],
  susdConfig?: { code: string; issuer: string } | null,
): PayoutSchedule | undefined => {
  if (!income || !holders?.length) return base;
  const totalBalance = holders.reduce((sum, holder) => sum + Math.max(holder.balance, 0), 0);
  if (totalBalance <= 0) return base;
  const projectedAmount = income.incomeSusd > 0 && susdConfig
    ? income.incomeSusd
    : income.incomeXlm;
  if (projectedAmount <= 0) return base;
  const asset = income.incomeSusd > 0 && susdConfig ? susdConfig.code : "XLM";
  const schedule: PayoutSchedule = base
    ? { ...base }
    : {
        nextPayoutDate: new Date(Date.now() + income.windowDays * 24 * 60 * 60 * 1000).toISOString(),
        nextAmount: projectedAmount,
        asset,
        windowDays: income.windowDays,
        note: "",
        history: [],
      };
  schedule.nextAmount = projectedAmount;
  schedule.asset = asset;
  schedule.windowDays = income.windowDays;
  schedule.note = `Projected from ${holders.length} holder${holders.length === 1 ? "" : "s"} over the past ${income.windowDays} days.`;
  if (!base || !base.history.length) {
    schedule.history = holders.slice(0, 3).map((holder, index) => ({
      date: new Date(Date.now() - index * income.windowDays * 24 * 60 * 60 * 1000).toISOString(),
      amount: projectedAmount * (holder.balance / totalBalance),
      asset,
      ipfs: holder.account,
    }));
  }
  return schedule;
};

const DEFAULT_KPI: DashboardKpi = {
  portfolioUSD: 0,
  minted: 0,
  coverage: 0,
  holders: 0,
  updatedAt: "",
};

const DashboardPage = () => {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const prefersReducedMotion = useReducedMotion();
  const susdAsset = useMemo(() => getSusdAssetOrNull(), []);
  const spvBalance = useSpvBalance();
  const spvIncome = useSpvIncome(7);
  const spvHolders = useSpvHolders();
  const overviewAccountId = wallet.accountId ?? (CUSTODIAN_ACCOUNT || undefined);

  const {
    data: account,
    isLoading: accountLoading,
  } = useAccount(overviewAccountId);

  const {
    data: payments,
    isLoading: paymentsLoading,
    error: paymentsError,
  } = useAccountPayments(overviewAccountId);

  const {
    data: dashboardKpi,
    isLoading: kpiLoading,
  } = useDashboardKpis();

  const {
    data: dashboardAttestations = [],
    isLoading: dashboardAttestationsLoading,
  } = useDashboardAttestations();

  const {
    data: reservePointsData = [],
    isLoading: reserveLoading,
  } = useDashboardReserves();

  const holdingsData = useMemo(
    () => (account ? deriveHoldings(account) : []),
    [account],
  );

  const kpi = dashboardKpi ?? DEFAULT_KPI;
  const metrics = useMemo(() => buildMetrics(kpi), [kpi]);

  const payoutScheduleData = useMemo(
    () => projectSchedule(buildPayoutSchedule(dashboardAttestations), spvIncome.data, spvHolders.data, susdAsset),
    [dashboardAttestations, spvIncome.data, spvHolders.data, susdAsset],
  );

  const effectiveWallet = useMemo(
    () => ({
      ...wallet,
      balanceUSD: account ? kpi.portfolioUSD : wallet.balanceUSD,
    }),
    [wallet, account, kpi.portfolioUSD],
  );

  const isAccountLoading = accountLoading || kpiLoading;
  const isPaymentsLoading = paymentsLoading;
  const isAttestationLoading = dashboardAttestationsLoading || reserveLoading || paymentsLoading;

  return (
    <LayoutShell wallet={effectiveWallet} networkHealth={networkHealth}>
      <motion.div
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : stagger(0.06)}
        className="space-y-6"
      >
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <KpiCard
              key={metric.key}
              title={metric.label}
              description={metric.description}
              value={metric.value}
              suffix={metric.suffix}
              precision={metric.precision}
              delta={metric.delta}
              trend={metric.trend}
              isLoading={isAccountLoading}
              updatedAt={kpi.updatedAt}
            />
          ))}
          {spvBalance.data ? (
            <KpiCard
              key="spv-balance"
              title="SPV Balance (XLM)"
              description={susdAsset
                ? `${susdAsset.code} ${formatCurrency(spvBalance.data.susd)}`
                : "SUSD configuration missing"}
              value={spvBalance.data.xlm}
              precision={2}
              delta={0}
              trend="flat"
              isLoading={spvBalance.isLoading}
              updatedAt={spvBalance.data.updatedAt}
            />
          ) : spvBalance.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : null}
        </section>
        <section className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <PortfolioBars data={holdingsData} isLoading={isAccountLoading} />
          </div>
          <div className="xl:col-span-6">
            <DonutAttestations attestations={dashboardAttestations} isLoading={isAttestationLoading} />
          </div>
          <div className="xl:col-span-8">
            <ReserveProjection data={reservePointsData} isLoading={isAttestationLoading} />
          </div>
          <div className="xl:col-span-4">
            <NetworkStatusCard
              networkHealth={networkHealth}
              wallet={effectiveWallet}
              account={account}
            />
          </div>
          <div className="xl:col-span-8">
            <TransactionsTable
              payments={payments ?? []}
              isLoading={isPaymentsLoading}
              error={paymentsError ?? null}
            />
          </div>
          <div className="xl:col-span-4">
            <UpcomingPayoutCard schedule={payoutScheduleData} isLoading={isAttestationLoading} />
          </div>
        </section>
      </motion.div>
    </LayoutShell>
  );
};

export default DashboardPage;
