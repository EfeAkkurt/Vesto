"use client";

import type { FC } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PayoutSchedule } from "@/src/lib/dashboard/types";
import { formatCurrency, formatDate } from "@/src/lib/utils/format";
import { transitions, fadeScale } from "@/src/components/motion/presets";
import { Skeleton } from "@/src/components/ui/Skeleton";

export type UpcomingPayoutCardProps = {
  schedule?: PayoutSchedule;
  isLoading?: boolean;
};

export const UpcomingPayoutCard: FC<UpcomingPayoutCardProps> = ({ schedule, isLoading }) => {
  const prefersReducedMotion = useReducedMotion();
  const nextLabel = schedule
    ? `${formatCurrency(schedule.nextAmount)} in ${schedule.windowDays} day${schedule.windowDays === 1 ? "" : "s"}`
    : "No payouts";

  return (
    <motion.section
      className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur"
      initial={prefersReducedMotion ? undefined : "hidden"}
      animate={prefersReducedMotion ? undefined : "visible"}
      variants={prefersReducedMotion ? undefined : fadeScale}
      transition={transitions.base}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground/90">Upcoming Payouts</h2>
          <p className="text-xs text-muted-foreground">Stay current on treasury distributions</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:border-primary/60 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          View schedule
        </button>
      </header>
      <div className="mt-4 space-y-4">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : schedule ? (
          <div className="rounded-xl border border-border/50 bg-border/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Next distribution</p>
            <p className="mt-2 text-lg font-semibold text-foreground/90">{nextLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">Asset: {schedule.asset}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/40 bg-border/5 px-4 py-3 text-sm text-muted-foreground">
            No payouts scheduled.
          </div>
        )}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent distributions</p>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : schedule ? (
            schedule.history.map((item) => (
              <div
                key={item.date}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground/80">{formatDate(item.date)}</p>
                  <p className="text-muted-foreground">IPFS {item.ipfs}</p>
                </div>
                <span className="font-semibold text-primary">{formatCurrency(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No history.</p>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-primary">Ready to distribute?</p>
          <p className="text-xs text-primary/80">SPV approval required before execution.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/60 bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Distribute now
        </button>
      </div>
    </motion.section>
  );
};
