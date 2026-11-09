import { TaxCalculationInput, TaxCalculationBreakdown } from "./types";
import { applyPaymentRounding, roundToTwoDecimals } from "./bnm-rounding";

/**
 * Standard Malaysian statutory tax rates (SSOT Section 3.2).
 */
export const DEFAULT_SST_RATE = 0.06; // 6% Sales & Service Tax
export const DEFAULT_FSR_SERVICE_CHARGE_RATE = 0.10; // 10% Service Charge for FSR
export const DEFAULT_QSR_SERVICE_CHARGE_RATE = 0.00; // 0% Service Charge for QSR

/**
 * Pure TypeScript SST and Service Charge calculation engine.
 *
 * Implements statutory Malaysian F&B tax rules:
 * - FSR (Full-Service Restaurant):
 *   Cascading tax formula:
 *     Service Charge = Discounted Subtotal * 10%
 *     Taxable Base = Discounted Subtotal + Service Charge
 *     Service Tax (SST) = Taxable Base * 6%
 *     Gross Total = Taxable Base + Service Tax
 *
 * - QSR (Quick-Service Kiosk):
 *   Flat tax formula with packaging fee:
 *     Taxable Base = Discounted Subtotal
 *     Service Tax (SST) = Taxable Base * 6%
 *     Gross Total = Taxable Base + Service Tax + Packaging Fee
 *
 * - BNM 5-sen cash rounding:
 *   Applied strictly to CASH payments, preserving exact sen for cashless channels.
 */
export function calculateSstAndServiceCharge(
  input: TaxCalculationInput
): TaxCalculationBreakdown {
  const {
    subtotal,
    discountAmount = 0,
    outletType,
    serviceChargeRate,
    sstRate = DEFAULT_SST_RATE,
    takeawayPackagingFee = 0,
    paymentMethod,
  } = input;

  // 1. Sanitize and clamp subtotal & discount
  const validSubtotal = Math.max(0, roundToTwoDecimals(subtotal));
  const validDiscount = Math.min(
    validSubtotal,
    Math.max(0, roundToTwoDecimals(discountAmount))
  );
  const discountedSubtotal = roundToTwoDecimals(validSubtotal - validDiscount);

  // 2. Service Charge calculation
  // FSR defaults to 10%, QSR defaults to 0%
  const effectiveScRate =
    outletType === "FSR"
      ? serviceChargeRate !== undefined
        ? Math.max(0, serviceChargeRate)
        : DEFAULT_FSR_SERVICE_CHARGE_RATE
      : DEFAULT_QSR_SERVICE_CHARGE_RATE;

  const serviceChargeAmount =
    effectiveScRate > 0
      ? roundToTwoDecimals(discountedSubtotal * effectiveScRate)
      : 0.0;

  // 3. Taxable Base
  // In FSR, SST compounds on top of (Discounted Subtotal + Service Charge)
  // In QSR, SST applies directly to Discounted Subtotal
  const taxableBase = roundToTwoDecimals(discountedSubtotal + serviceChargeAmount);

  // 4. SST (6%)
  const effectiveSstRate = Math.max(0, sstRate);
  const sstAmount =
    taxableBase > 0 && effectiveSstRate > 0
      ? roundToTwoDecimals(taxableBase * effectiveSstRate)
      : 0.0;

  // 5. Packaging Fee (QSR takeaways)
  const packagingFee =
    outletType === "QSR"
      ? Math.max(0, roundToTwoDecimals(takeawayPackagingFee))
      : 0.0;

  // 6. Gross total before rounding
  const grossPayableAmount = roundToTwoDecimals(
    taxableBase + sstAmount + packagingFee
  );

  // 7. Apply BNM 5-sen cash rounding if CASH payment
  const rounding = applyPaymentRounding(grossPayableAmount, paymentMethod);
  const finalPayableAmount = rounding.roundedAmount;
  const cashRoundingVariance = rounding.variance;

  return {
    grossSubtotal: validSubtotal,
    discountAmount: validDiscount,
    discountedSubtotal,
    serviceChargeRate: effectiveScRate,
    serviceChargeAmount,
    taxableBase,
    sstRate: effectiveSstRate,
    sstAmount,
    packagingFee,
    grossPayableAmount,
    cashRoundingVariance,
    finalPayableAmount,
    currency: "MYR",
  };
}

/**
 * Drop-in backwards-compatible alias for calculateSstAndServiceCharge.
 */
export const calculateMalaysianTax = calculateSstAndServiceCharge;

/**
 * Convenience helper to calculate tax on a single item.
 */
export function calculateItemTax(
  unitPrice: number,
  quantity: number,
  sstRate = DEFAULT_SST_RATE
): {
  lineSubtotal: number;
  sstAmount: number;
  lineTotal: number;
} {
  const lineSubtotal = roundToTwoDecimals(Math.max(0, unitPrice) * Math.max(0, quantity));
  const sstAmount = roundToTwoDecimals(lineSubtotal * Math.max(0, sstRate));
  const lineTotal = roundToTwoDecimals(lineSubtotal + sstAmount);
  return { lineSubtotal, sstAmount, lineTotal };
}
