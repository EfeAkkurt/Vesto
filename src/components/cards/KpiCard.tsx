"use client";

import { useMemo, type FC } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeDelta } from "@/src/components/ui/BadgeDelta";
import { SkeletonRow } from "@/src/components/shared/SkeletonRow";
import { Tooltip } from "@/src/components/ui/Tooltip";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { formatNumber, formatPct, formatUSD, formatUSDCompact } from "@/src/lib/utils/format";

export type KpiCardProps = {
  title: string;
  value: number;
  suffix?: string;
  description: string;
  delta: number;
  trend: "up" | "down" | "flat";
  precision?: number;
  isLoading?: boolean;
  updatedAt: string;
};

export const KpiCard: FC<KpiCardProps> = ({
  title,
  value,
  suffix,
  description,
  delta,
  trend,
  precision,
  isLoading,
  updatedAt,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const formattedValue = useMemo(() => {
    if (isLoading) return "";
    if (suffix === "USD") return value > 10_000 ? formatUSDCompact(value) : formatUSD(value);
    if (suffix === "%") return formatPct(value / 100, precision ?? 0);
    return formatNumber(value, precision);
  }, [isLoading, precision, suffix, value]);

  return (
    <motion.article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5 shadow-sm transition md:p-6"
      initial={prefersReducedMotion ? undefined : "hidden"}
      animate={prefersReducedMotion ? undefined : "visible"}
      variants={prefersReducedMotion ? undefined : fadeInUp}
      transition={transitions.base}
      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{title}</span>
        <Tooltip label={`Last update ${new Date(updatedAt).toLocaleString()}`}>
          <span className="rounded-full border border-border/40 bg-border/10 px-2 py-0.5">Live</span>
        </Tooltip>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          {isLoading ? (
            <SkeletonRow lines={2} className="w-32" />
          ) : (
            <p className="text-2xl font-semibold text-foreground/90 sm:text-3xl">{formattedValue}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        </div>
        {!isLoading ? (
          <BadgeDelta value={delta} trend={trend} />
        ) : (
          <SkeletonRow lines={1} className="w-20" />
        )}
      </div>
    </motion.article>
  );
};
