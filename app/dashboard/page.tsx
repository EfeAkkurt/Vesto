"use client";

import { useEffect, useMemo, useState } from "react";
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
  kpi,
  kpiMetrics,
  holdings,
  attestations,
  reservePoints,
  payoutSchedule,
} from "@/src/lib/mockData";
import { stagger } from "@/src/components/motion/presets";

const DashboardPage = () => {
  const wallet = useWallet();
  const networkHealth = useNetworkHealth();
  const prefersReducedMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);

  const accountId = wallet.address;
  const { data: account } = useAccount(accountId);
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    error: paymentsError,
  } = useAccountPayments(accountId);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const metrics = useMemo(
    () =>
      kpiMetrics.map((metric) => ({
        ...metric,
        value: kpi[metric.key],
      })),
    [],
  );

  return (
    <LayoutShell wallet={wallet} networkHealth={networkHealth}>
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
              isLoading={loading}
              updatedAt={kpi.updatedAt}
            />
          ))}
        </section>
        <section className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <PortfolioBars data={holdings} isLoading={loading} />
          </div>
          <div className="xl:col-span-6">
            <DonutAttestations attestations={attestations} isLoading={loading} />
          </div>
          <div className="xl:col-span-8">
            <ReserveProjection data={reservePoints} isLoading={loading} />
          </div>
          <div className="xl:col-span-4">
            <NetworkStatusCard
              networkHealth={networkHealth}
              wallet={wallet}
              account={account}
            />
          </div>
          <div className="xl:col-span-8">
            <TransactionsTable payments={payments} isLoading={paymentsLoading} error={paymentsError ?? null} />
          </div>
          <div className="xl:col-span-4">
            <UpcomingPayoutCard schedule={payoutSchedule} isLoading={loading} />
          </div>
        </section>
      </motion.div>
    </LayoutShell>
  );
};

export default DashboardPage;
