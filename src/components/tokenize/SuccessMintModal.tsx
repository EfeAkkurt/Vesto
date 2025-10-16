"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { formatUSD } from "@/src/lib/utils/format";
import type { MintResult } from "@/src/lib/types/proofs";

export type SuccessMintModalProps = {
  open: boolean;
  onClose: () => void;
  result?: MintResult | null;
};

export type SuccessMintModalHandle = {
  focusPrimary: () => void;
};

export const SuccessMintModal = forwardRef<SuccessMintModalHandle, SuccessMintModalProps>(
  ({ open, onClose, result }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const primaryButtonRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({ focusPrimary: () => primaryButtonRef.current?.focus() }), []);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (!open) return undefined;
      const previousActive = document.activeElement as HTMLElement | null;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (!containerRef.current || event.key !== "Tab") return;
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
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
      primaryButtonRef.current?.focus();

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        previousActive?.focus();
      };
    }, [open, onClose]);

    const content = useMemo(() => result ?? null, [result]);

    if (!mounted) return null;

    return createPortal(
      <AnimatePresence>
        {open && content ? (
          <motion.div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(event) => {
              if (event.target === event.currentTarget) onClose();
            }}
          >
            <motion.div
              ref={containerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="success-mint-title"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
              className="w-full max-w-md rounded-2xl border border-border/60 bg-card/90 p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <svg aria-hidden className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <h2 id="success-mint-title" className="text-xl font-semibold text-foreground">
                      Token minted successfully
                    </h2>
                    <p className="text-sm text-muted-foreground">The asset is live and ready for custodian review.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-border/50 px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 space-y-4 rounded-xl border border-border/40 bg-background/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Token ID</span>
                  <span className="font-semibold text-foreground">{content.tokenId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Minted Supply</span>
                  <span className="font-semibold text-foreground">{formatUSD(content.supply)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Proof</span>
                  <div className="mt-2">
                    <CopyHash value={content.proof.hash} />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/custodian"
                  ref={(node) => {
                    primaryButtonRef.current = node ?? null;
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Go to Custodian
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-lg border border-border/60 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>,
      document.body,
    );
  },
);

SuccessMintModal.displayName = "SuccessMintModal";
