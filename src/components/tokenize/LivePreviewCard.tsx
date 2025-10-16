"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import type { AssetType, ProofRef } from "@/src/lib/types/proofs";
import { formatUSD } from "@/src/lib/utils/format";

export type LivePreviewCardProps = {
  name: string;
  type: AssetType | "";
  valueUSD: number;
  expectedYieldPct?: number;
  proof?: ProofRef | null;
  custodian?: "Pending" | "Approved";
};

const statusStyles: Record<NonNullable<LivePreviewCardProps["custodian"]>, string> = {
  Pending: "bg-amber-400/15 text-amber-200",
  Approved: "bg-primary/15 text-primary",
};

export const LivePreviewCard = ({
  name,
  type,
  valueUSD,
  expectedYieldPct,
  proof,
  custodian = "Pending",
}: LivePreviewCardProps) => {
  const prefersReducedMotion = useReducedMotion();

  const sanitizedYield = useMemo(() => {
    if (expectedYieldPct === undefined || Number.isNaN(expectedYieldPct)) return null;
    return Math.min(Math.max(expectedYieldPct, 0), 100);
  }, [expectedYieldPct]);

  const valueKey = `${valueUSD}-${sanitizedYield ?? "na"}`;

  return (
    <motion.article
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
      className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Preview</p>
          <h3 className="mt-1 text-xl font-semibold text-foreground">{name || "Untitled Asset"}</h3>
        </div>
        {type ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {type}
          </span>
        ) : null}
      </header>

      <motion.div
        key={valueKey}
        initial={prefersReducedMotion ? undefined : { opacity: 0.6, scale: 0.98 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
        className="mt-6 grid gap-4 text-sm sm:grid-cols-2"
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Value</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatUSD(Number.isFinite(valueUSD) ? valueUSD : 0)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected Yield</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {sanitizedYield !== null ? `${sanitizedYield.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} %` : "—"}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Proof</p>
          <div className="mt-1 flex items-center gap-2">
            {proof ? <CopyHash value={proof.hash} /> : <span className="text-muted-foreground">—</span>}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Custodian</p>
          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[custodian]}`}>
            {custodian}
          </span>
        </div>
      </motion.div>
    </motion.article>
  );
};
