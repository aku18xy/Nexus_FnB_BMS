"use client";

import * as React from "react";
import { Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMYR } from "@/lib/utils";
import { TableCardProps } from "./types";
import {
  getStatusStyle,
  getNextPossibleTransitions,
} from "./state";

export function TableCard({
  table,
  isSelected,
  onSelect,
  onTransitionStatus,
}: TableCardProps) {
  const statusMeta = getStatusStyle(table.status);
  const nextActions = getNextPossibleTransitions(table.status);

  // Shape specific visual styling
  const shapeClass =
    table.shape === "round"
      ? "rounded-3xl border-2"
      : table.shape === "long"
      ? "rounded-2xl border-2 col-span-1 sm:col-span-2"
      : "rounded-2xl border-2";

  const isOverCapacity =
    table.currentPax !== undefined && table.currentPax > table.capacity;

  return (
    <div
      onClick={() => onSelect?.(table)}
      className={`relative p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${shapeClass} ${
        statusMeta.cardBg
      } ${statusMeta.cardBorder} ${
        isSelected ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950 scale-[1.02]" : ""
      } ${table.status === "BILL_OUT" ? "shadow-lg shadow-rose-950/40" : ""}`}
    >
      {/* Top Header: Table Number & Capacity */}
      <div>
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
              {table.tableNumber}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              {table.section}
            </span>
          </div>

          <div
            className={`text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded ${
              isOverCapacity
                ? "bg-rose-900/60 text-rose-300 font-bold"
                : "bg-slate-800/80 text-slate-300"
            }`}
            title={`Capacity: ${table.capacity} pax`}
          >
            <Users className="w-3 h-3 text-slate-400" />
            <span>
              {table.currentPax !== undefined ? `${table.currentPax}/${table.capacity}` : `${table.capacity}P`}
            </span>
          </div>
        </div>

        {/* Status Badge & Shape Tag */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <Badge variant={statusMeta.badgeVariant} className={table.status === "BILL_OUT" ? "animate-pulse" : ""}>
            {statusMeta.label}
          </Badge>
          <span className="text-[10px] text-slate-400 capitalize">
            {table.shape}
          </span>
        </div>
      </div>

      {/* Middle: Active Order Metrics & Timer */}
      <div className="my-2 py-2 border-t border-slate-800/80">
        {table.status !== "VACANT" ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Active Tab:</span>
              <span className="font-mono font-bold text-slate-100">
                {formatMYR(table.activeOrderTotal ?? 0)}
              </span>
            </div>

            {table.elapsedMinutes !== undefined && (
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Elapsed:
                </span>
                <span className="font-mono font-medium text-amber-300">
                  {table.elapsedMinutes}m
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-slate-500 italic">
            Table ready for seating
          </div>
        )}
      </div>

      {/* Bottom: Transition Action Triggers */}
      {nextActions.length > 0 && onTransitionStatus && (
        <div className="pt-2 border-t border-slate-800/70 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          {nextActions.map((action) => (
            <button
              key={action.targetStatus}
              onClick={() => {
                if (action.targetStatus === "SEATED" && table.status === "VACANT") {
                  onTransitionStatus(table.id, action.targetStatus, table.capacity);
                } else if (action.targetStatus === "ORDERED" && (table.status === "SEATED" || table.status === "ORDERED")) {
                  onTransitionStatus(table.id, action.targetStatus, table.currentPax, (table.activeOrderTotal ?? 0) + 45.0);
                } else {
                  onTransitionStatus(table.id, action.targetStatus);
                }
              }}
              className={`flex-1 text-[11px] font-semibold py-1 px-2 rounded-lg transition-colors shadow-sm text-center ${action.actionStyle}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
