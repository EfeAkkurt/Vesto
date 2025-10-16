import { formatDateTime } from "@/src/lib/utils/format";
import { cn } from "@/src/utils/cn";

export type SpvStatusProps = {
  active: boolean;
  lastUpdated: string;
  className?: string;
};

export const SpvStatus = ({ active, lastUpdated, className }: SpvStatusProps) => (
  <section
    className={cn(
      "flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/60 p-4",
      className,
    )}
  >
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "relative inline-flex size-2.5 rounded-full",
          active ? "bg-[#ADD015]" : "bg-red-500/80",
        )}
      >
        {active ? <span className="absolute inset-0 animate-ping rounded-full bg-[#ADD015]/70" aria-hidden /> : null}
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">SPV Status</p>
        <p className="text-sm font-semibold text-foreground">{active ? "Active" : "Inactive"}</p>
      </div>
    </div>
    <div className="text-right text-xs text-muted-foreground">
      <p>Last updated</p>
      <p className="font-medium text-foreground/80">{formatDateTime(lastUpdated)}</p>
    </div>
  </section>
);
