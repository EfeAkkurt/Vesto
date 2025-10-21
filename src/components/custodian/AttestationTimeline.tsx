"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { EmptyState } from "@/src/components/shared/EmptyState";
import type { Attestation } from "@/src/lib/types/proofs";
import { MANAGE_DATA_SIGNATURE } from "@/src/lib/types/proofs";
import { formatUSD, formatDate, formatXLM } from "@/src/lib/utils/format";
import { cn } from "@/src/utils/cn";
import { CUSTODIAN_STATUS_THEME } from "@/src/components/custodian/statusTheme";

export type AttestationTimelineProps = {
  items: Attestation[];
  onOpen: (attestation: Attestation) => void;
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

type DetailRow = {
  label: string;
  value: ReactNode;
};

export const AttestationTimeline = ({ items, onOpen }: AttestationTimelineProps) => {
  const prefersReducedMotion = useReducedMotion();

  if (items.length === 0) {
    return (
      <EmptyState
        title="No attestations yet"
        hint="New on-chain entries will appear here automatically."
        className="w-full"
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5 shadow-sm md:p-6">
      <div className="absolute left-6 top-10 bottom-6 hidden w-px bg-border/60 md:block" aria-hidden />
      <motion.ul
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : listVariants}
        className="space-y-6"
      >
        {items.map((item, index) => {
          const key = item.metadataCid || item.txHash || `${item.week}-${index}`;
          const statusTheme = CUSTODIAN_STATUS_THEME[item.status];
          const hasSignature = Boolean(item.signature && item.signature !== MANAGE_DATA_SIGNATURE);
          const reserveUsd = item.reserveUSD ?? 0;
          const showReserve = reserveUsd > 0;
          const signer = item.txSourceAccount ?? item.signedBy ?? "";
          const signatureCount = item.sigCount ?? item.signatureCount ?? 0;

          const detailRows: DetailRow[] = [
            {
              label: "Signed by",
              value: signer ? (
                <div className="flex flex-wrap items-center gap-2">
                  <CopyHash value={signer} variant="plain" />
                  <span className="text-xs text-zinc-500">· {signatureCount} sig</span>
                </div>
              ) : (
                <span className="text-sm font-medium text-zinc-500">—</span>
              ),
            },
          ];

          if (typeof item.feeXlm === "number") {
            detailRows.push({
              label: "Fee",
              value: <span className="text-sm font-medium text-zinc-100">{formatXLM(item.feeXlm)} XLM</span>,
            });
          }

          detailRows.push({
            label: "Proof",
            value: item.ipfs.hash ? <CopyHash value={item.ipfs.hash} variant="plain" /> : <span className="text-sm font-medium text-zinc-500">—</span>,
          });

          detailRows.push({
            label: "Metadata",
            value: item.metadataCid ? <CopyHash value={item.metadataCid} variant="plain" /> : <span className="text-sm font-medium text-zinc-500">—</span>,
          });

          if (item.requestCid) {
            detailRows.push({
              label: "Request CID",
              value: <CopyHash value={item.requestCid} variant="plain" />,
            });
          }

          detailRows.push({
            label: "Tx Hash",
            value: item.txHash ? <CopyHash value={item.txHash} variant="plain" /> : <span className="text-sm font-medium text-zinc-500">—</span>,
          });

          detailRows.push({
            label: "Signature",
            value:
              item.signature === MANAGE_DATA_SIGNATURE ? (
                <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                  Manage data
                </span>
              ) : hasSignature ? (
                <CopyHash value={item.signature} variant="plain" />
              ) : (
                <span className="text-sm font-medium text-zinc-500">—</span>
              ),
          });

          return (
            <motion.li
              key={key}
              variants={prefersReducedMotion ? undefined : itemVariants}
              className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-sm md:p-5"
            >
              <div className="md:grid md:grid-cols-[auto,1fr] md:gap-4">
                <div className="hidden md:flex md:pt-1">
                  <span
                    className={cn(
                      "relative mt-1 h-3 w-3 shrink-0 rounded-full border border-white/20",
                      statusTheme.dot,
                    )}
                  >
                    <span className="sr-only">{item.status}</span>
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold tracking-tight text-zinc-100">
                        Week {item.week}
                      </h3>
                      {showReserve ? (
                        <p className="text-sm font-medium text-zinc-100">
                          Reserve {formatUSD(reserveUsd)}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-500">Signed on {formatDate(item.ts)}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          statusTheme.badge,
                        )}
                      >
                        {item.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpen(item)}
                        className="h-9 rounded-lg border border-white/10 px-3 text-sm font-medium text-zinc-100 transition hover:border-white/20 hover:text-white"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                  <dl className="space-y-3">
                    {detailRows.map((row) => (
                      <div key={`${key}-${row.label}`} className="flex items-start gap-3">
                        <dt className="w-28 shrink-0 text-sm text-zinc-400">{row.label}</dt>
                        <dd className="flex flex-1 flex-wrap justify-start gap-2 text-sm">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
};
