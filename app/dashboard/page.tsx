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
import { useAccount, useAccountEffects, useAccountPayments } from "@/src/hooks/horizon";
import { useAttestations } from "@/src/hooks/useAttestations";
import { useNetworkHealth } from "@/src/hooks/useNetworkHealth";
import { useAssetSupply } from "@/src/hooks/useAssetSupply";
import {
  buildMetrics,
  buildPayoutSchedule,
  buildReservePoints,
  deriveHoldings,
  deriveKpi,
} from "@/src/lib/dashboard/transformers";
import { stagger } from "@/src/components/motion/presets";
import { CUSTODIAN_ACCOUNT, TOKEN_ASSET_CODE, TOKEN_ASSET_ISSUER } from "@/src/utils/constants";

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
    data: effects,
    isLoading: effectsLoading,
  } = useAccountEffects(overviewAccountId);

  const attestationState = useAttestations(overviewAccountId, payments, effects);

  const assetSupply = useAssetSupply(TOKEN_ASSET_CODE, TOKEN_ASSET_ISSUER);
  const mintedSupply = assetSupply.data;

  const holdingsData = useMemo(
    () => (account ? deriveHoldings(account) : []),
    [account],
  );

  const kpi = useMemo(() => deriveKpi(account, mintedSupply), [account, mintedSupply]);
  const metrics = useMemo(() => buildMetrics(kpi), [kpi]);

  const reservePointsData = useMemo(
    () => buildReservePoints(attestationState.data),
    [attestationState.data],
  );

  const payoutScheduleData = useMemo(
    () => buildPayoutSchedule(attestationState.data),
    [attestationState.data],
  );

  const effectiveWallet = useMemo(
    () => ({
      ...wallet,
      balanceUSD: account ? kpi.portfolioUSD : wallet.balanceUSD,
    }),
    [wallet, account, kpi.portfolioUSD],
  );

  const isAccountLoading = accountLoading;
  const isPaymentsLoading = paymentsLoading;
  const isAttestationLoading = attestationState.isLoading || effectsLoading || paymentsLoading;

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
            <DonutAttestations attestations={attestationState.data} isLoading={isAttestationLoading} />
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
