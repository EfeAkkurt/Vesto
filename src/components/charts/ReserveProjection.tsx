"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceArea,
  type TooltipProps,
} from "recharts";
import type { ReservePoint } from "@/src/lib/mockData";
import { ChartWrapper } from "@/src/components/charts/ChartWrapper";
import { formatCurrency, formatDate } from "@/src/lib/utils/format";

const colors = {
  reserve: "var(--color-primary)",
  payout: "var(--color-chart-4)",
};

type ReserveProjectionProps = {
  data: ReservePoint[];
  isLoading?: boolean;
};

type ChartDatum = ReservePoint & { label: string; future: boolean };

const normalize = (points: ReservePoint[]): ChartDatum[] => {
  const now = new Date();
  return points.map((point) => {
    const date = new Date(point.date);
    return {
      ...point,
      label: formatDate(point.date),
      future: date > now,
    };
  });
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const reserve = payload.find((item) => item.dataKey === "reserveUSD")?.value ?? 0;
  const projected = payload.find((item) => item.dataKey === "payoutProjected")?.value ?? 0;
  return (
    <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs text-foreground shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-muted-foreground">Reserve {formatCurrency(Number(reserve))}</p>
      <p>Projected payout {formatCurrency(Number(projected))}</p>
    </div>
  );
};

export const ReserveProjection = ({ data, isLoading }: ReserveProjectionProps) => {
  const chartData = useMemo(() => normalize(data), [data]);
  const firstFutureIndex = chartData.findIndex((datum) => datum.future);
  const futureStart = firstFutureIndex === -1 ? undefined : chartData[firstFutureIndex]?.label;
  const futureEnd = chartData.at(-1)?.label;

  return (
    <ChartWrapper
      title="Reserve & Payout Projection"
      description="Trailing reserves with forward payout expectations"
      isLoading={isLoading}
      empty={chartData.length === 0}
      emptyState={
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-semibold text-foreground/80">Rezerv beslemesi yok</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Custodian attestation bekleniyor.
          </p>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} accessibilityLayer margin={{ top: 20, right: 24, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="reserveGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="label" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis
            stroke="var(--color-muted-foreground)"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.2 }} />
          <Legend wrapperStyle={{ paddingTop: 12 }} formatter={(value) => (value === "reserveUSD" ? "Reserve" : "Projected payout")} />
          {futureStart && futureEnd ? (
            <ReferenceArea
              x1={futureStart}
              x2={futureEnd}
              fill="var(--color-primary)"
              fillOpacity={0.08}
              strokeOpacity={0}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="reserveUSD"
            name="reserveUSD"
            stroke={colors.reserve}
            strokeWidth={2}
            fill="url(#reserveGradient)"
          />
          <Line
            type="monotone"
            dataKey="payoutProjected"
            stroke={colors.payout}
            strokeWidth={2}
            dot={false}
            name="payoutProjected"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
