"use client";

import { useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { formatUSD } from "@/src/lib/utils/format";
import type { ReservePoint } from "@/src/lib/types/proofs";

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

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Reserves</p>
          <p className="text-lg font-semibold text-foreground">{formatUSD(latest, { compact: true })}</p>
        </div>
        <span className="text-xs text-muted-foreground">Last 4 weeks</span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="reserveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ADD015" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#ADD015" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={{ stroke: "rgba(173,208,21,0.35)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as ReservePoint;
                return (
                  <div style={tooltipStyles}>
                    <p className="text-xs text-muted-foreground">Week {point.week}</p>
                    <p className="text-sm font-semibold text-foreground">{formatUSD(point.reserveUSD)}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="reserveUSD"
              stroke="#ADD015"
              strokeWidth={2}
              fill="url(#reserveGradient)"
              isAnimationActive={!prefersReducedMotion}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
