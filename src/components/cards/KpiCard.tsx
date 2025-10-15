"use client";

import { useMemo, type FC } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeDelta } from "@/src/components/ui/BadgeDelta";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { Tooltip } from "@/src/components/ui/Tooltip";
import { transitions, fadeInUp } from "@/src/components/motion/presets";
import { formatCurrency, formatNumber, formatPercent } from "@/src/utils/format";

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
    if (suffix === "USD") return formatCurrency(value, { compact: value > 10000 });
    if (suffix === "%") return formatPercent(value, precision ?? 0);
    return formatNumber(value, precision);
  }, [isLoading, precision, suffix, value]);

  return (
    <motion.article
      className="group relative flex flex-col rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur transition"
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
            <Skeleton className="h-9 w-32" />
          ) : (
            <p className="text-2xl font-semibold text-foreground/90 sm:text-3xl">{formattedValue}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        </div>
        {!isLoading ? (
          <BadgeDelta value={delta} trend={trend} />
        ) : (
          <Skeleton className="h-6 w-20" />
        )}
      </div>
    </motion.article>
  );
};
