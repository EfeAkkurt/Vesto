import * as React from "react";

type Variant = "default" | "outline" | "secondary" | "ghost" | "link";
type Size = "sm" | "default" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus:outline-none";

const variantClasses: Record<Variant, string> = {
  default: "bg-white text-black hover:bg-white/90",
  outline: "border border-white/30 text-white hover:bg-white/10",
  secondary: "bg-neutral-800 text-white hover:bg-neutral-700",
  ghost: "text-white hover:bg-white/10",
  link: "text-white underline-offset-4 hover:underline",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3",
  default: "h-10 px-4",
  lg: "h-11 px-8",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const classes = [base, variantClasses[variant], sizeClasses[size], className]
      .filter(Boolean)
      .join(" ");
    return <button ref={ref} className={classes} {...props} />;
  }
);
Button.displayName = "Button";

export const buttonVariants = { base, variantClasses, sizeClasses };
