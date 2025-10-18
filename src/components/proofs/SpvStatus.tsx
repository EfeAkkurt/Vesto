import { formatRelativeTime, formatDateTime } from "@/src/lib/utils/format";
import { cn } from "@/src/utils/cn";

export type SpvStatusState = "Active" | "Reviewing" | "Suspended";

export type SpvStatusProps = {
  status: SpvStatusState;
  updatedAt?: string;
  className?: string;
};

const STATUS_TONE: Record<SpvStatusState, { dot: string; pulse?: string; label: string }> = {
  Active: {
    dot: "bg-emerald-400",
    pulse: "bg-emerald-400/60",
    label: "Active",
  },
  Reviewing: {
    dot: "bg-amber-400",
    label: "Reviewing",
  },
  Suspended: {
    dot: "bg-rose-500",
    label: "Suspended",
  },
};

export const SpvStatus = ({ status, updatedAt, className }: SpvStatusProps) => {
  const tone = STATUS_TONE[status];
  const relative = updatedAt ? formatRelativeTime(updatedAt) : "—";
  const absolute = updatedAt ? formatDateTime(updatedAt) : "—";

  return (
    <section
      className={cn(
        "flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("relative inline-flex size-3 rounded-full", tone.dot)}>
          {tone.pulse ? (
            <span className={cn("absolute inset-0 animate-ping rounded-full", tone.pulse)} aria-hidden />
          ) : null}
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">SPV Status</p>
          <p className="text-lg font-semibold text-foreground">{tone.label}</p>
        </div>
      </div>
      <div className="rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground/80">Last updated {relative}</p>
        <p className="mt-1 text-[11px]">{absolute}</p>
      </div>
    </section>
  );
};
