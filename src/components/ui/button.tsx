import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 select-none";

    const variantStyles = {
      primary:
        "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm active:bg-emerald-700",
      secondary:
        "bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-900 border border-slate-700",
      outline:
        "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white",
      ghost:
        "bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white",
      destructive:
        "bg-rose-600 text-white hover:bg-rose-500 shadow-sm active:bg-rose-700",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
