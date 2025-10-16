"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader } from "@/src/components/ui/Loader";
import { useToast } from "@/src/components/ui/Toast";

const defaultSteps = ["Lock", "Relay", "Mint/Burn", "Complete"] as const;

type Step = (typeof defaultSteps)[number];

export type ProgressModalProps = {
  open: boolean;
  onClose: () => void;
  steps?: Step[];
};

type CompletionState = {
  index: number;
  isComplete: boolean;
};

export const ProgressModal = ({ open, onClose, steps = [...defaultSteps] }: ProgressModalProps) => {
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState<CompletionState>({ index: 0, isComplete: false });
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const focusTrap = useCallback(
    (event: KeyboardEvent) => {
      if (!containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.key === "Tab") {
        if (event.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            event.preventDefault();
          }
        } else if (document.activeElement === last) {
          first.focus();
          event.preventDefault();
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;

    const handleKey = (event: KeyboardEvent) => focusTrap(event);
    document.addEventListener("keydown", handleKey);

    const focusable = containerRef.current?.querySelector<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
    focusable?.focus();

    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [focusTrap, open]);

  useEffect(() => {
    if (!open) return;
    setProgress({ index: 0, isComplete: false });
    completedRef.current = false;

    const advance = (step = 0) => {
      if (step >= steps.length - 1) {
        setProgress({ index: steps.length - 1, isComplete: true });
        if (!completedRef.current) {
          completedRef.current = true;
          toast({
            title: "Bridge complete",
            description: "Assets successfully transferred",
            variant: "success",
          });
        }
        return;
      }

      setProgress({ index: step, isComplete: false });
      timerRef.current = window.setTimeout(() => advance(step + 1), 900);
    };

    timerRef.current = window.setTimeout(() => advance(0), 900);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open, steps, toast]);

  const stepState = useMemo(() => {
    const completed = new Set<number>();
    for (let i = 0; i < progress.index; i += 1) {
      completed.add(i);
    }
    if (progress.isComplete) {
      completed.add(progress.index);
    }
    return completed;
  }, [progress.index, progress.isComplete]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 backdrop-blur"
          onClick={(event) => {
            if (event.currentTarget === event.target) onClose();
          }}
        >
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bridge-progress-title"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card/90 p-6 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 id="bridge-progress-title" className="text-xl font-semibold text-foreground">
                  Bridge Progress
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We are coordinating signatures across networks. Keep this tab open.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border/40 px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground"
              >
                Close
              </button>
            </header>

            <ol className="mt-6 space-y-4">
              {steps.map((step, index) => {
                const isCompleted = stepState.has(index);
                const isActive = progress.index === index && !progress.isComplete;

                return (
                  <li
                    key={step}
                    className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 px-4 py-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/70">
                      {isCompleted ? (
                        <svg className="h-4 w-4 text-[#ADD015]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M4 8l2.5 2.5L12 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : isActive ? (
                        <Loader size="sm" className="text-[#ADD015]" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-border" />
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{step}</p>
                      <p className="text-xs text-muted-foreground">
                        {index === 0 && "Locking source assets"}
                        {index === 1 && "Relaying proof to target chain"}
                        {index === 2 && "Minting/Burning wrapped asset"}
                        {index === 3 && "Finalizing and notifying custodians"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
