"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  type TooltipProps,
} from "recharts";
import type { HoldingDatum } from "@/src/lib/dashboard/types";
import { ChartWrapper } from "@/src/components/charts/ChartWrapper";
import { formatCurrency } from "@/src/lib/utils/format";

const colors = {
  rwa: "var(--color-primary)",
  stable: "#7c3aed",
};

type PortfolioBarsProps = {
  data: HoldingDatum[];
  isLoading?: boolean;
};

type StackedDatum = {
  category: string;
  rwa: number;
  stable: number;
  total: number;
  changePct: number;
};

const prepareData = (holdings: HoldingDatum[]): StackedDatum[] => {
  const map = new Map<string, StackedDatum>();
  holdings.forEach((holding) => {
    const key = holding.category;
    const current = map.get(key) ?? {
      category: key,
      rwa: 0,
      stable: 0,
      total: 0,
      changePct: 0,
    };
    if (holding.type === "RWA") {
      current.rwa += holding.usd;
    } else {
      current.stable += holding.usd;
    }
    current.total = current.rwa + current.stable;
    current.changePct = holding.changePct;
    map.set(key, current);
  });
  return Array.from(map.values());
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload as StackedDatum;
  const percent = datum.total === 0 ? 0 : Math.round((datum.rwa / datum.total) * 100);
  return (
    <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs text-foreground shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-muted-foreground">Total {formatCurrency(datum.total)}</p>
      <p className="mt-1">{percent}% RWA • {100 - percent}% Stable</p>
    </div>
  );
};

export const PortfolioBars = ({ data, isLoading }: PortfolioBarsProps) => {
  const chartData = useMemo(() => prepareData(data), [data]);

  return (
    <ChartWrapper
      title="Portfolio Breakdown"
      description="RWA categories vs stablecoin balances"
      isLoading={isLoading}
      empty={chartData.length === 0}
      emptyState={
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-semibold text-foreground/80">Portfolio empty</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Henüz RWA eklemediniz — Tokenize sayfasından başlayın.
          </p>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} accessibilityLayer margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="category" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-primary)", fillOpacity: 0.08 }} />
          <Legend wrapperStyle={{ paddingTop: 8 }} formatter={(value) => (value === "rwa" ? "RWA" : "Stablecoin")} />
          <Bar dataKey="rwa" stackId="portfolio" fill={colors.rwa} radius={[8, 8, 0, 0]} />
          <Bar dataKey="stable" stackId="portfolio" fill={colors.stable} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
