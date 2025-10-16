"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import type { Attestation } from "@/src/lib/types/proofs";
import { formatUSD, formatDateTime } from "@/src/lib/utils/format";

export type AttestationDrawerProps = {
  open: boolean;
  onClose: () => void;
  item?: Attestation | null;
};

const statusBadge: Record<Attestation["status"], string> = {
  Verified: "bg-primary/15 text-primary",
  Pending: "bg-amber-400/15 text-amber-200",
  Late: "bg-rose-400/15 text-rose-300",
};

export const AttestationDrawer = ({ open, onClose, item }: AttestationDrawerProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.querySelector<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  const content = useMemo(() => item ?? null, [item]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && content ? (
        <motion.div
          className="fixed inset-0 z-[95] flex justify-end bg-black/50 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="attestation-drawer-title"
            initial={prefersReducedMotion ? { x: 0, opacity: 0 } : { x: "100%", opacity: 1 }}
            animate={prefersReducedMotion ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { x: 0, opacity: 0 } : { x: "100%", opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="h-full w-full max-w-md overflow-y-auto border-l border-border/60 bg-card/95 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="attestation-drawer-title" className="text-xl font-semibold text-foreground">
                  Week {content.week}
                </h2>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[content.status]}`}>
                  {content.status}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border/50 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Reserve</span>
                <span className="font-semibold text-foreground">{formatUSD(content.reserveUSD)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Proof</span>
                <div className="mt-2 flex items-center gap-2">
                  <CopyHash value={content.ipfs.hash} />
                  <button
                    type="button"
                    onClick={() => window.open(content.ipfs.url, "_blank", "noopener,noreferrer")}
                    className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
                  >
                    Open
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Signed By</span>
                <span className="font-semibold text-foreground">{content.signedBy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timestamp</span>
                <span className="font-semibold text-foreground">{formatDateTime(content.ts)}</span>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
