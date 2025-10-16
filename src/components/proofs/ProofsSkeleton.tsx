import { Skeleton } from "@/src/components/ui/Skeleton";

export const ProofsSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={`proof-skeleton-${index}`}
        className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-background/40 p-4"
      >
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="col-span-2 h-3 w-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
    ))}
  </div>
);
