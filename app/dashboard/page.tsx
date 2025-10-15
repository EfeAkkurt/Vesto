"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  kpi,
  kpiMetrics,
  holdings,
  attestations,
  transactions,
  reservePoints,
  payoutSchedule,
  networkHealth as networkHealthMock,
  type StellarNetwork,
} from "@/src/lib/mockData";
import { stagger } from "@/src/components/motion/presets";

const DashboardPage = () => {
  const wallet = useWallet();
  const prefersReducedMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [networkHealth, setNetworkHealth] = useState(networkHealthMock);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const baseSwitchNetwork = wallet.controls.switchNetwork;

  const handleSelectNetwork = useCallback(
    (network: StellarNetwork) => {
      setNetworkHealth((previous) => ({
        ...previous,
        network,
        latencyMs: network === "TestNet" ? 184 : 210,
        horizonHealthy: true,
      }));
      baseSwitchNetwork(network);
    },
    [baseSwitchNetwork],
  );

  const walletWithOverrides = useMemo(() => ({
    ...wallet,
    controls: {
      ...wallet.controls,
      switchNetwork: handleSelectNetwork,
    },
  }), [handleSelectNetwork, wallet]);

  const metrics = useMemo(
    () =>
      kpiMetrics.map((metric) => ({
        ...metric,
        value: kpi[metric.key],
      })),
    [],
  );

  return (
    <LayoutShell wallet={walletWithOverrides} networkHealth={networkHealth} onSelectNetwork={handleSelectNetwork}>
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
              wallet={walletWithOverrides}
              onSwitchNetwork={handleSelectNetwork}
            />
          </div>
          <div className="xl:col-span-8">
            <TransactionsTable transactions={transactions} isLoading={loading} />
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
