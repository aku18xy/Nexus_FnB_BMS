import * as React from "react";
import { Header } from "@/components/common/Header";
import { FsrTableGrid } from "@/components/pos/FsrTableGrid";
import { QsrQuickOrder } from "@/components/pos/QsrQuickOrder";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Layers,
  Coins,
  Cpu,
  ShieldCheck,
  Flame,
  Printer,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header />

      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6 sm:p-8 shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              TSK-ARCH-01 Architecture Foundation Online
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Nexus FnB Business Management System
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Proprietary enterprise F&B platform engineered for Malaysian multi-brand chains.
              Combines seated dining table management (FSR) and high-speed counter ordering (QSR)
              with zero third-party lock-in and 100% Vercel Serverless cloud infrastructure.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 font-mono">
                LHDN MyInvois v1.0
              </span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 font-mono">
                JKDM 6% SST
              </span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 font-mono">
                BNM 5-Sen Rounding
              </span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 font-mono">
                ESC/POS Hardware
              </span>
            </div>
          </div>
        </div>

        {/* Dual Mode Demonstrators */}
        <div className="space-y-6">
          <FsrTableGrid />
          <QsrQuickOrder />
        </div>

        {/* Statutory & Architecture Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Malaysian Compliance Core
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400 space-y-2">
              <p>
                Native support for B2C consolidated monthly e-invoicing and real-time B2B
                tax-deductible invoices with official LHDN QR codes on receipts.
              </p>
              <div className="pt-1 text-slate-300 font-mono text-[11px]">
                Status: Regulatory Engine Active
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                SST & Rounding Cascades
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400 space-y-2">
              <p>
                Automated 10% Service Charge compounding for FSR, statutory 6% Service Tax, and
                Bank Negara 5-sen cash rounding variance recording.
              </p>
              <div className="pt-1 text-slate-300 font-mono text-[11px]">
                Calculations: Verified Exact
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                In-Store ESC/POS & Offline
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400 space-y-2">
              <p>
                Direct local raw ESC/POS thermal printing for Epson, Sunmi, and Xprinter devices.
                IndexedDB outbox ensures zero downtime during Unifi/Maxis fiber disruptions.
              </p>
              <div className="pt-1 text-slate-300 font-mono text-[11px]">
                Resilience: Zero-Downtime Design
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 sm:px-8 text-center text-xs text-slate-500">
        <p>Nexus FnB BMS (Malaysia Edition) • Next.js 15 App Router Foundation • 100% Vercel Serverless Architecture</p>
      </footer>
    </div>
  );
}
