"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Save,
  Move,
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DiningTableLayout,
  TableSection,
  TableShape,
  FloorPlanDesignerProps,
} from "./types";
import { INITIAL_FSR_TABLES } from "./state";

const SECTIONS: TableSection[] = ["Indoor", "Outdoor", "VIP", "Bar"];
const SHAPES: Array<{ id: TableShape; label: string; desc: string }> = [
  { id: "square", label: "Square (2-4p)", desc: "Standard 2-4 top square table" },
  { id: "round", label: "Round (4-8p)", desc: "Circular table for groups" },
  { id: "long", label: "Long (6-20p)", desc: "Extended banquette or banquet table" },
];

export function FloorPlanDesigner({
  initialTables = INITIAL_FSR_TABLES,
  onSaveLayout,
  activeSection: propSection,
}: FloorPlanDesignerProps) {
  const [tables, setTables] = React.useState<DiningTableLayout[]>(initialTables);
  const [selectedSection, setSelectedSection] = React.useState<TableSection>(
    propSection || "Indoor"
  );
  const [selectedTableId, setSelectedTableId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Form state for creating / editing table
  const [editNumber, setEditNumber] = React.useState<string>("");
  const [editSection, setEditSection] = React.useState<TableSection>("Indoor");
  const [editShape, setEditShape] = React.useState<TableShape>("square");
  const [editCapacity, setEditCapacity] = React.useState<number>(4);
  const [editX, setEditX] = React.useState<number>(50);
  const [editY, setEditY] = React.useState<number>(50);

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  // Populate form when a table is selected
  React.useEffect(() => {
    if (selectedTable) {
      setEditNumber(selectedTable.tableNumber);
      setEditSection(selectedTable.section);
      setEditShape(selectedTable.shape);
      setEditCapacity(selectedTable.capacity);
      setEditX(selectedTable.position.x);
      setEditY(selectedTable.position.y);
      setErrorMessage(null);
    }
  }, [selectedTableId, selectedTable]);

  const clearForm = () => {
    setSelectedTableId(null);
    setEditNumber("");
    setEditSection(selectedSection);
    setEditShape("square");
    setEditCapacity(4);
    setEditX(60);
    setEditY(60);
    setErrorMessage(null);
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = editNumber.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage("Table number is required (e.g. T-10 or VIP-2).");
      return;
    }

    if (tables.some((t) => t.tableNumber.toUpperCase() === trimmed)) {
      setErrorMessage(`Table number "${trimmed}" already exists.`);
      return;
    }

    if (editCapacity < 1 || editCapacity > 20) {
      setErrorMessage("Capacity must be between 1 and 20 pax.");
      return;
    }

    const newTable: DiningTableLayout = {
      id: `tbl-${Date.now()}`,
      tableNumber: trimmed,
      section: editSection,
      shape: editShape,
      capacity: editCapacity,
      status: "VACANT",
      position: { x: editX, y: editY },
      dimensions: {
        width: editShape === "long" ? 180 : editShape === "round" ? 100 : 90,
        height: editShape === "long" ? 100 : editShape === "round" ? 100 : 90,
      },
    };

    const updated = [...tables, newTable];
    setTables(updated);
    setSelectedTableId(newTable.id);
    setSuccessMessage(`Table ${trimmed} created successfully.`);
  };

  const handleUpdateTable = () => {
    if (!selectedTableId) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = editNumber.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage("Table number is required.");
      return;
    }

    if (
      tables.some(
        (t) => t.id !== selectedTableId && t.tableNumber.toUpperCase() === trimmed
      )
    ) {
      setErrorMessage(`Table number "${trimmed}" is already used by another table.`);
      return;
    }

    if (editCapacity < 1 || editCapacity > 20) {
      setErrorMessage("Capacity must be between 1 and 20 pax.");
      return;
    }

    const updated = tables.map((t) => {
      if (t.id === selectedTableId) {
        return {
          ...t,
          tableNumber: trimmed,
          section: editSection,
          shape: editShape,
          capacity: editCapacity,
          position: { x: editX, y: editY },
          dimensions: {
            width: editShape === "long" ? 180 : editShape === "round" ? 100 : 90,
            height: editShape === "long" ? 100 : editShape === "round" ? 100 : 90,
          },
        };
      }
      return t;
    });

    setTables(updated);
    setSuccessMessage(`Table ${trimmed} updated.`);
  };

  const handleDeleteTable = (id: string) => {
    const tableToDelete = tables.find((t) => t.id === id);
    if (!tableToDelete) return;

    if (tableToDelete.status !== "VACANT") {
      setErrorMessage(
        `Cannot delete table ${tableToDelete.tableNumber} while it is in ${tableToDelete.status} status. Clear table first.`
      );
      return;
    }

    const updated = tables.filter((t) => t.id !== id);
    setTables(updated);
    if (selectedTableId === id) {
      clearForm();
    }
    setSuccessMessage(`Table ${tableToDelete.tableNumber} removed.`);
  };

  const handleSaveAll = () => {
    onSaveLayout?.(tables);
    setSuccessMessage("Floor plan layout saved successfully.");
  };

  const sectionTables = tables.filter((t) => t.section === selectedSection);

  return (
    <Card className="border-slate-800 bg-slate-900/60 shadow-2xl">
      <CardHeader className="border-b border-slate-800/80 pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Interactive Floor Plan & Table Layout Designer
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure room zones, table shapes (round, square, long), capacities (1–20), and coordinates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={clearForm}
              className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              New Table
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAll}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save Layout
            </Button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1.5 pt-3">
          {SECTIONS.map((sec) => (
            <button
              key={sec}
              onClick={() => {
                setSelectedSection(sec);
                setEditSection(sec);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedSection === sec
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {sec} ({tables.filter((t) => t.section === sec).length})
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Messages */}
        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Floor Canvas (2/3 width on desktop) */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-emerald-400" />
                {selectedSection} Floor View (Click table to edit)
              </span>
              <span className="text-[11px] text-slate-400">
                Grid: 500x320 px
              </span>
            </div>

            <div className="relative w-full h-[360px] rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden shadow-inner p-3">
              {/* Subtle background grid pattern */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(#334155 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              {sectionTables.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <p className="text-xs">No tables placed in {selectedSection} zone.</p>
                  <p className="text-[11px] mt-1 text-slate-600">
                    Use the panel on the right to configure and add tables.
                  </p>
                </div>
              ) : (
                sectionTables.map((table) => {
                  const isSelected = selectedTableId === table.id;
                  const isRound = table.shape === "round";
                  const isLong = table.shape === "long";

                  return (
                    <div
                      key={table.id}
                      onClick={() => setSelectedTableId(table.id)}
                      style={{
                        left: `${Math.min(table.position.x, 380)}px`,
                        top: `${Math.min(table.position.y, 220)}px`,
                        width: isLong ? "160px" : isRound ? "96px" : "90px",
                        height: isLong ? "80px" : isRound ? "96px" : "90px",
                      }}
                      className={`absolute cursor-pointer transition-all duration-150 flex flex-col items-center justify-center p-2 border-2 ${
                        isRound ? "rounded-full" : isLong ? "rounded-2xl" : "rounded-xl"
                      } ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-950/60 shadow-lg shadow-emerald-950/50 scale-105 z-20"
                          : "border-slate-700 bg-slate-900/90 hover:border-slate-500 z-10"
                      }`}
                    >
                      <span className="font-extrabold text-xs text-white">
                        {table.tableNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                        <Users className="w-2.5 h-2.5" />
                        {table.capacity}P
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400/90 font-mono mt-0.5">
                        {table.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Table Configuration & Placement Panel (1/3 width) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">
                  {selectedTableId ? `Edit Table: ${selectedTable?.tableNumber}` : "Add New Dining Table"}
                </span>
                {selectedTableId && (
                  <button
                    onClick={clearForm}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="space-y-3.5 mt-3">
                {/* Table Number */}
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Table Identifier (e.g. T-07, VIP-2)
                  </label>
                  <input
                    type="text"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    placeholder="T-01"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Section / Zone */}
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Zone / Section
                  </label>
                  <select
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value as TableSection)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shape Selection */}
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Table Geometry / Shape
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHAPES.map((sh) => (
                      <button
                        type="button"
                        key={sh.id}
                        onClick={() => setEditShape(sh.id)}
                        className={`p-2 rounded-lg text-center border text-[11px] font-semibold capitalize transition ${
                          editShape === sh.id
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        {sh.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Capacity (1-20) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      Seating Capacity (Pax)
                    </label>
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {editCapacity} Guests
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Position Coordinates X / Y */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">X Coordinate (px)</label>
                    <input
                      type="number"
                      min={0}
                      max={400}
                      value={editX}
                      onChange={(e) => setEditX(Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Y Coordinate (px)</label>
                    <input
                      type="number"
                      min={0}
                      max={250}
                      value={editY}
                      onChange={(e) => setEditY(Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              {selectedTableId ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleUpdateTable}
                    className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Update Table #{editNumber}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTable(selectedTableId)}
                    className="w-full text-xs text-rose-400 border-rose-900/60 hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete Table
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleAddTable}
                  className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Place Table on Floor
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
