"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { HorizonPayment } from "@/src/hooks/horizon";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { formatDateTime, formatUSD, formatXLM } from "@/src/lib/utils/format";
import { transitions, stagger, listItem } from "@/src/components/motion/presets";
import { STELLAR_NET } from "@/src/utils/constants";

const statusTone: Record<string, string> = {
  success: "border-green-500/40 bg-green-500/10 text-green-200",
  failed: "border-red-500/40 bg-red-500/10 text-red-200",
  pending: "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",
};

const explorerSegment = STELLAR_NET.toUpperCase() === "TESTNET" ? "testnet" : "public";

const deriveStatus = (payment: HorizonPayment) => {
  if (payment.transaction_successful === false) return "failed";
  if (payment.transaction_successful === true) return "success";
  return "pending";
};

const formatType = (type: string) => type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const shortIssuer = (issuer: string) => `${issuer.slice(0, 4)}…${issuer.slice(-4)}`;

type TransactionsTableProps = {
  payments: HorizonPayment[];
  isLoading?: boolean;
  error?: Error | null;
};

export const TransactionsTable = ({ payments, isLoading, error }: TransactionsTableProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const availableTypes = useMemo(() => {
    const unique = new Set(payments.map((payment) => payment.type));
    return ["ALL", ...Array.from(unique)];
  }, [payments]);

  const filtered = useMemo(() => {
    return payments.filter((payment) => {
      const status = deriveStatus(payment);
      const typeMatches = typeFilter === "ALL" || payment.type === typeFilter;
      const statusMatches = statusFilter === "ALL" || status === statusFilter;
      return typeMatches && statusMatches;
    });
  }, [payments, typeFilter, statusFilter]);

  const statusFilters = [
    { label: "All", value: "ALL" },
    { label: "Success", value: "success" },
    { label: "Pending", value: "pending" },
    { label: "Failed", value: "failed" },
  ] as const;

  const empty = !isLoading && filtered.length === 0;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground/90">Recent Transactions</h2>
          <p className="text-xs text-muted-foreground">Payments streamed from Horizon</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={[
                "rounded-full border px-3 py-1 font-semibold uppercase tracking-wide transition",
                typeFilter === type
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border/40 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-primary",
              ].join(" ")}
            >
              {type === "ALL" ? "All" : formatType(type)}
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
                  {error ? "Unable to load payments right now." : "No Horizon payments yet."}
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
              {filtered.map((payment) => {
                const status = deriveStatus(payment);
                const assetLabel = payment.asset_type === "native" ? "XLM" : payment.asset_code ?? "Asset";
                const amount = payment.amount ? Number.parseFloat(payment.amount) : undefined;
                const amountDisplay = (() => {
                  if (amount == null || !Number.isFinite(amount)) return "—";
                  if (payment.asset_type === "native") {
                    return `${formatXLM(amount)} XLM`;
                  }
                  return formatUSD(amount);
                })();
                return (
                  <motion.tr
                    key={payment.id}
                    variants={prefersReducedMotion ? undefined : listItem}
                    transition={transitions.fast}
                    className="border-t border-border/20 text-sm transition hover:bg-border/10"
                  >
                    <td className="py-3 pr-6 text-xs text-muted-foreground">{formatDateTime(payment.created_at)}</td>
                    <td className="py-3 pr-6 text-sm font-semibold text-foreground/80">{formatType(payment.type)}</td>
                    <td className="py-3 pr-6 text-sm text-foreground/70">
                      {assetLabel}
                      {payment.asset_issuer ? (
                        <span className="ml-2 text-xs text-muted-foreground">{shortIssuer(payment.asset_issuer)}</span>
                      ) : null}
                    </td>
                    <td className="no-wrap py-3 pr-6 text-right font-semibold text-foreground/90">
                      {amountDisplay}
                    </td>
                    <td className="py-3 pr-6">
                      <div className="flex items-center gap-2 no-wrap">
                        <CopyHash value={payment.transaction_hash} />
                        <Link
                          href={`https://stellar.expert/explorer/${explorerSegment}/tx/${payment.transaction_hash}`}
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
                        className={["rounded-full border px-2 py-0.5 text-xs font-semibold", statusTone[status] ?? statusTone.pending].join(" ")}
                        aria-label={`Status ${status}`}
                      >
                        {status}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </motion.tbody>
          )}
        </table>
      </div>
    </section>
  );
};
