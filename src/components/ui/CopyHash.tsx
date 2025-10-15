"use client";

import { useState } from "react";
import { cn } from "@/src/utils/cn";
import { shortHash } from "@/src/utils/format";

export type CopyHashProps = {
  hash: string;
  className?: string;
  truncate?: boolean;
};

export const CopyHash: React.FC<CopyHashProps> = ({ hash, className, truncate = true }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error("Failed to copy hash", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-2 py-1 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={`Copy hash ${hash}`}
    >
      <span className="font-mono text-[11px] uppercase tracking-wide">
        {truncate ? shortHash(hash) : hash}
      </span>
      <svg
        aria-hidden
        className="size-3.5 text-muted-foreground transition group-hover:text-primary"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M5 2.75A1.75 1.75 0 016.75 1h5.5A1.75 1.75 0 0114 2.75v5.5A1.75 1.75 0 0112.25 10H11" />
        <rect x="2" y="5" width="9" height="9" rx="1.75" />
      </svg>
      <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute translate-y-6 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] text-primary opacity-0 transition",
          copied && "translate-y-8 opacity-100",
        )}
      >
        Copied
      </span>
    </button>
  );
};
