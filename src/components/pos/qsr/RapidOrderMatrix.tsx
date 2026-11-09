"use client";

import * as React from "react";
import {
  Zap,
  Banknote,
  QrCode,
  Package,
  ShoppingBag,
  Trash2,
  CheckCircle2,
  Timer,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMYR } from "@/lib/utils";
import { calculateMalaysianTax } from "@/lib/tax/malaysia-tax";
import { ComboUpsellModal } from "./ComboUpsellModal";
import {
  RapidOrderMatrixProps,
  QsrOrderMode,
  QsrMenuItem,
  QsrCartItem,
  SelectedCombo,
  QueueToken,
  SAMPLE_QSR_MENU,
} from "./types";

const CATEGORIES = ["ALL", "Mains", "Breakfast", "Beverages", "Sides", "Desserts"];

export function RapidOrderMatrix({
  onOrderCompleted,
  onTokenGenerated,
  initialTokenNumber = 108,
}: RapidOrderMatrixProps) {
  // State
  const [selectedCategory, setSelectedCategory] = React.useState<string>("Mains");
  const [orderMode, setOrderMode] = React.useState<QsrOrderMode>("TAKEAWAY");
  const [cart, setCart] = React.useState<QsrCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "DUITNOW_QR">("DUITNOW_QR");
  const [tokenCounter, setTokenCounter] = React.useState<number>(initialTokenNumber);

  // Combo modal state
  const [upsellModalOpen, setUpsellModalOpen] = React.useState<boolean>(false);
  const [activeUpsellItem, setActiveUpsellItem] = React.useState<QsrMenuItem | null>(null);

  // Rapid Tap & 15s Performance Metrics
  const [tapCount, setTapCount] = React.useState<number>(0);
  const [stepSequence, setStepSequence] = React.useState<string[]>([]);
  const [flowStartTime, setFlowStartTime] = React.useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0);
  const [lastOrderStats, setLastOrderStats] = React.useState<{
    taps: number;
    duration: number;
    token: number;
  } | null>(null);

  // Timer loop for active transaction
  React.useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (flowStartTime && cart.length > 0) {
      timer = setInterval(() => {
        setElapsedSeconds(
          Math.round(((Date.now() - flowStartTime) / 1000) * 10) / 10
        );
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [flowStartTime, cart.length]);

  const recordTap = (stepName: string) => {
    setStepSequence((prev) => [...prev, stepName]);
    setTapCount((prev) => {
      const next = prev + 1;
      if (!flowStartTime) {
        setFlowStartTime(Date.now());
      }
      return next;
    });
  };

  // Switch category (Tap 1)
  const handleCategorySelect = (category: string) => {
    recordTap(`Category: ${category}`);
    setSelectedCategory(category);
  };

  // Item click (Tap 2)
  const handleItemSelect = (item: QsrMenuItem) => {
    recordTap(`Item: ${item.name}`);
    if (item.hasComboUpsell && item.comboDrinkOptions && item.comboDrinkOptions.length > 0) {
      setActiveUpsellItem(item);
      setUpsellModalOpen(true);
    } else {
      addDirectItemToCart(item);
    }
  };

  const addDirectItemToCart = (item: QsrMenuItem, combo?: SelectedCombo) => {
    const drinkDelta = combo?.drink?.priceDelta ?? 0;
    const sideDelta = combo?.side?.priceDelta ?? 0;
    const unitPrice = item.price + drinkDelta + sideDelta;

    const lineId = `${item.id}-${combo?.drink?.id || "none"}-${combo?.side?.id || "none"}`;

    setCart((prev) => {
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId
            ? {
                ...i,
                quantity: i.quantity + 1,
                lineTotal: (i.quantity + 1) * i.unitPrice,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          lineId,
          menuItem: item,
          quantity: 1,
          combo,
          unitPrice,
          lineTotal: unitPrice,
        },
      ];
    });
  };

  // Confirm combo from modal (Tap 3 & 4)
  const handleConfirmComboUpsell = (item: QsrMenuItem, combo?: SelectedCombo) => {
    recordTap("Confirm Combo");
    setUpsellModalOpen(false);
    setActiveUpsellItem(null);
    addDirectItemToCart(item, combo);
  };

  // Packaging Surcharge logic: RM0.50 for Takeaway, RM0.00 for Dine-in
  const packagingFee = orderMode === "TAKEAWAY" ? 0.5 : 0.0;

  // Calculate gross subtotal from cart
  const subtotal = cart.reduce((acc, curr) => acc + curr.lineTotal, 0);

  // SST and BNM 5-sen rounding calculation
  const taxBreakdown = calculateMalaysianTax({
    subtotal,
    outletType: "QSR",
    paymentMethod,
    takeawayPackagingFee: packagingFee,
  });

  // Switch payment method (Tap 5)
  const handleSelectPaymentMethod = (method: "CASH" | "DUITNOW_QR") => {
    recordTap(`Payment: ${method}`);
    setPaymentMethod(method);
  };

  // Settlement & Sequential Token Increment (Tap 6)
  const handleSettleOrder = () => {
    if (cart.length === 0) return;

    recordTap("Settle & Fast Pay");
    const currentToken = tokenCounter;
    const nextToken = currentToken >= 999 ? 101 : currentToken + 1;
    const duration = flowStartTime
      ? Math.round(((Date.now() - flowStartTime) / 1000) * 10) / 10
      : 0;

    const itemsSummary = cart
      .map(
        (c) =>
          `${c.quantity}x ${c.menuItem.name}${
            c.combo?.drink ? ` (+${c.combo.drink.name})` : ""
          }`
      )
      .join(", ");

    const newTokenRecord: QueueToken = {
      tokenNumber: currentToken,
      tokenDisplay: `#${currentToken}`,
      orderId: `ord-${Date.now()}`,
      orderMode,
      itemsSummary,
      totalPayable: taxBreakdown.finalPayableAmount,
      status: "PREPARING",
      createdAt: new Date().toISOString(),
    };

    onTokenGenerated?.(newTokenRecord);
    onOrderCompleted?.({
      tokenNumber: currentToken,
      cart,
      orderMode,
      paymentMethod,
      totalPayable: taxBreakdown.finalPayableAmount,
      tapCount: tapCount + 1,
      elapsedSeconds: duration,
    });

    setLastOrderStats({
      taps: tapCount + 1,
      duration,
      token: currentToken,
    });

    // Increment daily token counter
    setTokenCounter(nextToken);

    // Reset order cart & tap counter for next customer
    setCart([]);
    setTapCount(0);
    setStepSequence([]);
    setFlowStartTime(null);
    setElapsedSeconds(0);
  };

  const clearCart = () => {
    setCart([]);
    setTapCount(0);
    setStepSequence([]);
    setFlowStartTime(null);
    setElapsedSeconds(0);
  };

  const filteredMenuItems = SAMPLE_QSR_MENU.filter(
    (item) => selectedCategory === "ALL" || item.category === selectedCategory
  );

  return (
    <Card className="border-slate-800 bg-slate-900/60 shadow-2xl">
      {/* Header Bar */}
      <CardHeader className="border-b border-slate-800/80 pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-base sm:text-lg font-black text-white tracking-tight">
                QSR Rapid Tap Cashier Ordering Matrix
              </CardTitle>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-throughput cashier flow (&lt;15s, ≤6 taps) • 0% Service Charge + 6% SST
            </p>
          </div>

          {/* Sequential Token Badge & Live Performance Metrics */}
          <div className="flex items-center gap-2">
            {/* Live Tap & Timer Tracker */}
            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Flow Taps</span>
                <span
                  className={`text-xs font-mono font-bold ${
                    tapCount <= 6 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {tapCount}/6 taps
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Elapsed</span>
                <span
                  className={`text-xs font-mono font-bold flex items-center gap-1 ${
                    elapsedSeconds < 15 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  {elapsedSeconds.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Daily Sequential Token Number */}
            <div className="bg-emerald-950/80 border border-emerald-700/60 px-3.5 py-1 rounded-xl text-right shadow-inner">
              <span className="text-[10px] text-emerald-400 block font-semibold uppercase tracking-wider">
                Daily Token
              </span>
              <span className="text-xl font-black text-white font-mono tracking-wider">
                #{tokenCounter}
              </span>
            </div>
          </div>
        </div>

        {/* Last Completed Order Notice */}
        {lastOrderStats && (
          <div className="mt-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Order <strong>#{lastOrderStats.token}</strong> settled in{" "}
              <strong>{lastOrderStats.taps} taps</strong> ({lastOrderStats.duration}s)
            </span>
            <Badge variant="success" className="text-[10px]">
              {lastOrderStats.taps <= 6 && lastOrderStats.duration < 15
                ? "Optimal Throughput (<15s)"
                : "Standard Throughput"}
            </Badge>
          </div>
        )}

        {/* Live Tap Breadcrumbs */}
        {stepSequence.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto text-[10px] text-slate-400">
            <span className="font-semibold text-slate-300">Tap Flow:</span>
            {stepSequence.map((step, idx) => (
              <span key={idx} className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {idx + 1}. {step}
                </span>
                {idx < stepSequence.length - 1 && <span className="text-slate-600">→</span>}
              </span>
            ))}
          </div>
        )}

        {/* Order Mode Switcher (Takeaway RM0.50 toggle) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                recordTap("Mode: Dine-In");
                setOrderMode("DINE_IN");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                orderMode === "DINE_IN"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Dine-In (RM0.00 fee)
            </button>
            <button
              onClick={() => {
                recordTap("Mode: Takeaway");
                setOrderMode("TAKEAWAY");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                orderMode === "TAKEAWAY"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Takeaway (+RM0.50 fee)
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? "bg-slate-800 text-emerald-400 border border-emerald-500/50 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-950"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Rapid Tap Menu Grid (2/3 width) */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemSelect(item)}
                  className="min-h-[96px] p-3 rounded-2xl border border-slate-800 bg-slate-950/80 hover:border-emerald-500/80 hover:bg-slate-900 transition-all text-left flex flex-col justify-between group shadow-sm active:scale-95"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-300 leading-snug line-clamp-2">
                        {item.name}
                      </span>
                      {item.hasComboUpsell && (
                        <span className="p-0.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0" title="Combo Available">
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    {item.nameMalay && (
                      <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {item.nameMalay}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold text-emerald-400">
                      {formatMYR(item.price)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Settlement Summary & Actions (1/3 width) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between shadow-xl">
            <div>
              {/* Order Cart Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">
                  Current Order ({cart.reduce((a, b) => a + b.quantity, 0)} items)
                </span>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              {/* Cart List */}
              <div className="my-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    <p>Tap any item to start order.</p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      Target: 6 taps to fast settlement
                    </p>
                  </div>
                ) : (
                  cart.map((cartItem) => (
                    <div
                      key={cartItem.lineId}
                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="font-semibold text-slate-200">
                            {cartItem.quantity}x {cartItem.menuItem.name}
                          </span>
                          {cartItem.combo?.drink && (
                            <span className="block text-[10px] text-emerald-400">
                              + {cartItem.combo.drink.name}
                            </span>
                          )}
                          {cartItem.combo?.side && (
                            <span className="block text-[10px] text-amber-400">
                              + {cartItem.combo.side.name}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-slate-100">
                          {formatMYR(cartItem.lineTotal)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Statutory Tax Breakdown */}
              <div className="border-t border-slate-800/80 pt-2.5 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-200">
                    {formatMYR(taxBreakdown.discountedSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>SST (6%)</span>
                  <span className="font-mono text-slate-200">
                    {formatMYR(taxBreakdown.sstAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Packaging Surcharge ({orderMode})</span>
                  <span className="font-mono text-slate-200">
                    {formatMYR(taxBreakdown.packagingFee)}
                  </span>
                </div>
                {paymentMethod === "CASH" && (
                  <div className="flex justify-between text-amber-400">
                    <span>BNM 5-Sen Rounding</span>
                    <span className="font-mono">
                      {taxBreakdown.cashRoundingVariance >= 0 ? "+" : ""}
                      {formatMYR(taxBreakdown.cashRoundingVariance)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Settlement Bottom Section */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-200">Total Payable:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {formatMYR(taxBreakdown.finalPayableAmount)}
                </span>
              </div>

              {/* Payment Method Switcher (Tap 5) */}
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethod("DUITNOW_QR")}
                  className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold border transition ${
                    paymentMethod === "DUITNOW_QR"
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  DuitNow QR
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMethod("CASH")}
                  className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold border transition ${
                    paymentMethod === "CASH"
                      ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/40"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Cash (Rounded)
                </button>
              </div>

              {/* Settle & Fire Button (Tap 6) */}
              <Button
                size="lg"
                disabled={cart.length === 0}
                onClick={handleSettleOrder}
                className="w-full text-xs font-extrabold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white h-12 shadow-xl shadow-emerald-950/50 disabled:opacity-40"
              >
                Fast Pay & Fire Token #{tokenCounter}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Combo Upsell Modal (Taps 3 & 4) */}
      <ComboUpsellModal
        isOpen={upsellModalOpen}
        item={activeUpsellItem}
        onConfirm={handleConfirmComboUpsell}
        onCancel={() => {
          setUpsellModalOpen(false);
          setActiveUpsellItem(null);
        }}
      />
    </Card>
  );
}
