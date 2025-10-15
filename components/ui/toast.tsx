"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { logger } from "@/lib/logging/logger";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
}

interface ToastContextValue {
  push: (t: Omit<Toast, "id">) => string;
  remove: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((arr) => arr.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, duration: 4000, variant: "info", ...t };
    setItems((arr) => [...arr, toast]);
    if (toast.duration && toast.duration > 0) {
      const handle = setTimeout(() => remove(id), toast.duration);
      timers.current.set(id, handle);
    }
    logger.info("toast", { variant: toast.variant, title: toast.title });
    return id;
  }, [remove]);

  const clear = useCallback(() => {
    for (const [, t] of timers.current) clearTimeout(t);
    timers.current.clear();
    setItems([]);
  }, []);

  const value = useMemo(() => ({ push, remove, clear }), [push, remove, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster items={items} onClose={remove} />
    </ToastContext.Provider>
  );
}

function Icon({ variant }: { variant?: ToastVariant }) {
  const c = "w-5 h-5";
  switch (variant) {
    case "success":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "error":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10 2h4l8 8v4l-8 8h-4l-8-8V10z" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path d="M12 9v4" /><path d="M12 17h.01" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
      );
  }
}

export function Toaster({ items, onClose }: { items: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end gap-2 p-4 sm:p-6">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 40, mass: 1 }}
            className={[
              "pointer-events-auto w-full max-w-sm rounded-lg border p-4 shadow-xl backdrop-blur-sm",
              t.variant === "success" && "bg-green-500/10 border-green-500/30 text-green-200",
              t.variant === "error" && "bg-red-500/10 border-red-500/30 text-red-200",
              t.variant === "warning" && "bg-yellow-500/10 border-yellow-500/30 text-yellow-200",
              t.variant === "info" && "bg-white/10 border-white/20 text-white",
            ].filter(Boolean).join(" ")}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Icon variant={t.variant} />
              </div>
              <div className="flex-1">
                {t.title && <div className="font-semibold leading-tight">{t.title}</div>}
                {t.description && <div className="mt-1 text-sm leading-snug opacity-90">{t.description}</div>}
              </div>
              <button
                onClick={() => onClose(t.id)}
                className="text-white/70 hover:text-white transition"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
