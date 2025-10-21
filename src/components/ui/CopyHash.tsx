"use client";

import { useState } from "react";
import { cn } from "@/src/utils/cn";
import { shortHash } from "@/src/lib/utils/text";
import { useToast } from "@/src/components/ui/Toast";

export type CopyHashProps = {
  value: string;
  short?: boolean;
  className?: string;
  variant?: "chip" | "plain";
  textClassName?: string;
};

export const CopyHash = ({
  value,
  short = true,
  className,
  variant = "chip",
  textClassName,
}: CopyHashProps) => {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const label = short ? shortHash(value) : value;

  const handleCopy = async () => {
    if (!value || isCopying) return;
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(value);
      toast({
        title: "Hash copied",
        description: `${label} copied to clipboard`,
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to copy hash", error);
      toast({
        title: "Copy failed",
        description: "We couldn't copy that hash. Try again.",
        variant: "error",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const baseClass =
    variant === "plain"
      ? "group inline-flex items-center gap-1 rounded-none border border-transparent bg-transparent px-0 py-0 text-sm font-medium text-zinc-100 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      : "group inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background no-wrap";

  const textClasses =
    variant === "plain"
      ? cn("break-any font-medium text-sm text-zinc-100", textClassName)
      : cn("font-mono text-[11px]", textClassName);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(baseClass, className)}
      aria-label={`Copy hash ${value}`}
      disabled={isCopying}
    >
      <span className={textClasses}>{label}</span>
      <svg
        aria-hidden
        className={cn(
          "text-muted-foreground transition group-hover:text-primary",
          variant === "plain" ? "size-3" : "size-3.5",
        )}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <path d="M5.25 2.75A1.75 1.75 0 017 1h5.25A1.75 1.75 0 0114 2.75V8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="2" y="5" width="8.5" height="8.5" rx="1.5" />
      </svg>
    </button>
  );
};
