"use client";

import { useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { formatUSD } from "@/src/lib/utils/format";

export type TotalLockedMiniProps = {
  data: Array<{ date: string; lockedUSD: number }>;
};

const tooltipStyles: CSSProperties = {
  background: "rgba(19, 22, 27, 0.9)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  padding: "8px 12px",
};

export const TotalLockedMini = ({ data }: TotalLockedMiniProps) => {
  const prefersReducedMotion = useReducedMotion();
  const latest = data[data.length - 1]?.lockedUSD ?? 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Locked</p>
          <p className="text-lg font-semibold text-foreground">{formatUSD(latest, { compact: true })}</p>
        </div>
        <span className="text-xs text-muted-foreground">Trailing 7 days</span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lockedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ADD015" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#ADD015" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={{ stroke: "rgba(173,208,21,0.35)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as { date: string; lockedUSD: number };
                return (
                  <div style={tooltipStyles}>
                    <p className="text-xs text-muted-foreground">{new Date(point.date).toLocaleDateString()}</p>
                    <p className="text-sm font-semibold text-foreground">{formatUSD(point.lockedUSD)}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="lockedUSD"
              stroke="#ADD015"
              strokeWidth={2}
              fill="url(#lockedGradient)"
              isAnimationActive={!prefersReducedMotion}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
