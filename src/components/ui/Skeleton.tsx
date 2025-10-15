import type { FC } from "react";
import { cn } from "@/src/utils/cn";

export type SkeletonProps = {
  className?: string;
};

export const Skeleton: FC<SkeletonProps> = ({ className }) => (
  <div
    aria-hidden
    className={cn(
      "animate-pulse rounded-lg bg-muted/40",
      className,
    )}
  />
);
