"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { buildExpertTxWidgetUrl, type StellarExpertNetwork } from "@/src/lib/stellar/expert";

export type StellarExpertWidgetDialogProps = {
  txHash: string;
  network?: StellarExpertNetwork;
  open: boolean;
  onClose: () => void;
};

type WidgetMessage = {
  widget?: string;
  height?: number;
};

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const INITIAL_HEIGHT = 480;
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 720;

export const StellarExpertWidgetDialog = ({ txHash, network = "TESTNET", open, onClose }: StellarExpertWidgetDialogProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [frameHeight, setFrameHeight] = useState(INITIAL_HEIGHT);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const frameSrc = useMemo(() => buildExpertTxWidgetUrl(txHash, network), [network, txHash]);

  useEffect(() => {
    if (!open) return undefined;
    setFrameHeight(INITIAL_HEIGHT);
    const previousActive = document.activeElement as HTMLElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (!containerRef.current || event.key !== "Tab") return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(focusableSelector);
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

    const focusable = containerRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
    if (focusable && focusable.length > 0) {
      focusable[0]?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const handleMessage = (event: MessageEvent<WidgetMessage>) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;
      if (payload.widget !== iframeRef.current.src) return;
      if (typeof payload.height !== "number") return;
      const nextHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(payload.height)));
      setFrameHeight(nextHeight);
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Transaction details"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
            className="w-full max-w-3xl rounded-2xl border border-border/60 bg-card/95 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Live transaction details</h2>
                <p className="text-sm text-muted-foreground">
                  Embedded directly from StellarExpert for network visibility.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                Close
              </button>
            </div>
            <div className="mt-6 overflow-hidden rounded-xl border border-border/50 bg-background/40">
              <iframe
                ref={iframeRef}
                key={frameSrc}
                title="StellarExpert transaction details"
                src={frameSrc}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                className="w-full"
                style={{
                  height: `${frameHeight}px`,
                  minHeight: `${MIN_HEIGHT}px`,
                  maxHeight: `${MAX_HEIGHT}px`,
                  border: "none",
                  overflow: "hidden",
                  width: "100%",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

StellarExpertWidgetDialog.displayName = "StellarExpertWidgetDialog";
