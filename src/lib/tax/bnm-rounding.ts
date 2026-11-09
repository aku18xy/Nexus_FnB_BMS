import { BnmRoundingResult, PaymentMethod } from "./types";

/**
 * Checks whether the given payment method requires BNM cash rounding.
 * According to Bank Negara Malaysia regulations, 5-sen rounding applies
 * strictly to physical CASH transactions.
 */
export function isCashPayment(paymentMethod: PaymentMethod | string): boolean {
  return typeof paymentMethod === "string" && paymentMethod.toUpperCase() === "CASH";
}

/**
 * Helper to round a floating number to 2 decimal places.
 */
export function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculates Bank Negara Malaysia (BNM) 5-sen rounding for cash transactions.
 * Strict rules based on the last sen digit:
 * - Ending in 1, 2 sen -> round down to 0 sen (-1, -2 sen)
 * - Ending in 3, 4 sen -> round up to 5 sen (+2, +1 sen)
 * - Ending in 5 sen    -> unchanged (0 sen)
 * - Ending in 6, 7 sen -> round down to 5 sen (-1, -2 sen)
 * - Ending in 8, 9 sen -> round up to 10 sen (+2, +1 sen)
 * - Ending in 0 sen    -> unchanged (0 sen)
 *
 * Magnitude-Aware Feature:
 * Guarantees correct rounding for negative refund amounts (e.g. -10.03 -> -10.05).
 */
export function calculateBnmCashRounding(amount: number): {
  roundedAmount: number;
  variance: number;
} {
  // Prevent -0 and deal with negligible amounts
  if (Math.abs(amount) < 0.0001) {
    return { roundedAmount: 0, variance: 0 };
  }

  const sign = amount < 0 ? -1 : 1;
  const absCents = Math.round(Math.abs(amount) * 100);
  const lastDigit = absCents % 10;
  let deltaMagnitudeCents = 0;

  switch (lastDigit) {
    case 1:
      deltaMagnitudeCents = -1; // Round down to 0
      break;
    case 2:
      deltaMagnitudeCents = -2; // Round down to 0
      break;
    case 3:
      deltaMagnitudeCents = 2; // Round up to 5
      break;
    case 4:
      deltaMagnitudeCents = 1; // Round up to 5
      break;
    case 5:
      deltaMagnitudeCents = 0; // Exactly 5 sen
      break;
    case 6:
      deltaMagnitudeCents = -1; // Round down to 5
      break;
    case 7:
      deltaMagnitudeCents = -2; // Round down to 5
      break;
    case 8:
      deltaMagnitudeCents = 2; // Round up to 10
      break;
    case 9:
      deltaMagnitudeCents = 1; // Round up to 10
      break;
    case 0:
    default:
      deltaMagnitudeCents = 0; // Exactly 0 sen
      break;
  }

  const roundedMagnitudeCents = absCents + deltaMagnitudeCents;
  const roundedCents = sign * roundedMagnitudeCents;
  const roundedAmount = roundedCents / 100;
  const variance = Math.round((roundedAmount - amount) * 100) / 100;

  return {
    roundedAmount: Number(roundedAmount.toFixed(2)),
    variance: Number(variance.toFixed(2)),
  };
}

/**
 * Applies BNM rounding conditionally based on payment method.
 * For CASH: applies 5-sen rounding.
 * For Cashless (CARD, DUITNOW_QR, EWALLET, ONLINE_BANKING): strictly preserves exact sen.
 */
export function applyPaymentRounding(
  amount: number,
  paymentMethod: PaymentMethod | string
): BnmRoundingResult {
  const normalizedAmount = roundToTwoDecimals(amount);

  if (isCashPayment(paymentMethod)) {
    const { roundedAmount, variance } = calculateBnmCashRounding(normalizedAmount);
    return {
      originalAmount: normalizedAmount,
      roundedAmount,
      variance,
      applied: true,
    };
  }

  // Cashless transactions preserve exact sen with 0.00 variance
  return {
    originalAmount: normalizedAmount,
    roundedAmount: normalizedAmount,
    variance: 0.0,
    applied: false,
  };
}
