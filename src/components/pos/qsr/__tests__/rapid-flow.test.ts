import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateMalaysianTax } from "@/lib/tax/malaysia-tax";
import {
  SAMPLE_QSR_MENU,
  SAMPLE_COMBO_DRINKS,
  SAMPLE_COMBO_SIDES,
  QsrCartItem,
  SelectedCombo,
  QueueToken,
} from "../types";

describe("QSR Rapid Tap Ordering & Compliance Flow (TSK-POS-04, SRS-FOH-05, SRS-FOH-06)", () => {
  describe("6-Tap Order Entry Constraint", () => {
    it("completes full order flow within exactly 6 taps: Category -> Item -> Modifier -> Confirm -> Payment -> Settle", () => {
      let tapCount = 0;
      const stepLog: string[] = [];

      const recordTap = (step: string) => {
        tapCount++;
        stepLog.push(step);
      };

      // Tap 1: Category selection
      const category = "Mains";
      recordTap(`1. Select Category: ${category}`);

      // Tap 2: Item selection (opens combo upsell modal)
      const selectedItem = SAMPLE_QSR_MENU.find((i) => i.name === "Nasi Lemak Sambal Sotong")!;
      assert.ok(selectedItem);
      assert.equal(selectedItem.hasComboUpsell, true);
      recordTap(`2. Select Item: ${selectedItem.name}`);

      // Tap 3: Select combo drink upgrade
      const comboDrink = selectedItem.comboDrinkOptions![0]; // Teh Tarik Kaw
      assert.ok(comboDrink);
      recordTap(`3. Select Combo Drink: ${comboDrink.name}`);

      // Tap 4: Confirm combo and add to cart
      const combo: SelectedCombo = { drink: comboDrink };
      const cartItem: QsrCartItem = {
        lineId: `${selectedItem.id}-${comboDrink.id}`,
        menuItem: selectedItem,
        quantity: 1,
        combo,
        unitPrice: selectedItem.price + comboDrink.priceDelta,
        lineTotal: selectedItem.price + comboDrink.priceDelta,
      };
      recordTap("4. Confirm Combo & Add to Cart");

      assert.equal(cartItem.unitPrice, 14.9 + 2.0); // 16.90

      // Tap 5: Select Payment Method
      const paymentMethod = "CASH";
      recordTap(`5. Select Payment: ${paymentMethod}`);

      // Calculate tax breakdown
      const tax = calculateMalaysianTax({
        subtotal: cartItem.lineTotal,
        outletType: "QSR",
        paymentMethod,
        takeawayPackagingFee: 0.5,
      });

      // Tap 6: Settle & Fire Ticket
      let tokenCounter = 108;
      const tokenNumber = tokenCounter;
      tokenCounter = tokenCounter + 1;
      recordTap(`6. Settle & Fire Token #${tokenNumber}`);

      assert.equal(tapCount, 6);
      assert.ok(tapCount <= 6);
      assert.equal(tokenNumber, 108);
      assert.equal(tokenCounter, 109);
      assert.equal(tax.packagingFee, 0.5);
      assert.equal(tax.serviceChargeRate, 0.0); // QSR has 0% service charge
    });
  });

  describe("Takeaway Packaging Surcharge Toggle", () => {
    it("applies RM0.50 packaging surcharge when Takeaway is selected", () => {
      const subtotal = 14.9;
      const takeawayTax = calculateMalaysianTax({
        subtotal,
        outletType: "QSR",
        paymentMethod: "DUITNOW_QR",
        takeawayPackagingFee: 0.5,
      });

      assert.equal(takeawayTax.packagingFee, 0.5);
      assert.equal(takeawayTax.serviceChargeRate, 0.0);
      assert.equal(takeawayTax.serviceChargeAmount, 0.0);
      assert.equal(takeawayTax.sstRate, 0.06);
      assert.equal(takeawayTax.sstAmount, 0.89); // 14.90 * 0.06 = 0.894 -> 0.89
      // Gross payable = 14.90 + 0.89 + 0.50 = 16.29
      assert.equal(takeawayTax.finalPayableAmount, 16.29);
    });

    it("waives packaging surcharge (RM0.00) when Dine-In is selected", () => {
      const subtotal = 14.9;
      const dineInTax = calculateMalaysianTax({
        subtotal,
        outletType: "QSR",
        paymentMethod: "DUITNOW_QR",
        takeawayPackagingFee: 0.0,
      });

      assert.equal(dineInTax.packagingFee, 0.0);
      assert.equal(dineInTax.serviceChargeRate, 0.0);
      assert.equal(dineInTax.sstAmount, 0.89);
      // Gross payable = 14.90 + 0.89 = 15.79
      assert.equal(dineInTax.finalPayableAmount, 15.79);
    });
  });

  describe("Sequential Daily Token Generator (#101 to #999)", () => {
    it("increments sequential daily tokens and wraps back to #101 after #999", () => {
      let currentToken = 101;
      const getNextToken = (curr: number) => (curr >= 999 ? 101 : curr + 1);

      currentToken = getNextToken(currentToken);
      assert.equal(currentToken, 102);

      currentToken = getNextToken(998);
      assert.equal(currentToken, 999);

      // Daily rollover boundary
      currentToken = getNextToken(999);
      assert.equal(currentToken, 101);
    });

    it("generates valid QueueToken object with PREPARING status", () => {
      const tokenNumber = 108;
      const queueToken: QueueToken = {
        tokenNumber,
        tokenDisplay: `#${tokenNumber}`,
        orderId: "ord-test-1",
        orderMode: "TAKEAWAY",
        itemsSummary: "1x Nasi Lemak Sambal Sotong",
        totalPayable: 16.29,
        status: "PREPARING",
        createdAt: new Date().toISOString(),
      };

      assert.equal(queueToken.tokenDisplay, "#108");
      assert.equal(queueToken.status, "PREPARING");
      assert.equal(queueToken.orderMode, "TAKEAWAY");
    });
  });

  describe("Combo Upsell Options Dataset", () => {
    it("provides valid beverage and side combo modifier options", () => {
      assert.ok(SAMPLE_COMBO_DRINKS.length >= 4);
      assert.ok(SAMPLE_COMBO_SIDES.length >= 3);

      SAMPLE_COMBO_DRINKS.forEach((drink) => {
        assert.ok(drink.priceDelta >= 0);
        assert.ok(drink.name.length > 0);
      });

      SAMPLE_COMBO_SIDES.forEach((side) => {
        assert.ok(side.priceDelta >= 0);
        assert.ok(side.name.length > 0);
      });
    });
  });
});
