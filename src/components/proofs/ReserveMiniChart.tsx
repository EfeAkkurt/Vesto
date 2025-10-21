"use client";

import { useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis } from "recharts";
import { formatUSD, formatUSDCompact, formatDate } from "@/src/lib/utils/format";
import type { ReservePoint } from "@/src/lib/dashboard/types";

export type ReserveMiniChartProps = {
  data: ReservePoint[];
};

const tooltipStyles: CSSProperties = {
  background: "rgba(19, 22, 27, 0.9)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  padding: "8px 12px",
};

export const ReserveMiniChart = ({ data }: ReserveMiniChartProps) => {
  const prefersReducedMotion = useReducedMotion();
  const latest = data[data.length - 1]?.reserveUSD ?? 0;
  const hasData = data.length > 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Reserves</p>
          <p className="text-lg font-semibold text-foreground">
            {Math.abs(latest) >= 10_000 ? formatUSDCompact(latest) : formatUSD(latest)}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Last 4 weeks</span>
      </div>
      {!hasData ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/30 text-xs text-muted-foreground">
          No reserve history yet. Attestations will populate this chart.
        </div>
      ) : (
      <div className="h-48 md:h-[280px] lg:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="reserveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ADD015" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatDate(String(value))}
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(value) => formatUSDCompact(Number(value))}
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }}
              axisLine={false}
              tickLine={false}
              width={68}
            />
            <Tooltip
              cursor={{ stroke: "rgba(124,58,237,0.35)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as ReservePoint;
                return (
                  <div style={tooltipStyles}>
                    <p className="text-xs text-muted-foreground">{formatDate(point.date)}</p>
                    <p className="text-sm font-semibold text-foreground">{formatUSD(point.reserveUSD)}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="reserveUSD"
              stroke="#7C3AED"
              strokeWidth={2}
              fill="url(#reserveGradient)"
              isAnimationActive={!prefersReducedMotion}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
};
