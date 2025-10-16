"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CopyHash } from "@/src/components/ui/CopyHash";
import { openInGateway } from "@/src/lib/utils/ipfs";
import { cn } from "@/src/utils/cn";

export type QuickAccessItem = {
  title: "Audit Report" | "Insurance Policy" | "Legal Agreement";
  desc: string;
  url: string;
  hash: string;
};

export type QuickAccessCardsProps = {
  items: QuickAccessItem[];
  className?: string;
};

export const QuickAccessCards = ({ items, className }: QuickAccessCardsProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : "hidden"}
      animate={prefersReducedMotion ? undefined : "visible"}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.06,
          },
        },
      }}
      className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}
    >
      {items.map((item) => (
        <motion.article
          key={item.hash}
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          whileHover={prefersReducedMotion ? undefined : { y: -4 }}
          transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
          className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur"
        >
          <header className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{item.title}</h3>
            <span className="inline-flex size-2.5 rounded-full bg-primary/80" aria-hidden />
          </header>
          <p className="mt-3 text-sm text-muted-foreground">{item.desc}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openInGateway(item.url)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M6.5 3.5h-2A1.5 1.5 0 003 5v7a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 12.5v-2" strokeLinecap="round" />
                <path d="M8.5 7.5L13 3m0 0h-3m3 0v3" strokeLinecap="round" />
              </svg>
              Open
            </button>
            <CopyHash value={item.hash} className="bg-transparent px-2" />
          </div>
        </motion.article>
      ))}
    </motion.div>
  );
};
