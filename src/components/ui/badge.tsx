import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "outline";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";

  const variantStyles = {
    default: "bg-slate-800 text-slate-300 border border-slate-700",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
    outline: "text-slate-300 border border-slate-600",
  };

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
}
