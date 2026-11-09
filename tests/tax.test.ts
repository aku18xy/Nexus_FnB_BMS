import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSstAndServiceCharge,
  calculateMalaysianTax,
  calculateItemTax,
  DEFAULT_SST_RATE,
  DEFAULT_FSR_SERVICE_CHARGE_RATE,
  DEFAULT_QSR_SERVICE_CHARGE_RATE,
} from "@/lib/tax/sst-calculator";

test("FSR Cascading Tax - Standard RM 100 subtotal with 10% SC and 6% cascading SST", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 100.0,
    outletType: "FSR",
    paymentMethod: "CARD",
  });

  assert.equal(result.grossSubtotal, 100.0);
  assert.equal(result.discountAmount, 0.0);
  assert.equal(result.discountedSubtotal, 100.0);
  assert.equal(result.serviceChargeRate, 0.1);
  assert.equal(result.serviceChargeAmount, 10.0);
  assert.equal(result.taxableBase, 110.0); // 100 + 10 SC
  assert.equal(result.sstRate, 0.06);
  assert.equal(result.sstAmount, 6.6); // 110 * 0.06 = 6.60
  assert.equal(result.packagingFee, 0.0);
  assert.equal(result.grossPayableAmount, 116.6); // 110 + 6.60
  assert.equal(result.finalPayableAmount, 116.6);
  assert.equal(result.currency, "MYR");
});

test("FSR Cascading Tax - Intermediate sen fractions precision (RM 15.35)", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 15.35,
    outletType: "FSR",
    paymentMethod: "DUITNOW_QR",
  });

  // SC = 15.35 * 0.10 = 1.535 -> 1.54
  assert.equal(result.serviceChargeAmount, 1.54);
  // Taxable base = 15.35 + 1.54 = 16.89
  assert.equal(result.taxableBase, 16.89);
  // SST = 16.89 * 0.06 = 1.0134 -> 1.01
  assert.equal(result.sstAmount, 1.01);
  // Gross = 16.89 + 1.01 = 17.90
  assert.equal(result.grossPayableAmount, 17.9);
  assert.equal(result.finalPayableAmount, 17.9);
});

test("FSR Cascading Tax - Discount deducted before calculating Service Charge and SST", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 200.0,
    discountAmount: 50.0,
    outletType: "FSR",
    paymentMethod: "EWALLET",
  });

  assert.equal(result.grossSubtotal, 200.0);
  assert.equal(result.discountAmount, 50.0);
  assert.equal(result.discountedSubtotal, 150.0);
  assert.equal(result.serviceChargeAmount, 15.0); // 150 * 0.10
  assert.equal(result.taxableBase, 165.0); // 150 + 15
  assert.equal(result.sstAmount, 9.9); // 165 * 0.06
  assert.equal(result.grossPayableAmount, 174.9);
  assert.equal(result.finalPayableAmount, 174.9);
});

test("QSR Flat Tax - Standard RM 50 subtotal with 6% SST, 0% SC, and no packaging fee", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 50.0,
    outletType: "QSR",
    paymentMethod: "CARD",
  });

  assert.equal(result.grossSubtotal, 50.0);
  assert.equal(result.serviceChargeRate, 0.0);
  assert.equal(result.serviceChargeAmount, 0.0);
  assert.equal(result.taxableBase, 50.0);
  assert.equal(result.sstRate, 0.06);
  assert.equal(result.sstAmount, 3.0); // 50 * 0.06
  assert.equal(result.packagingFee, 0.0);
  assert.equal(result.grossPayableAmount, 53.0);
  assert.equal(result.finalPayableAmount, 53.0);
});

