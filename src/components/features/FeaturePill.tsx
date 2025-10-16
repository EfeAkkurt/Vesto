"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ComponentType } from "react";
import { cn } from "@/src/utils/cn";

const ease = [0.33, 1, 0.68, 1] as const;

export type FeaturePillProps = {
  id: string;
  title: string;
  desc: string;
  Icon: ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: (id: string) => void;
};

export function FeaturePill({ id, title, desc, Icon, isOpen, onToggle }: FeaturePillProps) {
  const prefersReducedMotion = useReducedMotion();

  const iconClasses = cn(
    "grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition-colors md:h-14 md:w-14",
    isOpen ? "bg-[#ADD015] text-[#0F1410]" : "bg-[#7E88E6] text-white",
    !isOpen && "group-hover:bg-[#ADD015] group-hover:text-[#0F1410]",
  );

  const actionBorder = cn(
    "flex h-9 w-9 items-center justify-center rounded-[16px] border transition-colors",
    isOpen ? "border-[#ADD015]" : "border-[#7E88E6] group-hover:border-[#ADD015]",
  );

  const actionStroke = cn(
    "rounded bg-white",
    isOpen ? "bg-[#0F1410]" : "bg-white",
    !isOpen && "group-hover:bg-[#0F1410]",
  );

  const handleToggle = () => onToggle(id);

  return (
    <motion.article
      layout
      className="group relative w-full rounded-[32px] border border-white/10 bg-card/80 px-4 py-4 transition-all sm:px-6"
      whileHover={prefersReducedMotion ? undefined : { y: -1 }}
    >
      <div className="flex items-center gap-4 md:items-start">
        <div className={iconClasses}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={isOpen}
            aria-controls={`feature-${id}`}
            className="flex w-full items-center justify-between gap-4 text-left focus:outline-none"
          >
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground md:text-lg">{title}</h3>
            </div>
            <span className={actionBorder}>
              <motion.span
                initial={false}
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                className="relative flex h-3 w-3 items-center justify-center"
              >
                <span className={cn("absolute h-0.5 w-3", actionStroke)} />
                <span className={cn("absolute w-0.5 h-3", actionStroke)} />
              </motion.span>
            </span>
          </button>
          <AnimatePresence initial={false}>
            {isOpen ? (
              <motion.div
                key="content"
                id={`feature-${id}`}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: "auto", y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.25, ease }}
                className="overflow-hidden"
              >
                <p className="pt-4 text-sm leading-relaxed text-muted-foreground md:text-base">{desc}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}

export default FeaturePill;
