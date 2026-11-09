import * as React from "react";
import { UtensilsCrossed, Store, Wifi, Clock } from "lucide-react";
import { BrandBadge } from "./BrandBadge";

interface HeaderProps {
  currentOutletName?: string;
  currentOutletType?: "FSR" | "QSR";
}

export function Header({
  currentOutletName = "Nexus Signature Pavilion (KL)",
  currentOutletType = "FSR",
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-md shadow-emerald-950/50">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">
                NEXUS FnB BMS
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                MY-EDITION
              </span>
            </div>
            <p className="text-xs text-slate-400">Enterprise Restaurant Operations</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <BrandBadge />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5">
            <Store className="h-4 w-4 text-emerald-400" />
            <div className="text-left text-xs">
              <div className="font-medium text-slate-200">{currentOutletName}</div>
              <div className="text-[10px] text-slate-400">
                Mode: <span className="font-semibold text-emerald-400">{currentOutletType}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
            <Wifi className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-mono">ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
