"use client";

import * as React from "react";
import { Coffee, Utensils, Check, X, Sparkles } from "lucide-react";
import { formatMYR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ComboUpsellModalProps,
  ComboModifierItem,
  SelectedCombo,
} from "./types";

export function ComboUpsellModal({
  isOpen,
  item,
  onConfirm,
  onCancel,
}: ComboUpsellModalProps) {
  const [selectedDrink, setSelectedDrink] = React.useState<ComboModifierItem | undefined>(undefined);
  const [selectedSide, setSelectedSide] = React.useState<ComboModifierItem | undefined>(undefined);

  // Reset selection when opened for a new item
  React.useEffect(() => {
    if (isOpen && item) {
      // Default to first drink if available for ultra-fast 1-tap combo confirm
      if (item.comboDrinkOptions && item.comboDrinkOptions.length > 0) {
        setSelectedDrink(item.comboDrinkOptions[0]);
      } else {
        setSelectedDrink(undefined);
      }
      setSelectedSide(undefined);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const drinkDelta = selectedDrink?.priceDelta ?? 0;
  const sideDelta = selectedSide?.priceDelta ?? 0;
  const comboPrice = item.price + drinkDelta + sideDelta;

  const handleSelectDrink = (drink: ComboModifierItem) => {
    setSelectedDrink((prev) => (prev?.id === drink.id ? undefined : drink));
  };

  const handleSelectSide = (side: ComboModifierItem) => {
    setSelectedSide((prev) => (prev?.id === side.id ? undefined : side));
  };

  const handleConfirmCombo = () => {
    const combo: SelectedCombo = {
      drink: selectedDrink,
      side: selectedSide,
    };
    onConfirm(item, combo);
  };

  const handleAddAsIs = () => {
    onConfirm(item, undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Combo Upsell: {item.name}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Base Price: <span className="font-mono text-emerald-400 font-bold">{formatMYR(item.price)}</span>
              {item.nameMalay && <span className="ml-2 text-slate-500">({item.nameMalay})</span>}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Step A: One-Touch Drink Selection */}
          {item.comboDrinkOptions && item.comboDrinkOptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                  1. Choose Combo Drink
                </span>
                {selectedDrink && (
                  <Badge variant="success" className="text-[10px]">
                    +{formatMYR(selectedDrink.priceDelta)}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {item.comboDrinkOptions.map((drink) => {
                  const isSelected = selectedDrink?.id === drink.id;
                  return (
                    <button
                      type="button"
                      key={drink.id}
                      onClick={() => handleSelectDrink(drink)}
                      className={`min-h-[50px] p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? "bg-emerald-950/60 border-emerald-500 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-semibold leading-tight line-clamp-2">
                          {drink.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold mt-1">
                        +{formatMYR(drink.priceDelta)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step B: One-Touch Side Selection */}
          {item.comboSideOptions && item.comboSideOptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Utensils className="w-3.5 h-3.5 text-amber-400" />
                  2. Optional Side Add-On
                </span>
                {selectedSide && (
                  <Badge variant="warning" className="text-[10px]">
                    +{formatMYR(selectedSide.priceDelta)}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {item.comboSideOptions.map((side) => {
                  const isSelected = selectedSide?.id === side.id;
                  return (
                    <button
                      type="button"
                      key={side.id}
                      onClick={() => handleSelectSide(side)}
                      className={`min-h-[50px] p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? "bg-amber-950/50 border-amber-500 text-white shadow-md shadow-amber-950/40 ring-1 ring-amber-500"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-semibold leading-tight">
                          {side.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[11px] font-mono text-amber-400 font-bold mt-1">
                        +{formatMYR(side.priceDelta)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Settlement & Rapid Action Buttons */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">Total with Modifiers:</span>
            <div className="text-right">
              <span className="text-lg font-black text-white font-mono">
                {formatMYR(comboPrice)}
              </span>
              {(drinkDelta > 0 || sideDelta > 0) && (
                <span className="text-[10px] text-emerald-400 block">
                  (Includes {formatMYR(drinkDelta + sideDelta)} combo savings)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAsIs}
              className="text-xs font-semibold border-slate-700 hover:bg-slate-800 text-slate-300 h-11"
            >
              Add Item As-Is
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCombo}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white h-11 shadow-lg shadow-emerald-950/40"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Confirm Combo & Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
