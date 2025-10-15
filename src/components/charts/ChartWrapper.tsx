"use client";

import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeScale, transitions } from "@/src/components/motion/presets";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { cn } from "@/src/utils/cn";

export type ChartWrapperProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  empty?: boolean;
  emptyState?: ReactNode;
  className?: string;
};

export const ChartWrapper: FC<ChartWrapperProps> = ({
  title,
  description,
  actions,
  children,
  isLoading,
  empty,
  emptyState,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const showChart = ready || prefersReducedMotion;

  return (
    <motion.section
      ref={containerRef}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur",
        className,
      )}
      initial={prefersReducedMotion ? undefined : "hidden"}
      animate={prefersReducedMotion ? undefined : "visible"}
      variants={prefersReducedMotion ? undefined : fadeScale}
      transition={transitions.base}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground/90">{title}</h2>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      <div className="mt-4 flex-1">
        {isLoading && !showChart ? (
          <div className="flex h-full items-center justify-center">
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : null}
        {showChart ? (
          empty ? (
            emptyState ?? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No data available.
              </div>
            )
          ) : (
            <div className="h-full w-full">{isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : children}</div>
          )
        ) : null}
      </div>
    </motion.section>
  );
};
