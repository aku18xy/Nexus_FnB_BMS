"use client";

import * as React from "react";
import { Zap, CreditCard, Banknote, QrCode } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculateMalaysianTax } from "@/lib/tax/malaysia-tax";
import { formatMYR } from "@/lib/utils";

interface QuickItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

const SAMPLE_ITEMS: QuickItem[] = [
  { id: "1", name: "Nasi Lemak Sambal Sotong", price: 14.9, category: "Mains" },
  { id: "2", name: "Char Kway Teow (Special)", price: 13.5, category: "Mains" },
  { id: "3", name: "Roti Canai (2 pcs) + Dhal", price: 4.8, category: "Breakfast" },
  { id: "4", name: "Teh Tarik Kaw", price: 3.8, category: "Beverages" },
  { id: "5", name: "Kopi O Ping", price: 3.5, category: "Beverages" },
  { id: "6", name: "Cendol Durian D24", price: 9.9, category: "Desserts" },
];

export function QsrQuickOrder() {
  const [cart, setCart] = React.useState<Array<{ item: QuickItem; qty: number }>>([
    { item: SAMPLE_ITEMS[0], qty: 1 },
    { item: SAMPLE_ITEMS[3], qty: 1 },
  ]);
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "DUITNOW_QR">("DUITNOW_QR");
  const [tokenCounter, setTokenCounter] = React.useState<number>(108);

  const subtotal = cart.reduce((acc, curr) => acc + curr.item.price * curr.qty, 0);

  const taxBreakdown = calculateMalaysianTax({
    subtotal,
    outletType: "QSR",
    paymentMethod,
    takeawayPackagingFee: 0.5, // 50 sen packaging fee for QSR takeaway
  });

  const addToCart = (item: QuickItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const clearCart = () => setCart([]);

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-emerald-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Quick-Service Kiosk (QSR Counter)
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              High-throughput counter ordering (&lt;15s) with auto sequential token
            </p>
          </div>
          <div className="bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-lg text-right">
            <span className="text-[10px] text-emerald-400 block uppercase tracking-wider">
              Calling Token
            </span>
            <span className="text-lg font-black text-white font-mono">
              #{tokenCounter}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Item Quick Tap Grid */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {SAMPLE_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="p-3 rounded-lg border border-slate-800 bg-slate-900/90 hover:border-emerald-600 hover:bg-slate-800/80 transition text-left flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-medium text-white block line-clamp-2">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.category}</span>
                </div>
                <div className="mt-2 text-xs font-mono font-bold text-emerald-400">
                  {formatMYR(item.price)}
                </div>
              </button>
            ))}
          </div>

          {/* Quick Settlement Summary */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">Current Order ({cart.length})</span>
                <button
                  onClick={clearCart}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Clear
                </button>
              </div>

              <div className="my-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Cart is empty</p>
                ) : (
                  cart.map(({ item, qty }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs text-slate-300"
                    >
                      <span className="truncate max-w-[140px]">
                        {qty}x {item.name}
                      </span>
                      <span className="font-mono">{formatMYR(item.price * qty)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Tax & Rounding Breakdown */}
              <div className="border-t border-slate-800/80 pt-2 space-y-1 text-[11px] text-slate-400">
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
                  <span>Packaging Fee</span>
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

            <div className="mt-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-100">Payable:</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  {formatMYR(taxBreakdown.finalPayableAmount)}
                </span>
              </div>

              {/* Payment Method Switcher */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button
                  onClick={() => setPaymentMethod("DUITNOW_QR")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border ${
                    paymentMethod === "DUITNOW_QR"
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  DuitNow QR
                </button>
                <button
                  onClick={() => setPaymentMethod("CASH")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border ${
                    paymentMethod === "CASH"
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Cash (Rounded)
                </button>
              </div>

              <Button
                size="sm"
                className="w-full text-xs font-bold"
                onClick={() => setTokenCounter((c) => c + 1)}
              >
                Fast Pay & Fire Ticket
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
