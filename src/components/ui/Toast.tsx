"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/src/utils/cn";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

export type Toast = ToastOptions & { id: string };

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  toasts: Toast[];
  push: (options: ToastOptions) => string; // backwards compatibility
}

const ToastContext = createContext<ToastContextValue | null>(null);

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
};

const DEFAULT_DURATION = 3500;
const MAX_TOASTS = 4;

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, number>>(new Map());
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((timer) => window.clearTimeout(timer));
      timersMap.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((existing) => existing.filter((toast) => toast.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (toast: Toast) => {
      if (!toast.duration || toast.duration <= 0) return;
      const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
      timers.current.set(toast.id, timer);
    },
    [dismiss],
  );

  const toast = useCallback(
    ({ id: customId, duration = DEFAULT_DURATION, ...rest }: ToastOptions) => {
      const id = customId ?? generateId();
      const next: Toast = {
        id,
        duration,
        variant: rest.variant ?? "info",
        ...rest,
      };

      setToasts((existing) => {
        const deduped = existing.filter((item) => item.id !== id);
        const updated = [...deduped, next];
        return updated.slice(-MAX_TOASTS);
      });

      scheduleDismiss(next);
      return id;
    },
    [scheduleDismiss],
  );

  const clear = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  const pauseTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const resumeTimer = useCallback(
    (toast: Toast) => {
      if (!toast.duration || toast.duration <= 0) return;
      // Restart timer with default duration when leaving hover.
      const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
      timers.current.set(toast.id, timer);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toast, dismiss, clear, toasts, push: toast }),
    [clear, dismiss, toast, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <ToastViewport
              toasts={toasts}
              dismiss={dismiss}
              pauseTimer={pauseTimer}
              resumeTimer={resumeTimer}
              prefersReducedMotion={prefersReducedMotion}
            />,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

type ToastViewportProps = {
  toasts: Toast[];
  dismiss: (id: string) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (toast: Toast) => void;
  prefersReducedMotion: boolean;
};

const variantStyles: Record<ToastVariant, string> = {
  success: "border-l-4 border-l-[#ADD015]",
  error: "border-l-4 border-l-rose-500",
  info: "border-l-4 border-l-slate-400",
  warning: "border-l-4 border-l-amber-400",
};

const ToastViewport = ({
  toasts,
  dismiss,
  pauseTimer,
  resumeTimer,
  prefersReducedMotion,
}: ToastViewportProps) => {
  const baseMotion = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 8 },
      };

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex flex-col items-end justify-end gap-3 p-4 sm:p-6">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            {...baseMotion}
            transition={{ duration: 0.15, ease: [0.33, 1, 0.68, 1] }}
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-xl border border-border/60 bg-card/80 px-4 py-3 text-sm text-foreground shadow-xl backdrop-blur",
              variantStyles[toast.variant ?? "info"],
            )}
            role="status"
            aria-live="polite"
            onMouseEnter={() => pauseTimer(toast.id)}
            onMouseLeave={() => resumeTimer(toast)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
                {toast.description ? (
                  <p className="text-xs text-muted-foreground">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-xs text-muted-foreground transition hover:text-foreground"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
