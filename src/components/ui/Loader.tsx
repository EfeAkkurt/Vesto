import { cn } from "@/src/utils/cn";

export type LoaderProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses: Record<Required<LoaderProps>["size"], string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export const Loader = ({ size = "sm", className }: LoaderProps) => (
  <span
    role="status"
    aria-live="polite"
    className={cn("inline-flex items-center justify-center text-current", className)}
  >
    <span
      aria-hidden
      className={cn(
        "inline-flex animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
      )}
    />
    <span className="sr-only">Loading</span>
  </span>
);
