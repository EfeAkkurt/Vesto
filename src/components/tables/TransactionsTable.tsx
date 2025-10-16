"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Transaction } from "@/src/lib/mockData";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { formatCurrency, formatDateTime } from "@/src/lib/utils/format";
import { transitions, stagger, listItem } from "@/src/components/motion/presets";

const typeFilters = [
  { label: "All", value: "ALL" },
  { label: "Mint", value: "MINT" },
  { label: "Burn", value: "BURN" },
  { label: "Distribution", value: "DIST" },
  { label: "Attestation", value: "ATTEST" },
] as const;

const statusFilters = [
  { label: "All", value: "ALL" },
  { label: "Success", value: "success" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
] as const;

const statusTone: Record<Transaction["status"], string> = {
  success: "border-green-500/40 bg-green-500/10 text-green-200",
  pending: "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",
  failed: "border-red-500/40 bg-red-500/10 text-red-200",
};

type TransactionsTableProps = {
  transactions: Transaction[];
  isLoading?: boolean;
};

export const TransactionsTable = ({ transactions, isLoading }: TransactionsTableProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [typeFilter, setTypeFilter] = useState<(typeof typeFilters)[number]["value"]>("ALL");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]["value"]>("ALL");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const typeMatches = typeFilter === "ALL" || tx.type === typeFilter;
      const statusMatches = statusFilter === "ALL" || tx.status === statusFilter;
      return typeMatches && statusMatches;
    });
  }, [transactions, typeFilter, statusFilter]);

  const empty = !isLoading && filtered.length === 0;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground/90">Recent Transactions</h2>
          <p className="text-xs text-muted-foreground">Mint, burn, distribution, and attest actions</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
              className={[
                "rounded-full border px-3 py-1 font-semibold uppercase tracking-wide transition",
                typeFilter === filter.value
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border/40 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
              ].join(" ")}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={[
              "rounded-full border px-3 py-1 font-semibold uppercase tracking-wide transition",
              statusFilter === filter.value
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/40 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
            ].join(" ")}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="pb-3 pr-6 font-medium">Time</th>
              <th className="pb-3 pr-6 font-medium">Type</th>
              <th className="pb-3 pr-6 font-medium">Asset</th>
              <th className="pb-3 pr-6 font-medium text-right">Amount</th>
              <th className="pb-3 pr-6 font-medium">Hash</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          {isLoading ? (
            <tbody className="align-middle">
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-t border-border/20">
                  <td className="py-3 pr-6"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-3 pr-6"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-3 pr-6"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-3 pr-6 text-right"><Skeleton className="ml-auto h-4 w-16" /></td>
                  <td className="py-3 pr-6"><Skeleton className="h-4 w-28" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))}
            </tbody>
          ) : empty ? (
            <tbody>
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  Henüz işlem yok, mint veya dağıtım yapın.
                </td>
              </tr>
            </tbody>
          ) : (
            <motion.tbody
              initial={prefersReducedMotion ? undefined : "hidden"}
              animate={prefersReducedMotion ? undefined : "visible"}
              variants={prefersReducedMotion ? undefined : stagger(0.06)}
              className="align-middle"
            >
              {filtered.map((tx) => (
                <motion.tr
                  key={tx.hash}
                  variants={prefersReducedMotion ? undefined : listItem}
                  transition={transitions.fast}
                  className="border-t border-border/20 text-sm transition hover:bg-border/10"
                >
                  <td className="py-3 pr-6 text-xs text-muted-foreground">{formatDateTime(tx.ts)}</td>
                  <td className="py-3 pr-6 text-sm font-semibold text-foreground/80">{tx.type}</td>
                  <td className="py-3 pr-6 text-sm text-foreground/70">{tx.asset}</td>
                  <td className="py-3 pr-6 text-right font-semibold text-foreground/90">
                    {tx.amount ? formatCurrency(tx.amount) : "—"}
                  </td>
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-2">
                      <CopyHash value={tx.hash} />
                      <Link
                        href={`https://stellar.expert/explorer/${tx.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className={["rounded-full border px-2 py-0.5 text-xs font-semibold", statusTone[tx.status]].join(" ")}
                      aria-label={`Status ${tx.status}`}
                    >
                      {tx.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          )}
        </table>
      </div>
    </section>
  );
};
