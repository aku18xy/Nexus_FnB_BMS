"use client";

import * as React from "react";
import { Users, Clock, Coffee, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TableState {
  id: string;
  number: string;
  section: "Indoor" | "Outdoor" | "VIP";
  paxCapacity: number;
  currentPax?: number;
  status: "AVAILABLE" | "SEATED" | "BILL_REQUESTED" | "DIRTY";
  activeOrderTotal?: number;
  elapsedMinutes?: number;
}

const INITIAL_TABLES: TableState[] = [
  { id: "t1", number: "T-01", section: "Indoor", paxCapacity: 2, status: "AVAILABLE" },
  { id: "t2", number: "T-02", section: "Indoor", paxCapacity: 4, currentPax: 3, status: "SEATED", activeOrderTotal: 84.5, elapsedMinutes: 24 },
  { id: "t3", number: "T-03", section: "Indoor", paxCapacity: 4, currentPax: 4, status: "BILL_REQUESTED", activeOrderTotal: 142.0, elapsedMinutes: 52 },
  { id: "t4", number: "T-04", section: "Indoor", paxCapacity: 6, status: "DIRTY" },
  { id: "t5", number: "OUT-01", section: "Outdoor", paxCapacity: 4, currentPax: 2, status: "SEATED", activeOrderTotal: 46.2, elapsedMinutes: 12 },
  { id: "t6", number: "VIP-1", section: "VIP", paxCapacity: 10, status: "AVAILABLE" },
];

export function FsrTableGrid() {
  const [selectedSection, setSelectedSection] = React.useState<string>("ALL");

  const filteredTables = INITIAL_TABLES.filter(
    (t) => selectedSection === "ALL" || t.section === selectedSection
  );

  const getStatusBadge = (status: TableState["status"]) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge variant="success">Available</Badge>;
      case "SEATED":
        return <Badge variant="warning">Seated</Badge>;
      case "BILL_REQUESTED":
        return <Badge variant="danger">Bill Requested</Badge>;
      case "DIRTY":
        return <Badge variant="outline">Clearing</Badge>;
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-emerald-400 flex items-center gap-2">
              <span>🍽️</span> Full-Service Dining Floor Map (FSR)
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Visual table status with 10% Service Charge & cascading 6% SST
            </p>
          </div>
          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {["ALL", "Indoor", "Outdoor", "VIP"].map((section) => (
              <button
                key={section}
                onClick={() => setSelectedSection(section)}
                className={`px-2.5 py-1 rounded-md transition ${
                  selectedSection === section
                    ? "bg-emerald-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {section}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className={`p-3.5 rounded-xl border transition cursor-pointer ${
                table.status === "SEATED"
                  ? "bg-amber-950/20 border-amber-800/40 hover:border-amber-700"
                  : table.status === "BILL_REQUESTED"
                  ? "bg-rose-950/20 border-rose-800/40 hover:border-rose-700 animate-pulse"
                  : table.status === "AVAILABLE"
                  ? "bg-slate-900/90 border-slate-800 hover:border-emerald-600"
                  : "bg-slate-950/60 border-slate-800/50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{table.number}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {table.currentPax ? `${table.currentPax}/${table.paxCapacity}` : table.paxCapacity}
                </span>
              </div>

              <div className="mt-2.5">{getStatusBadge(table.status)}</div>

              {table.activeOrderTotal !== undefined && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">RM {table.activeOrderTotal.toFixed(2)}</span>
                  {table.elapsedMinutes && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {table.elapsedMinutes}m
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
