"use client";

import * as React from "react";
import { Volume2, VolumeX, Bell, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QueueToken, TokenCallingScreenProps, TokenStatus } from "./types";
import { INITIAL_QUEUE_TOKENS } from "./types";

export function TokenCallingScreen({
  tokens = INITIAL_QUEUE_TOKENS,
  onBumpStatus,
}: TokenCallingScreenProps) {
  const [tokenList, setTokenList] = React.useState<QueueToken[]>(tokens);
  const [audioChimeEnabled, setAudioChimeEnabled] = React.useState<boolean>(true);
  const [lastChimedToken, setLastChimedToken] = React.useState<number | null>(null);

  React.useEffect(() => {
    setTokenList(tokens);
  }, [tokens]);

  const handleBump = (tokenNumber: number, nextStatus: TokenStatus) => {
    setTokenList((prev) =>
      prev.map((tok) => {
        if (tok.tokenNumber === tokenNumber) {
          const updated = {
            ...tok,
            status: nextStatus,
            calledAt: nextStatus === "CALLING" ? new Date().toISOString() : tok.calledAt,
            collectedAt: nextStatus === "COLLECTED" ? new Date().toISOString() : tok.collectedAt,
          };
          if (nextStatus === "CALLING" && audioChimeEnabled) {
            setLastChimedToken(tokenNumber);
            // Simulated chime tone using Web Audio API if available
            try {
              if (typeof window !== "undefined" && window.AudioContext) {
                const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = "sine";
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
                osc.start();
                osc.stop(ctx.currentTime + 0.6);
              }
            } catch {
              // Ignore audio context autoplay limitations safely
            }
          }
          return updated;
        }
        return tok;
      })
    );
    onBumpStatus?.(tokenNumber, nextStatus);
  };

  const preparingTokens = tokenList.filter((t) => t.status === "PREPARING");
  const callingTokens = tokenList.filter((t) => t.status === "CALLING");
  const recentCollected = tokenList.filter((t) => t.status === "COLLECTED").slice(-3);

  return (
    <Card className="border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
      {/* Header Bar */}
      <CardHeader className="bg-slate-900/90 border-b border-slate-800 py-3.5 px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bell className="w-5 h-5 animate-bounce" />
            </span>
            <div>
              <CardTitle className="text-lg font-black text-white tracking-wide uppercase">
                Order Status & Queue Calling Screen
              </CardTitle>
              <p className="text-xs text-slate-400">
                Nexus QSR Live Kitchen Bump & Customer Collection Display
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioChimeEnabled(!audioChimeEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                audioChimeEnabled
                  ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
            >
              {audioChimeEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Chime Active
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  Chime Muted
                </>
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Preparing */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider">
                  Preparing in Kitchen ({preparingTokens.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Please wait</span>
            </div>

            {preparingTokens.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                All queued kitchen orders have been prepared.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {preparingTokens.map((tok) => (
                  <div
                    key={tok.tokenNumber}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-amber-700/60 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                          {tok.tokenDisplay}
                        </span>
                        <Badge
                          variant={tok.orderMode === "TAKEAWAY" ? "warning" : "default"}
                          className="text-[10px]"
                        >
                          {tok.orderMode}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-1 max-w-[200px]">
                        {tok.itemsSummary}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleBump(tok.tokenNumber, "CALLING")}
                      className="text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shrink-0"
                    >
                      Ready / Call
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Now Calling / Ready for Collection */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/20 p-4 shadow-xl shadow-emerald-950/30">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-800/40">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
                  Ready for Collection ({callingTokens.length})
                </h3>
              </div>
              <span className="text-[11px] text-emerald-300 font-semibold">Please Collect at Counter</span>
            </div>

            {callingTokens.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No orders waiting for collection.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {callingTokens.map((tok) => {
                  const isRecentChime = lastChimedToken === tok.tokenNumber;
                  return (
                    <div
                      key={tok.tokenNumber}
                      className={`p-3.5 rounded-xl border-2 transition flex items-center justify-between ${
                        isRecentChime
                          ? "border-emerald-400 bg-emerald-900/40 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                          : "border-emerald-700/60 bg-slate-950/90"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-black font-mono text-white tracking-widest animate-pulse">
                            {tok.tokenDisplay}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500 text-slate-950">
                            READY
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 mt-1 line-clamp-1 max-w-[200px]">
                          {tok.itemsSummary}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleBump(tok.tokenNumber, "COLLECTED")}
                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Handed Over
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recently Collected History */}
        {recentCollected.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px]">Recently Collected:</span>
            <div className="flex gap-2">
              {recentCollected.map((c) => (
                <span key={c.tokenNumber} className="font-mono text-slate-500 line-through">
                  {c.tokenDisplay}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
