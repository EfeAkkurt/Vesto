"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutShell } from "@/src/components/layout/LayoutShell";
import { KpiCard } from "@/src/components/cards/KpiCard";
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
import type { DashboardKpi } from "@/src/lib/dashboard/types";
import { useDashboardAttestations, useDashboardKpis, useDashboardReserves } from "@/src/hooks/useDashboardData";
import { stagger } from "@/src/components/motion/presets";
import { CUSTODIAN_ACCOUNT } from "@/src/utils/constants";

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
    () => buildPayoutSchedule(dashboardAttestations),
    [dashboardAttestations],
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
