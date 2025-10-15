"use client";

import {
  cloneElement,
  useId,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type HTMLAttributes,
} from "react";
import { cn } from "@/src/utils/cn";

export type TooltipProps = {
  label: string;
  children: ReactElement;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
};

export const Tooltip = ({ label, children, className, side = "top" }: TooltipProps) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const childProps = children.props as HTMLAttributes<HTMLElement>;

  const offsets: Record<typeof side, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 -translate-y-2",
    bottom: "top-full left-1/2 -translate-x-1/2 translate-y-2",
    left: "right-full top-1/2 -translate-y-1/2 -translate-x-2",
    right: "left-full top-1/2 -translate-y-1/2 translate-x-2",
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const triggerProps: HTMLAttributes<HTMLElement> = {
    ["aria-describedby"]: id,
    onMouseEnter: (event: MouseEvent<HTMLElement>) => {
      childProps.onMouseEnter?.(event);
      handleOpen();
    },
    onMouseLeave: (event: MouseEvent<HTMLElement>) => {
      childProps.onMouseLeave?.(event);
      handleClose();
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(event);
      handleOpen();
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(event);
      handleClose();
    },
  };

  const trigger = cloneElement(children, triggerProps);

  return (
    <span className="relative inline-flex">
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border/50 bg-popover/90 px-2 py-1 text-xs text-foreground/80 shadow-lg backdrop-blur",
          offsets[side],
          open ? "opacity-100" : "opacity-0",
          "transition-opacity duration-150",
          className,
        )}
      >
        {label}
      </span>
    </span>
  );
};
