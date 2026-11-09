import { describe, it, assert } from "./test-harness";
import {
  calculateBnmCashRounding,
  applyPaymentRounding,
  isCashPayment,
} from "../bnm-rounding";

describe("TSK-TAX-02: Bank Negara Malaysia (BNM) 5-Sen Cash Rounding", () => {
  describe("Official Positive Cash Rounding Rules", () => {
    it("rounds 1 sen down to 0 sen (variance -0.01)", () => {
      const result = calculateBnmCashRounding(10.01);
      assert.equal(result.roundedAmount, 10.00);
      assert.equal(result.variance, -0.01);
    });

    it("rounds 2 sen down to 0 sen (variance -0.02)", () => {
      const result = calculateBnmCashRounding(10.02);
      assert.equal(result.roundedAmount, 10.00);
      assert.equal(result.variance, -0.02);
    });

    it("rounds 3 sen up to 5 sen (variance +0.02)", () => {
      const result = calculateBnmCashRounding(10.03);
      assert.equal(result.roundedAmount, 10.05);
      assert.equal(result.variance, 0.02);
    });

    it("rounds 4 sen up to 5 sen (variance +0.01)", () => {
      const result = calculateBnmCashRounding(10.04);
      assert.equal(result.roundedAmount, 10.05);
      assert.equal(result.variance, 0.01);
    });

    it("leaves 5 sen unchanged (variance 0.00)", () => {
      const result = calculateBnmCashRounding(10.05);
      assert.equal(result.roundedAmount, 10.05);
      assert.equal(result.variance, 0.00);
    });

    it("rounds 6 sen down to 5 sen (variance -0.01)", () => {
      const result = calculateBnmCashRounding(10.06);
      assert.equal(result.roundedAmount, 10.05);
      assert.equal(result.variance, -0.01);
    });

    it("rounds 7 sen down to 5 sen (variance -0.02)", () => {
      const result = calculateBnmCashRounding(10.07);
      assert.equal(result.roundedAmount, 10.05);
      assert.equal(result.variance, -0.02);
    });

    it("rounds 8 sen up to 10 sen (variance +0.02)", () => {
      const result = calculateBnmCashRounding(10.08);
      assert.equal(result.roundedAmount, 10.10);
      assert.equal(result.variance, 0.02);
    });

    it("rounds 9 sen up to 10 sen (variance +0.01)", () => {
      const result = calculateBnmCashRounding(10.09);
      assert.equal(result.roundedAmount, 10.10);
      assert.equal(result.variance, 0.01);
    });

    it("leaves 0 sen unchanged (variance 0.00)", () => {
      const result = calculateBnmCashRounding(10.00);
      assert.equal(result.roundedAmount, 10.00);
      assert.equal(result.variance, 0.00);
    });
  });

  describe("Magnitude-Aware Negative Cash Refund Rounding", () => {
    it("rounds -10.01 magnitude down to -10.00 (variance +0.01)", () => {
      const result = calculateBnmCashRounding(-10.01);
      assert.equal(result.roundedAmount, -10.00);
      assert.equal(result.variance, 0.01);
    });

    it("rounds -10.02 magnitude down to -10.00 (variance +0.02)", () => {
      const result = calculateBnmCashRounding(-10.02);
      assert.equal(result.roundedAmount, -10.00);
      assert.equal(result.variance, 0.02);
    });

    it("rounds -10.03 magnitude up to -10.05 (variance -0.02)", () => {
      const result = calculateBnmCashRounding(-10.03);
      assert.equal(result.roundedAmount, -10.05);
      assert.equal(result.variance, -0.02);
    });

    it("rounds -10.04 magnitude up to -10.05 (variance -0.01)", () => {
      const result = calculateBnmCashRounding(-10.04);
      assert.equal(result.roundedAmount, -10.05);
      assert.equal(result.variance, -0.01);
    });

    it("leaves -10.05 unchanged (variance 0.00)", () => {
      const result = calculateBnmCashRounding(-10.05);
      assert.equal(result.roundedAmount, -10.05);
      assert.equal(result.variance, 0.00);
    });

    it("rounds -10.06 magnitude down to -10.05 (variance +0.01)", () => {
      const result = calculateBnmCashRounding(-10.06);
      assert.equal(result.roundedAmount, -10.05);
      assert.equal(result.variance, 0.01);
    });

    it("rounds -10.07 magnitude down to -10.05 (variance +0.02)", () => {
      const result = calculateBnmCashRounding(-10.07);
      assert.equal(result.roundedAmount, -10.05);
      assert.equal(result.variance, 0.02);
    });

    it("rounds -10.08 magnitude up to -10.10 (variance -0.02)", () => {
      const result = calculateBnmCashRounding(-10.08);
      assert.equal(result.roundedAmount, -10.10);
      assert.equal(result.variance, -0.02);
    });

    it("rounds -10.09 magnitude up to -10.10 (variance -0.01)", () => {
      const result = calculateBnmCashRounding(-10.09);
      assert.equal(result.roundedAmount, -10.10);
      assert.equal(result.variance, -0.01);
    });
  });

  describe("Edge Cases & Zero Amount", () => {
    it("handles 0.00 gracefully with zero variance", () => {
      const result = calculateBnmCashRounding(0.00);
      assert.equal(result.roundedAmount, 0.00);
      assert.equal(result.variance, 0.00);
    });

    it("handles small fractions around 0", () => {
      const result = calculateBnmCashRounding(0.00001);
      assert.equal(result.roundedAmount, 0.00);
      assert.equal(result.variance, 0.00);
    });
  });

  describe("Cashless Exact Sen Preservation", () => {
    it("preserves exact sen for DUITNOW_QR", () => {
      const result = applyPaymentRounding(10.03, "DUITNOW_QR");
      assert.equal(result.roundedAmount, 10.03);
      assert.equal(result.variance, 0.00);
      assert.equal(result.applied, false);
    });

    it("preserves exact sen for CARD", () => {
      const result = applyPaymentRounding(10.07, "CARD");
      assert.equal(result.roundedAmount, 10.07);
      assert.equal(result.variance, 0.00);
      assert.equal(result.applied, false);
    });

    it("preserves exact sen for EWALLET", () => {
      const result = applyPaymentRounding(25.99, "EWALLET");
      assert.equal(result.roundedAmount, 25.99);
      assert.equal(result.variance, 0.00);
      assert.equal(result.applied, false);
    });

    it("preserves exact sen for ONLINE_BANKING", () => {
      const result = applyPaymentRounding(48.88, "ONLINE_BANKING");
      assert.equal(result.roundedAmount, 48.88);
      assert.equal(result.variance, 0.00);
      assert.equal(result.applied, false);
    });

    it("applies 5-sen rounding when payment method is CASH", () => {
      const result = applyPaymentRounding(10.03, "CASH");
      assert.equal(result.roundedAmount, 10.05);
      assert.equal(result.variance, 0.02);
      assert.equal(result.applied, true);
    });

    it("correctly identifies CASH payment regardless of casing", () => {
      assert.equal(isCashPayment("cash"), true);
      assert.equal(isCashPayment("CASH"), true);
      assert.equal(isCashPayment("Cash"), true);
      assert.equal(isCashPayment("CARD"), false);
      assert.equal(isCashPayment("DUITNOW_QR"), false);
    });
  });
});
