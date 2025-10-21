import type { FC, ReactNode } from "react";
import { cn } from "@/src/utils/cn";

type EmptyStateProps = {
  title: string;
  hint: string;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export const EmptyState: FC<EmptyStateProps> = ({
  title,
  hint,
  icon,
  className,
  children,
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center",
      className,
    )}
  >
    {icon ? <div className="mb-1 text-muted-foreground">{icon}</div> : null}
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground">{hint}</p>
    {children ? <div className="mt-3">{children}</div> : null}
  </div>
);
