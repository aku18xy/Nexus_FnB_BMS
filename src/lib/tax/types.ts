import { OutletType } from "../../types/outlet";

export type PaymentMethod =
  | "CASH"
  | "DUITNOW_QR"
  | "CARD"
  | "EWALLET"
  | "ONLINE_BANKING";

export interface BnmRoundingResult {
  originalAmount: number;
  roundedAmount: number;
  variance: number;
  applied: boolean;
}

export interface TaxCalculationInput {
  subtotal: number;
  discountAmount?: number;
  outletType: OutletType;
  serviceChargeRate?: number; // Defaults to 0.10 for FSR, 0.00 for QSR
  sstRate?: number; // Defaults to 0.06 (6% SST)
  takeawayPackagingFee?: number; // QSR takeaway packaging fee
  isTakeaway?: boolean;
  paymentMethod: PaymentMethod;
}

export interface TaxCalculationBreakdown {
  grossSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  taxableBase: number; // Subtotal (+ Service Charge for FSR)
  sstRate: number;
  sstAmount: number;
  packagingFee: number;
  grossPayableAmount: number; // Before cash rounding
  cashRoundingVariance: number; // BNM 5-sen rounding diff (strictly for CASH)
  finalPayableAmount: number; // Final amount charged
  currency: "MYR";
}
