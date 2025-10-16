import type { FC } from "react";
import { cn } from "@/src/utils/cn";
import { shortAddress } from "@/src/lib/utils/format";

export type AddressChipProps = {
  address: string;
  label?: string;
  leadingIcon?: React.ReactNode;
  className?: string;
};

export const AddressChip: FC<AddressChipProps> = ({ address, label, leadingIcon, className }) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80",
      className,
    )}
  >
    {leadingIcon ? <span aria-hidden>{leadingIcon}</span> : null}
    {label ? <span className="text-muted-foreground font-normal normal-case">{label}</span> : null}
    <span>{shortAddress(address)}</span>
  </span>
);
