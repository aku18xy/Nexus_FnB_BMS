/**
 * Backwards compatibility layer for Malaysian Tax and BNM Cash Rounding.
 * Delegates to modular implementations in sst-calculator.ts and bnm-rounding.ts.
 */

export * from "./bnm-rounding";
export * from "./sst-calculator";
export * from "./types";
