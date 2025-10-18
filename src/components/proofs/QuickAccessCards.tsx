"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { Skeleton } from "@/src/components/ui/Skeleton";
import type { ProofQuickCard } from "@/src/lib/proofs/selectors";
import type { ProofStatus } from "@/src/lib/types/proofs";
import { cn } from "@/src/utils/cn";
import { formatDate } from "@/src/lib/utils/format";

const STATUS_DOT_CLASS: Record<ProofStatus, string> = {
  Verified: "bg-emerald-400/80",
  Pending: "bg-amber-400/80",
  Invalid: "bg-rose-500/80",
};

const STATUS_LABEL: Record<ProofStatus, string> = {
  Verified: "Verified",
  Pending: "Pending",
  Invalid: "Invalid",
};

type QuickAccessCardsProps = {
  items: ProofQuickCard[];
  isLoading?: boolean;
  className?: string;
};

const SkeletonCard = () => (
  <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="size-3 rounded-full" />
    </div>
    <Skeleton className="mt-4 h-3 w-full" />
    <Skeleton className="mt-2 h-3 w-4/5" />
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-7 w-24" />
    </div>
  </div>
);

export const QuickAccessCards = ({ items, isLoading, className }: QuickAccessCardsProps) => {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={`quick-card-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : "hidden"}
      animate={prefersReducedMotion ? undefined : "visible"}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.06 },
        },
      }}
      className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}
    >
      {items.map((item) => {
        const status = item.status ?? "Pending";
        const dotClass = STATUS_DOT_CLASS[status];
        const statusLabel = STATUS_LABEL[status];
        const updatedLabel = item.updatedAt ? formatDate(item.updatedAt) : "Awaiting update";
        const statusToneClass =
          status === "Verified"
            ? "bg-emerald-500/10 text-emerald-300"
            : status === "Invalid"
              ? "bg-rose-500/15 text-rose-300"
              : "bg-amber-400/10 text-amber-300";

        return (
          <motion.article
            key={item.type}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            whileHover={prefersReducedMotion ? undefined : { y: -3 }}
            transition={{ duration: 0.18, ease: [0.33, 1, 0.68, 1] }}
            className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{item.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <span className={cn("inline-flex size-2.5 rounded-full", dotClass)} aria-label={statusLabel} />
            </header>

            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>Status</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusToneClass)}>
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Last update</span>
                <span className="font-medium text-foreground/80">{updatedLabel}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">CID</span>
                {item.cid ? (
                  <span title={item.cid}>
                    <CopyHash value={item.cid} className="bg-transparent px-2 py-0.5" />
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Hash</span>
                {item.hashLabel ? (
                  <span title={item.hashLabel}>
                    <CopyHash value={item.hashLabel} className="bg-transparent px-2 py-0.5" />
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              {item.gatewayUrl ? (
                <a
                  href={item.gatewayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <path d="M6.5 3.5h-2A1.5 1.5 0 003 5v7a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 12.5v-2" strokeLinecap="round" />
                    <path d="M8.5 7.5L13 3m0 0h-3m3 0v3" strokeLinecap="round" />
                  </svg>
                  Open
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 rounded-full border border-border/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground opacity-70"
                >
                  Open
                </button>
              )}
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
};
