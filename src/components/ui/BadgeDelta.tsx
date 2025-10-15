import type { FC } from "react";
import { cn } from "@/src/utils/cn";

export type BadgeDeltaProps = {
  value: number;
  trend: "up" | "down" | "flat";
  className?: string;
};

const TrendIcon = ({ trend }: { trend: "up" | "down" | "flat" }) => {
  const base = "size-3";
  switch (trend) {
    case "up":
      return (
        <svg className={base} viewBox="0 0 16 16" aria-hidden>
          <path
            d="M3 9.5L7.25 5.25L9.75 7.75L13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 4.5H13V6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "down":
      return (
        <svg className={base} viewBox="0 0 16 16" aria-hidden>
          <path
            d="M3 6.5L7.25 10.75L9.75 8.25L13 11.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 11.5H13V9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg className={base} viewBox="0 0 16 16" aria-hidden>
          <path d="M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
};

export const BadgeDelta: FC<BadgeDeltaProps> = ({ value, trend, className }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium",
      trend === "up" && "border-primary/40 bg-primary/10 text-primary",
      trend === "down" && "border-destructive/40 bg-destructive/10 text-destructive",
      trend === "flat" && "border-border/40 bg-border/10 text-foreground/60",
      className,
    )}
  >
    <TrendIcon trend={trend} />
    <span>{value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`}</span>
  </span>
);
