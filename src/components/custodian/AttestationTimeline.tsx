"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import type { Attestation } from "@/src/lib/types/proofs";
import { formatUSD, formatDate } from "@/src/lib/utils/format";

export type AttestationTimelineProps = {
  items: Attestation[];
  onOpen: (attestation: Attestation) => void;
};

const statusStyles: Record<Attestation["status"], { dot: string; badge: string }> = {
  Verified: { dot: "bg-[#ADD015]", badge: "bg-primary/15 text-primary" },
  Pending: { dot: "bg-amber-300", badge: "bg-amber-400/15 text-amber-200" },
  Late: { dot: "bg-rose-400", badge: "bg-rose-400/15 text-rose-300" },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export const AttestationTimeline = ({ items, onOpen }: AttestationTimelineProps) => {
  const prefersReducedMotion = useReducedMotion();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        No attestations yet. Upload the first proof to kick off the timeline.
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/60 p-6">
      <div className="absolute left-6 top-10 bottom-6 hidden w-px bg-border/60 md:block" aria-hidden />
      <motion.ul
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : listVariants}
        className="space-y-6"
      >
        {items.map((item) => {
          const styles = statusStyles[item.status];
          return (
            <motion.li
              key={item.week}
              variants={prefersReducedMotion ? undefined : itemVariants}
              className="relative grid gap-3 rounded-xl border border-border/50 bg-background/40 p-4 md:grid-cols-[auto,1fr,auto] md:items-start"
            >
              <div className="hidden md:flex">
                <span className={`relative mt-1 h-3 w-3 shrink-0 rounded-full border border-border/40 ${styles.dot}`}>
                  <span className="sr-only">{item.status}</span>
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Week {item.week} — Reserve {formatUSD(item.reserveUSD)}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}>{item.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">Signed on {formatDate(item.ts)} by {item.signedBy}</p>
                <CopyHash value={item.ipfs.hash} />
              </div>
              <div className="flex items-start justify-end">
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
                >
                  Open
                </button>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
};
