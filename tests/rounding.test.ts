import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBnmCashRounding,
  applyPaymentRounding,
  isCashPayment,
  roundToTwoDecimals,
} from "@/lib/tax/bnm-rounding";

test("BNM Cash Rounding - 1 sen rounds down to 0 sen (-0.01)", () => {
  const result = calculateBnmCashRounding(10.01);
  assert.equal(result.roundedAmount, 10.0);
  assert.equal(result.variance, -0.01);
});

test("BNM Cash Rounding - 2 sen rounds down to 0 sen (-0.02)", () => {
  const result = calculateBnmCashRounding(10.02);
  assert.equal(result.roundedAmount, 10.0);
  assert.equal(result.variance, -0.02);
});

test("BNM Cash Rounding - 3 sen rounds up to 5 sen (+0.02)", () => {
  const result = calculateBnmCashRounding(10.03);
  assert.equal(result.roundedAmount, 10.05);
  assert.equal(result.variance, 0.02);
});

test("BNM Cash Rounding - 4 sen rounds up to 5 sen (+0.01)", () => {
  const result = calculateBnmCashRounding(10.04);
  assert.equal(result.roundedAmount, 10.05);
  assert.equal(result.variance, 0.01);
});

test("BNM Cash Rounding - 5 sen remains unchanged (0.00)", () => {
  const result = calculateBnmCashRounding(10.05);
  assert.equal(result.roundedAmount, 10.05);
  assert.equal(result.variance, 0.0);
});

test("BNM Cash Rounding - 6 sen rounds down to 5 sen (-0.01)", () => {
  const result = calculateBnmCashRounding(10.06);
  assert.equal(result.roundedAmount, 10.05);
  assert.equal(result.variance, -0.01);
});

test("BNM Cash Rounding - 7 sen rounds down to 5 sen (-0.02)", () => {
  const result = calculateBnmCashRounding(10.07);
  assert.equal(result.roundedAmount, 10.05);
  assert.equal(result.variance, -0.02);
});

test("BNM Cash Rounding - 8 sen rounds up to 10 sen (+0.02)", () => {
  const result = calculateBnmCashRounding(10.08);
  assert.equal(result.roundedAmount, 10.1);
  assert.equal(result.variance, 0.02);
});

test("BNM Cash Rounding - 9 sen rounds up to 10 sen (+0.01)", () => {
  const result = calculateBnmCashRounding(10.09);
  assert.equal(result.roundedAmount, 10.1);
  assert.equal(result.variance, 0.01);
});

test("BNM Cash Rounding - 0 sen remains unchanged (0.00)", () => {
  const result = calculateBnmCashRounding(10.0);
  assert.equal(result.roundedAmount, 10.0);
  assert.equal(result.variance, 0.0);
});

test("Negative Refund Magnitude Safety - -10.03 rounds to -10.05 (variance -0.02)", () => {
  const result = calculateBnmCashRounding(-10.03);
  assert.equal(result.roundedAmount, -10.05);
  assert.equal(result.variance, -0.02);
});

test("Negative Refund Magnitude Safety - -10.01 rounds to -10.00 (variance +0.01)", () => {
  const result = calculateBnmCashRounding(-10.01);
  assert.equal(result.roundedAmount, -10.0);
  assert.equal(result.variance, 0.01);
});

test("Negative Refund Magnitude Safety - -10.08 rounds to -10.10 (variance -0.02)", () => {
  const result = calculateBnmCashRounding(-10.08);
  assert.equal(result.roundedAmount, -10.1);
  assert.equal(result.variance, -0.02);
});

test("Negative Refund Magnitude Safety - -10.06 rounds to -10.05 (variance +0.01)", () => {
  const result = calculateBnmCashRounding(-10.06);
  assert.equal(result.roundedAmount, -10.05);
  assert.equal(result.variance, 0.01);
});

test("Cashless Payments - CARD preserves exact sen with 0.00 variance", () => {
  const result = applyPaymentRounding(10.03, "CARD");
  assert.equal(result.originalAmount, 10.03);
  assert.equal(result.roundedAmount, 10.03);
  assert.equal(result.variance, 0.0);
  assert.equal(result.applied, false);
});

test("Cashless Payments - DUITNOW_QR preserves exact sen with 0.00 variance", () => {
  const result = applyPaymentRounding(10.07, "DUITNOW_QR");
  assert.equal(result.originalAmount, 10.07);
  assert.equal(result.roundedAmount, 10.07);
  assert.equal(result.variance, 0.0);
  assert.equal(result.applied, false);
});

test("Cashless Payments - EWALLET preserves exact sen with 0.00 variance", () => {
  const result = applyPaymentRounding(10.09, "EWALLET");
  assert.equal(result.originalAmount, 10.09);
  assert.equal(result.roundedAmount, 10.09);
  assert.equal(result.variance, 0.0);
  assert.equal(result.applied, false);
});

test("Cash Payment detection - Case insensitivity", () => {
  assert.equal(isCashPayment("cash"), true);
  assert.equal(isCashPayment("CASH"), true);
  assert.equal(isCashPayment("Cash"), true);
  assert.equal(isCashPayment("CARD"), false);
  assert.equal(isCashPayment("DUITNOW_QR"), false);
});

test("Boundary: Zero amount rounding", () => {
  const result = calculateBnmCashRounding(0.0);
  assert.equal(result.roundedAmount, 0.0);
  assert.equal(result.variance, 0.0);
});

test("Boundary: Large amount rounding", () => {
  const result = calculateBnmCashRounding(99999.93);
  assert.equal(result.roundedAmount, 99999.95);
  assert.equal(result.variance, 0.02);
});

test("Helper roundToTwoDecimals", () => {
  assert.equal(roundToTwoDecimals(12.3456), 12.35);
  assert.equal(roundToTwoDecimals(12.3444), 12.34);
});
