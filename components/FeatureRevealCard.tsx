"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  title: string;
  icon?: React.ReactNode;
  accent?: string;
  defaultOpen?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export default function FeatureRevealCard({
  title,
  icon,
  accent = "#A79FF1",
  defaultOpen = false,
  className = "",
  children,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <motion.section
      initial={false}
      animate={{}}
      whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.25)" }}
      transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
      className={`group relative w-full rounded-[40px] border border-gray-900 bg-black p-5 shadow-lg backdrop-blur-sm sm:p-6 ${className}`}
      onClick={() => setOpen((value) => !value)}
    >
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-[28px] px-2 py-1 text-left focus:outline-none pointer-events-none"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"
            style={{ backgroundColor: accent }}
            aria-hidden
          >
            {icon ?? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 7L9 18l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">{title}</h3>
            <div
              className="mt-1 inline-flex items-center rounded-[12px] px-2 py-0.5 text-xs"
              style={{ border: `1px solid ${accent}` }}
            >
              Details
            </div>
          </div>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[16px] border transition-all duration-200 group-hover:border-opacity-100"
          style={{ borderColor: accent }}
          aria-hidden
        >
          <motion.div
            initial={false}
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="relative h-3 w-3"
          >
            <span className="absolute left-0 top-1/2 h-0.5 w-3 -translate-y-1/2 bg-white" />
            <span className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2 bg-white" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4 text-sm leading-relaxed text-muted-foreground sm:pt-5">
              {children ?? (
                <p>
                  Ensure the safety of your data with cutting-edge encryption and robust security protocols, giving you
                  peace of mind.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <span className="pointer-events-none absolute inset-0 rounded-[40px] ring-0 ring-[#ADD015]/0 transition group-hover:ring-2 group-hover:ring-[#ADD015]/25" />
    </motion.section>
  );
}
