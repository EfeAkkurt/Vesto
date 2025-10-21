import type { FC } from "react";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { cn } from "@/src/utils/cn";

type SkeletonRowProps = {
  lines?: number;
  className?: string;
};

export const SkeletonRow: FC<SkeletonRowProps> = ({ lines = 3, className }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={`skeleton-row-${index}`}
        className={cn("h-3 w-full rounded-md", index === lines - 1 ? "w-2/3" : undefined)}
      />
    ))}
  </div>
);
