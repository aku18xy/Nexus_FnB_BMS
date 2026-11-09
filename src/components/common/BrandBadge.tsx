import * as React from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function BrandBadge() {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="success" className="gap-1.5 py-1 px-3 text-xs font-medium">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span>100% Vercel Native</span>
      </Badge>
      <Badge variant="default" className="gap-1.5 py-1 px-3 text-xs font-medium text-slate-300">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
        <span>LHDN MyInvois Ready</span>
      </Badge>
    </div>
  );
}