test("QSR Flat Tax - Takeaway order with packaging surcharge (RM 0.50)", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 20.0,
    takeawayPackagingFee: 0.5,
    outletType: "QSR",
    paymentMethod: "CARD",
  });

  assert.equal(result.discountedSubtotal, 20.0);
  assert.equal(result.serviceChargeAmount, 0.0);
  assert.equal(result.taxableBase, 20.0);
  assert.equal(result.sstAmount, 1.2); // 20 * 0.06
  assert.equal(result.packagingFee, 0.5);
  assert.equal(result.grossPayableAmount, 21.7); // 20 + 1.20 + 0.50
  assert.equal(result.finalPayableAmount, 21.7);
});

test("QSR Flat Tax - Discount applied and packaging fee added to gross", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 30.0,
    discountAmount: 5.0,
    takeawayPackagingFee: 1.0,
    outletType: "QSR",
    paymentMethod: "DUITNOW_QR",
  });

  assert.equal(result.discountedSubtotal, 25.0);
  assert.equal(result.serviceChargeAmount, 0.0);
  assert.equal(result.taxableBase, 25.0);
  assert.equal(result.sstAmount, 1.5); // 25 * 0.06
  assert.equal(result.packagingFee, 1.0);
  assert.equal(result.grossPayableAmount, 27.5); // 25 + 1.50 + 1.00
  assert.equal(result.finalPayableAmount, 27.5);
});

test("FSR Ignores takeaway packaging surcharge", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 100.0,
    takeawayPackagingFee: 2.0, // Should be ignored in FSR
    outletType: "FSR",
    paymentMethod: "CARD",
  });

  assert.equal(result.packagingFee, 0.0);
  assert.equal(result.grossPayableAmount, 116.6);
});

test("Boundary & Adversarial: Zero subtotal yields zero across all components", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 0.0,
    discountAmount: 10.0,
    outletType: "FSR",
    paymentMethod: "CASH",
  });

  assert.equal(result.grossSubtotal, 0.0);
  assert.equal(result.discountAmount, 0.0);
  assert.equal(result.discountedSubtotal, 0.0);
  assert.equal(result.serviceChargeAmount, 0.0);
  assert.equal(result.sstAmount, 0.0);
  assert.equal(result.grossPayableAmount, 0.0);
  assert.equal(result.finalPayableAmount, 0.0);
});

test("Boundary & Adversarial: Negative subtotal clamped to 0", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: -45.0,
    outletType: "FSR",
    paymentMethod: "CARD",
  });

  assert.equal(result.grossSubtotal, 0.0);
  assert.equal(result.discountedSubtotal, 0.0);
  assert.equal(result.finalPayableAmount, 0.0);
});

test("Boundary & Adversarial: 100% discount reduces payable to 0", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 80.0,
    discountAmount: 80.0,
    outletType: "FSR",
    paymentMethod: "CASH",
  });

  assert.equal(result.discountedSubtotal, 0.0);
  assert.equal(result.serviceChargeAmount, 0.0);
  assert.equal(result.sstAmount, 0.0);
  assert.equal(result.finalPayableAmount, 0.0);
});

test("Boundary & Adversarial: Discount exceeding subtotal is capped at subtotal", () => {
  const result = calculateSstAndServiceCharge({
    subtotal: 50.0,
    discountAmount: 120.0,
    outletType: "FSR",
    paymentMethod: "CARD",
  });

  assert.equal(result.discountAmount, 50.0);
  assert.equal(result.discountedSubtotal, 0.0);
  assert.equal(result.finalPayableAmount, 0.0);
});

test("Compatibility Alias - calculateMalaysianTax produces identical breakdown", () => {
  const input = {
    subtotal: 100.0,
    outletType: "FSR" as const,
    paymentMethod: "CARD" as const,
  };
  const standard = calculateSstAndServiceCharge(input);
  const alias = calculateMalaysianTax(input);

  assert.deepEqual(standard, alias);
});

test("calculateItemTax helper returns line subtotal, SST, and total", () => {
  const line = calculateItemTax(12.5, 2, 0.06);
  assert.equal(line.lineSubtotal, 25.0);
  assert.equal(line.sstAmount, 1.5); // 25 * 0.06
  assert.equal(line.lineTotal, 26.5);
});
