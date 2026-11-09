"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TableCard } from "./TableCard";
import { TableGridProps, TableSection, TableStatus, DiningTableLayout } from "./types";
import { INITIAL_FSR_TABLES, transitionTableState } from "./state";

const SECTIONS: Array<"ALL" | TableSection> = ["ALL", "Indoor", "Outdoor", "VIP", "Bar"];

export function TableGrid({
  initialTables = INITIAL_FSR_TABLES,
  onTableUpdate,
  readOnly = false,
}: TableGridProps) {
  const [tables, setTables] = React.useState<DiningTableLayout[]>(initialTables);
  const [selectedSection, setSelectedSection] = React.useState<"ALL" | TableSection>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<"ALL" | TableStatus>("ALL");
  const [selectedTableId, setSelectedTableId] = React.useState<string | null>(null);

  // Sync when initialTables changes
  React.useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  const handleTransition = (
    tableId: string,
    nextStatus: TableStatus,
    pax?: number,
    orderTotal?: number
  ) => {
    if (readOnly) return;
    setTables((prev) => {
      const updated = prev.map((t) => {
        if (t.id === tableId) {
          return transitionTableState(t, nextStatus, { pax, orderTotal });
        }
        return t;
      });
      onTableUpdate?.(updated);
      return updated;
    });
  };

  const filteredTables = tables.filter((table) => {
    const matchesSection =
      selectedSection === "ALL" || table.section === selectedSection;
    const matchesStatus =
      selectedStatusFilter === "ALL" || table.status === selectedStatusFilter;
    return matchesSection && matchesStatus;
  });

  // Calculate live occupancy stats
  const totalCount = tables.length;
  const vacantCount = tables.filter((t) => t.status === "VACANT").length;
  const seatedCount = tables.filter((t) => t.status === "SEATED").length;
  const orderedCount = tables.filter((t) => t.status === "ORDERED").length;
  const servedCount = tables.filter((t) => t.status === "SERVED").length;
  const billOutCount = tables.filter((t) => t.status === "BILL_OUT").length;
  const occupiedCount = totalCount - vacantCount;
  const occupancyRate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

  return (
    <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
      <CardHeader className="pb-3 border-b border-slate-800/80">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🍽️</span>
              <CardTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
                FSR Dining Floor Plan & Real-Time Occupancy
              </CardTitle>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              5-State Occupancy Engine (`VACANT` → `SEATED` → `ORDERED` → `SERVED` → `BILL_OUT`)
            </p>
          </div>

          {/* Section Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {SECTIONS.map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedSection === sec
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Live Operational Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-3">
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
              Occupancy
            </span>
            <span className="text-sm font-black text-emerald-400">
              {occupancyRate}% ({occupiedCount}/{totalCount})
            </span>
          </div>

          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === "VACANT" ? "ALL" : "VACANT")}
            className={`p-2 rounded-lg border text-center transition ${
              selectedStatusFilter === "VACANT"
                ? "bg-emerald-950/50 border-emerald-500"
                : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
            }`}
          >
            <span className="text-[10px] text-emerald-400 block font-medium uppercase">
              Vacant
            </span>
            <span className="text-sm font-black text-white">{vacantCount}</span>
          </button>

          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === "SEATED" ? "ALL" : "SEATED")}
            className={`p-2 rounded-lg border text-center transition ${
              selectedStatusFilter === "SEATED"
                ? "bg-amber-950/50 border-amber-500"
                : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
            }`}
          >
            <span className="text-[10px] text-amber-400 block font-medium uppercase">
              Seated
            </span>
            <span className="text-sm font-black text-white">{seatedCount}</span>
          </button>

          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === "ORDERED" ? "ALL" : "ORDERED")}
            className={`p-2 rounded-lg border text-center transition ${
              selectedStatusFilter === "ORDERED"
                ? "bg-blue-950/50 border-blue-500"
                : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
            }`}
          >
            <span className="text-[10px] text-blue-400 block font-medium uppercase">
              Kitchen Ordered
            </span>
            <span className="text-sm font-black text-white">{orderedCount}</span>
          </button>

          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === "SERVED" ? "ALL" : "SERVED")}
            className={`p-2 rounded-lg border text-center transition ${
              selectedStatusFilter === "SERVED"
                ? "bg-purple-950/50 border-purple-500"
                : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
            }`}
          >
            <span className="text-[10px] text-purple-300 block font-medium uppercase">
              Served
            </span>
            <span className="text-sm font-black text-white">{servedCount}</span>
          </button>

          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === "BILL_OUT" ? "ALL" : "BILL_OUT")}
            className={`p-2 rounded-lg border text-center transition ${
              selectedStatusFilter === "BILL_OUT"
                ? "bg-rose-950/50 border-rose-500 animate-pulse"
                : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
            }`}
          >
            <span className="text-[10px] text-rose-400 block font-medium uppercase">
              Bill Out
            </span>
            <span className="text-sm font-black text-rose-300">{billOutCount}</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {filteredTables.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="text-sm">No tables found matching the selected filters.</p>
            <button
              onClick={() => {
                setSelectedSection("ALL");
                setSelectedStatusFilter("ALL");
              }}
              className="mt-2 text-xs text-emerald-400 underline hover:text-emerald-300"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {filteredTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                isSelected={selectedTableId === table.id}
                onSelect={(t) => setSelectedTableId(t.id)}
                onTransitionStatus={handleTransition}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
