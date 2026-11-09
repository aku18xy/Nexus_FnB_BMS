import { describe, it, assert } from "./test-harness";
import {
  calculateSstAndServiceCharge,
  calculateMalaysianTax,
  calculateItemTax,
} from "../sst-calculator";

describe("TSK-TAX-01: Malaysian SST & Service Charge Calculation Engine", () => {
  describe("FSR (Full-Service Restaurant) Cascading Tax Regime", () => {
    it("calculates 10% Service Charge + 6% compounding SST for baseline RM 100", () => {
      const result = calculateSstAndServiceCharge({
        subtotal: 100.0,
        outletType: "FSR",
        paymentMethod: "CASH",
      });

      assert.equal(result.grossSubtotal, 100.0);
      assert.equal(result.discountAmount, 0.0);
      assert.equal(result.discountedSubtotal, 100.0);
      assert.equal(result.serviceChargeRate, 0.10);
      assert.equal(result.serviceChargeAmount, 10.0); // 10% of 100
      assert.equal(result.taxableBase, 110.0); // 100 + 10
      assert.equal(result.sstRate, 0.06);
      assert.equal(result.sstAmount, 6.60); // 6% of 110
      assert.equal(result.packagingFee, 0.0);
      assert.equal(result.grossPayableAmount, 116.60);
      assert.equal(result.cashRoundingVariance, 0.0);
      assert.equal(result.finalPayableAmount, 116.60);
      assert.equal(result.currency, "MYR");
    });

    it("applies discount BEFORE computing Service Charge and compounding SST", () => {
      const result = calculateSstAndServiceCharge({
        subtotal: 100.0,
        discountAmount: 20.0,
        outletType: "FSR",
        paymentMethod: "CASH",
      });

      assert.equal(result.grossSubtotal, 100.0);
      assert.equal(result.discountAmount, 20.0);
      assert.equal(result.discountedSubtotal, 80.0);
      assert.equal(result.serviceChargeAmount, 8.00); // 10% of 80
      assert.equal(result.taxableBase, 88.00); // 80 + 8
      assert.equal(result.sstAmount, 5.28); // 6% of 88
      assert.equal(result.grossPayableAmount, 93.28);
      // For CASH, 93.28 rounds to 93.30 with +0.02 variance
      assert.equal(result.cashRoundingVariance, 0.02);
      assert.equal(result.finalPayableAmount, 93.30);
    });

    it("preserves exact sen on cashless FSR payment", () => {
      const result = calculateSstAndServiceCharge({
        subtotal: 100.0,
        discountAmount: 20.0,
        outletType: "FSR",
        paymentMethod: "CARD",
      });

      assert.equal(result.grossPayableAmount, 93.28);
      assert.equal(result.cashRoundingVariance, 0.00);
      assert.equal(result.finalPayableAmount, 93.28);
    });

    it("handles intermediate sen fraction precision (Survey Edge Case #18)", () => {
      // Subtotal RM 15.35 -> SC = 1.535 -> 1.54
      // Taxable Base = 15.35 + 1.54 = 16.89
      // SST = 16.89 * 0.06 = 1.0134 -> 1.01
      // Gross = 16.89 + 1.01 = 17.90
      const result = calculateSstAndServiceCharge({
        subtotal: 15.35,
        outletType: "FSR",
        paymentMethod: "CASH",
      });

      assert.equal(result.serviceChargeAmount, 1.54);
      assert.equal(result.taxableBase, 16.89);
      assert.equal(result.sstAmount, 1.01);
      assert.equal(result.grossPayableAmount, 17.90);
      assert.equal(result.cashRoundingVariance, 0.00);
      assert.equal(result.finalPayableAmount, 17.90);
    });
  });

  describe("QSR (Quick-Service Kiosk) Flat Tax & Packaging Fee Regime", () => {
    it("computes 6% SST directly on subtotal with 0% Service Charge and adds packaging fee", () => {
      const result = calculateSstAndServiceCharge({
        subtotal: 50.0,
        takeawayPackagingFee: 0.50,
        outletType: "QSR",
        paymentMethod: "CASH",
      });

      assert.equal(result.grossSubtotal, 50.0);
      assert.equal(result.serviceChargeRate, 0.0);
      assert.equal(result.serviceChargeAmount, 0.0);
      assert.equal(result.taxableBase, 50.0);
      assert.equal(result.sstRate, 0.06);
      assert.equal(result.sstAmount, 3.00); // 6% of 50
      assert.equal(result.packagingFee, 0.50);
      assert.equal(result.grossPayableAmount, 53.50);
      assert.equal(result.cashRoundingVariance, 0.00);
      assert.equal(result.finalPayableAmount, 53.50);
    });

    it("calculates QSR with discount and cashless payment", () => {
      const result = calculateSstAndServiceCharge({
        subtotal: 45.0,
        discountAmount: 5.0,
        takeawayPackagingFee: 0.60,
        outletType: "QSR",
        paymentMethod: "DUITNOW_QR",
      });

      assert.equal(result.discountedSubtotal, 40.0);
      assert.equal(result.serviceChargeAmount, 0.0);
      assert.equal(result.taxableBase, 40.0);
      assert.equal(result.sstAmount, 2.40); // 6% of 40
      assert.equal(result.packagingFee, 0.60);
      assert.equal(result.grossPayableAmount, 43.00);
      assert.equal(result.cashRoundingVariance, 0.00);
      assert.equal(result.finalPayableAmount, 43.00);
    });
  });

  describe("Boundary & Edge Cases", () => {
    it("handles zero subtotal gracefully", () => {
      const result = calculateSstAndServiceCharge({
        subtotal: 0.0,
        outletType: "FSR",
        paymentMethod: "CASH",
      });

      assert.equal(result.grossSubtotal, 0.0);
      assert.equal(result.discountedSubtotal, 0.0);
      assert.equal(result.serviceChargeAmount, 0.0);
      assert.equal(result.taxableBase, 0.0);
      assert.equal(result.sstAmount, 0.0);
      assert.equal(result.grossPayableAmount, 0.0);
      assert.equal(result.finalPayableAmount, 0.0);
    });

    it("handles 100% discount cleanly", () => {
      const result = calculateSstAndServiceCharge({
        subtotal: 50.0,
        discountAmount: 50.0,
        outletType: "FSR",
        paymentMethod: "CASH",
      });

      assert.equal(result.discountedSubtotal, 0.0);
      assert.equal(result.serviceChargeAmount, 0.0);
      assert.equal(result.taxableBase, 0.0);
      assert.equal(result.sstAmount, 0.0);
      assert.equal(result.grossPayableAmount, 0.0);
      assert.equal(result.finalPayableAmount, 0.0);
    });

    it("clamps discount amount if it exceeds subtotal", () => {
      const result = calculateSstAndServiceCharge({
        subtotal: 50.0,
        discountAmount: 80.0,
        outletType: "FSR",
        paymentMethod: "CASH",
      });

      assert.equal(result.discountAmount, 50.0);
      assert.equal(result.discountedSubtotal, 0.0);
      assert.equal(result.grossPayableAmount, 0.0);
      assert.equal(result.finalPayableAmount, 0.0);
    });

    it("clamps negative subtotal or negative discounts to 0", () => {
      const result = calculateSstAndServiceCharge({
        subtotal: -20.0,
        discountAmount: -5.0,
        outletType: "FSR",
        paymentMethod: "CASH",
      });

      assert.equal(result.grossSubtotal, 0.0);
      assert.equal(result.discountAmount, 0.0);
      assert.equal(result.discountedSubtotal, 0.0);
      assert.equal(result.grossPayableAmount, 0.0);
    });
  });

  describe("Helper Functions & Compatibility", () => {
    it("calculateMalaysianTax produces identical output", () => {
      const input = {
        subtotal: 75.0,
        outletType: "FSR" as const,
        paymentMethod: "CASH" as const,
      };
      const r1 = calculateSstAndServiceCharge(input);
      const r2 = calculateMalaysianTax(input);
      assert.deepEqual(r1, r2);
    });

    it("calculateItemTax computes individual item line totals", () => {
      const item = calculateItemTax(12.50, 2);
      assert.equal(item.lineSubtotal, 25.00);
      assert.equal(item.sstAmount, 1.50); // 6% of 25
      assert.equal(item.lineTotal, 26.50);
    });
  });
});
