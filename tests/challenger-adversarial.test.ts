import test from "node:test";
import assert from "node:assert/strict";

// Domain 1: Tax Calculator
import {
  calculateSstAndServiceCharge,
  calculateMalaysianTax,
  calculateItemTax,
  DEFAULT_SST_RATE,
  DEFAULT_FSR_SERVICE_CHARGE_RATE,
  DEFAULT_QSR_SERVICE_CHARGE_RATE,
} from "@/lib/tax/sst-calculator";

// Domain 2: BNM Cash Rounding
import {
  calculateBnmCashRounding,
  applyPaymentRounding,
  isCashPayment,
  roundToTwoDecimals,
} from "@/lib/tax/bnm-rounding";

// Domain 3: LHDN MyInvois Client & Hashing
import {
  LhdnMyInvoisClient,
  generateLhdnQrUrl,
  validateTinFormat,
  classifyBuyerTin,
  TIN_REGEX,
} from "@/lib/lhdn/myinvois-client";
import {
  canonicalizeJson,
  computeSha256,
  hashInvoiceDocument,
} from "@/lib/lhdn/hashing";
import { LhdnInvoiceDocument } from "@/lib/lhdn/types";

// Domain 4: Recipe BOM & Costing
import {
  calculateRecipeCost,
  convertQuantity,
  normalizeUOM,
  classifyFoodCostStatus,
  calculateSuggestedSellingPrice,
  scaleRecipeBatch,
} from "@/lib/inventory/bom-calculator";
import {
  IngredientCostProfile,
  RecipeBomLineItem,
} from "@/lib/inventory/types";

// ============================================================================
// SECTION 1: MALAYSIAN TAX ENGINE ADVERSARIAL STRESS TESTS
// ============================================================================

test("ADV-TAX-01: Large amounts & IEEE-754 precision under extreme magnitudes", () => {
  const largeSubtotals = [
    100_000.0,
    1_000_000.0,
    50_000_000.0,
    999_999_999.99,
  ];

  for (const subtotal of largeSubtotals) {
    const result = calculateSstAndServiceCharge({
      subtotal,
      outletType: "FSR",
      paymentMethod: "CARD",
    });

    assert.ok(!Number.isNaN(result.grossPayableAmount), "Gross payable must not be NaN");
    assert.ok(Number.isFinite(result.grossPayableAmount), "Gross payable must be finite");
    assert.equal(result.discountedSubtotal, subtotal);
    // In FSR: SC = subtotal * 10%, Taxable Base = subtotal + SC, SST = Base * 6%
    const expectedSc = Math.round(subtotal * 0.1 * 100) / 100;
    const expectedBase = Math.round((subtotal + expectedSc) * 100) / 100;
    const expectedSst = Math.round(expectedBase * 0.06 * 100) / 100;
    const expectedGross = Math.round((expectedBase + expectedSst) * 100) / 100;

    assert.equal(result.serviceChargeAmount, expectedSc);
    assert.equal(result.taxableBase, expectedBase);
    assert.equal(result.sstAmount, expectedSst);
    assert.equal(result.grossPayableAmount, expectedGross);
    assert.equal(result.finalPayableAmount, expectedGross);
  }
});

test("ADV-TAX-02: Fractional cents and sub-cent floating point precision fuzzing (500 iterations)", () => {
  for (let i = 0; i < 500; i++) {
    // Generate fractional sub-cent values like 10.005, 15.3333333, etc.
    const rawSubtotal = Math.random() * 500 + 0.001;
    const rawDiscount = Math.random() * (rawSubtotal * 0.5);

    const result = calculateSstAndServiceCharge({
      subtotal: rawSubtotal,
      discountAmount: rawDiscount,
      outletType: i % 2 === 0 ? "FSR" : "QSR",
      paymentMethod: i % 3 === 0 ? "CASH" : "CARD",
    });

    // Invariant: All output values must be rounded to exactly 2 decimal places
    const monetaryFields = [
      result.grossSubtotal,
      result.discountAmount,
      result.discountedSubtotal,
      result.serviceChargeAmount,
      result.taxableBase,
      result.sstAmount,
      result.packagingFee,
      result.grossPayableAmount,
      result.cashRoundingVariance,
      result.finalPayableAmount,
    ];

    for (const val of monetaryFields) {
      assert.ok(Number.isFinite(val), `Monetary value ${val} must be finite`);
      const fixed = Number(val.toFixed(2));
      assert.equal(val, fixed, `Monetary value ${val} must be strictly rounded to 2 decimal places`);
    }

    // Invariant: discountedSubtotal = grossSubtotal - discountAmount
    assert.equal(
      result.discountedSubtotal,
      Math.round((result.grossSubtotal - result.discountAmount) * 100) / 100
    );

    // Invariant: grossPayableAmount = taxableBase + sstAmount + packagingFee
    assert.equal(
      result.grossPayableAmount,
      Math.round((result.taxableBase + result.sstAmount + result.packagingFee) * 100) / 100
    );

    // Invariant: finalPayableAmount = grossPayableAmount + cashRoundingVariance
    assert.equal(
      result.finalPayableAmount,
      Math.round((result.grossPayableAmount + result.cashRoundingVariance) * 100) / 100
    );
  }
});

test("ADV-TAX-03: Adversarial negative and zero inputs clamp safely", () => {
  // Negative subtotal
  const negSub = calculateSstAndServiceCharge({
    subtotal: -50.0,
    outletType: "FSR",
    paymentMethod: "CASH",
  });
  assert.equal(negSub.grossSubtotal, 0.0);
  assert.equal(negSub.discountedSubtotal, 0.0);
  assert.equal(negSub.grossPayableAmount, 0.0);
  assert.equal(negSub.finalPayableAmount, 0.0);

  // Negative discount clamps to 0
  const negDisc = calculateSstAndServiceCharge({
    subtotal: 100.0,
    discountAmount: -25.0,
    outletType: "FSR",
    paymentMethod: "CARD",
  });
  assert.equal(negDisc.discountAmount, 0.0);
  assert.equal(negDisc.discountedSubtotal, 100.0);

  // Extreme discount exceeding subtotal caps at subtotal
  const extremeDisc = calculateSstAndServiceCharge({
    subtotal: 80.0,
    discountAmount: 150.0,
    outletType: "FSR",
    paymentMethod: "CARD",
  });
  assert.equal(extremeDisc.discountAmount, 80.0);
  assert.equal(extremeDisc.discountedSubtotal, 0.0);
  assert.equal(extremeDisc.grossPayableAmount, 0.0);
  assert.equal(extremeDisc.finalPayableAmount, 0.0);

  // Negative packaging fee clamps to 0
  const negPack = calculateSstAndServiceCharge({
    subtotal: 50.0,
    outletType: "QSR",
    takeawayPackagingFee: -5.0,
    paymentMethod: "CARD",
  });
  assert.equal(negPack.packagingFee, 0.0);

  // Negative custom tax rates clamp to 0
  const negRates = calculateSstAndServiceCharge({
    subtotal: 100.0,
    outletType: "FSR",
    serviceChargeRate: -0.1,
    sstRate: -0.06,
    paymentMethod: "CARD",
  });
  assert.equal(negRates.serviceChargeAmount, 0.0);
  assert.equal(negRates.sstAmount, 0.0);
  assert.equal(negRates.grossPayableAmount, 100.0);
});

test("ADV-TAX-04: FSR vs QSR statutory boundary differentiation", () => {
  // FSR MUST strictly ignore packaging fee even if passed by client
  const fsrWithPack = calculateSstAndServiceCharge({
    subtotal: 100.0,
    outletType: "FSR",
    takeawayPackagingFee: 2.5,
    paymentMethod: "CARD",
  });
  assert.equal(fsrWithPack.packagingFee, 0.0);
  assert.equal(fsrWithPack.serviceChargeAmount, 10.0); // 10%
  assert.equal(fsrWithPack.sstAmount, 6.6); // 6% of (100+10) = 6.60

  // QSR MUST strictly default to 0% Service Charge even if serviceChargeRate passed
  const qsrWithSc = calculateSstAndServiceCharge({
    subtotal: 100.0,
    outletType: "QSR",
    serviceChargeRate: 0.1,
    takeawayPackagingFee: 0.5,
    paymentMethod: "CARD",
  });
  assert.equal(qsrWithSc.serviceChargeAmount, 0.0);
  assert.equal(qsrWithSc.packagingFee, 0.5);
  assert.equal(qsrWithSc.sstAmount, 6.0); // 6% of 100 = 6.00
  assert.equal(qsrWithSc.grossPayableAmount, 106.5); // 100 + 6 + 0.50
});

// ============================================================================
// SECTION 2: BNM 5-SEN CASH ROUNDING ADVERSARIAL STRESS TESTS
// ============================================================================

test("ADV-BNM-01: Exhaustive verification across all 100 cent endings (0.00 to 0.99)", () => {
  const baseDollarValues = [0, 5, 12, 49, 100, 999];

  for (const base of baseDollarValues) {
    for (let cents = 0; cents < 100; cents++) {
      const amount = Number((base + cents / 100).toFixed(2));
      const { roundedAmount, variance } = calculateBnmCashRounding(amount);

      // Invariant 1: Rounded cents MUST be a multiple of 5 sen (0 or 5 in last digit)
      const roundedCents = Math.round(roundedAmount * 100);
      assert.equal(
        roundedCents % 5,
        0,
        `Amount ${amount} rounded to ${roundedAmount} is not a multiple of 5 sen`
      );

      // Invariant 2: roundedAmount = amount + variance
      const sum = Number((amount + variance).toFixed(2));
      assert.equal(
        roundedAmount,
        sum,
        `For amount ${amount}, rounded (${roundedAmount}) != amount + variance (${sum})`
      );

      // Invariant 3: Variance must be strictly in [-0.02, +0.02]
      assert.ok(
        variance >= -0.02 && variance <= 0.02,
        `Variance ${variance} out of bounds [-0.02, 0.02] for amount ${amount}`
      );

      // Invariant 4: Exact statutory rule table matching
      const lastDigit = cents % 10;
      if (lastDigit === 1 || lastDigit === 6) {
        assert.equal(variance, -0.01, `Failed for cent ending ${lastDigit} on ${amount}`);
      } else if (lastDigit === 2 || lastDigit === 7) {
        assert.equal(variance, -0.02, `Failed for cent ending ${lastDigit} on ${amount}`);
      } else if (lastDigit === 3 || lastDigit === 8) {
        assert.equal(variance, 0.02, `Failed for cent ending ${lastDigit} on ${amount}`);
      } else if (lastDigit === 4 || lastDigit === 9) {
        assert.equal(variance, 0.01, `Failed for cent ending ${lastDigit} on ${amount}`);
      } else if (lastDigit === 5 || lastDigit === 0) {
        assert.equal(variance, 0.0, `Failed for cent ending ${lastDigit} on ${amount}`);
      }
    }
  }
});

test("ADV-BNM-02: Negative cash refunds magnitude-aware rounding across all 100 negative cents", () => {
  for (let cents = 0; cents < 100; cents++) {
    const amount = Number((-10 - cents / 100).toFixed(2));
    const { roundedAmount, variance } = calculateBnmCashRounding(amount);

    // Invariant 1: Rounded cents must be a multiple of 5 sen
    const roundedCents = Math.round(roundedAmount * 100);
    assert.equal(
      Math.abs(roundedCents % 5),
      0,
      `Negative amount ${amount} rounded to ${roundedAmount} is not a multiple of 5 sen`
    );

    // Invariant 2: roundedAmount = amount + variance
    const sum = Number((amount + variance).toFixed(2));
    assert.equal(
      roundedAmount,
      sum,
      `For negative amount ${amount}, rounded (${roundedAmount}) != amount + variance (${sum})`
    );

    // Invariant 3: Magnitude rule verification
    // For -10.03, magnitude is 10.03 -> rounds up to 10.05 -> result is -10.05
    // variance = -10.05 - (-10.03) = -0.02
    const lastDigit = cents % 10;
    if (lastDigit === 1 || lastDigit === 6) {
      assert.equal(variance, 0.01, `Failed negative magnitude for ${amount}`);
    } else if (lastDigit === 2 || lastDigit === 7) {
      assert.equal(variance, 0.02, `Failed negative magnitude for ${amount}`);
    } else if (lastDigit === 3 || lastDigit === 8) {
      assert.equal(variance, -0.02, `Failed negative magnitude for ${amount}`);
    } else if (lastDigit === 4 || lastDigit === 9) {
      assert.equal(variance, -0.01, `Failed negative magnitude for ${amount}`);
    } else if (lastDigit === 0 || lastDigit === 5) {
      assert.equal(variance, 0.0, `Failed negative magnitude for ${amount}`);
    }
  }
});

test("ADV-BNM-03: Monte Carlo property fuzzing (5,000 random samples)", () => {
  for (let i = 0; i < 5000; i++) {
    const rawAmount = (Math.random() - 0.5) * 200000; // -100,000 to +100,000
    const normalized = roundToTwoDecimals(rawAmount);

    const { roundedAmount, variance } = calculateBnmCashRounding(normalized);

    const roundedCents = Math.round(roundedAmount * 100);
    assert.equal(Math.abs(roundedCents % 5), 0, `Monte Carlo fail: ${roundedAmount} not multiple of 5`);
    assert.equal(
      roundedAmount,
      Number((normalized + variance).toFixed(2)),
      `Sum invariant violated for ${normalized}`
    );
    assert.ok(Math.abs(variance) <= 0.02001, `Variance ${variance} exceeded 2 sen for ${normalized}`);
  }
});

test("ADV-BNM-04: Non-cash payment method permutations and casing", () => {
  const cashPermutations = ["CASH", "cash", "Cash", "cAsH", "CAsH "];
  for (const method of cashPermutations) {
    assert.ok(isCashPayment(method.trim()), `Method '${method}' should evaluate to cash`);
    const res = applyPaymentRounding(12.33, method.trim());
    assert.equal(res.applied, true);
    assert.equal(res.roundedAmount, 12.35);
  }

  const cashlessPermutations = [
    "CARD",
    "card",
    "Card",
    "DUITNOW_QR",
    "duitnow_qr",
    "EWALLET",
    "TouchNGo",
    "ONLINE_BANKING",
    "CHEQUE",
    "VOUCHER",
    "",
    "   ",
  ];
  for (const method of cashlessPermutations) {
    assert.equal(isCashPayment(method), false, `Method '${method}' should NOT evaluate to cash`);
    const res = applyPaymentRounding(12.33, method);
    assert.equal(res.applied, false);
    assert.equal(res.roundedAmount, 12.33);
    assert.equal(res.variance, 0.0);
  }
});

// ============================================================================
// SECTION 3: LHDN MYINVOIS CLIENT & HASHING ADVERSARIAL STRESS TESTS
// ============================================================================

test("ADV-LHDN-01: TIN Validation & Classification Fuzzing", () => {
  // Valid Company TINs
  const validCompanies = ["C1234567890", "C0000000001", "C9999999999", "c1234567890", " C1234567890 "];
  for (const tin of validCompanies) {
    assert.ok(validateTinFormat(tin), `Valid company TIN '${tin}' should pass`);
    assert.equal(classifyBuyerTin(tin), "COMPANY");
  }

  // Valid Individual TINs
  const validIndividuals = ["IG1234567890", "IG0000000001", "ig9876543210", " IG1234567890 "];
  for (const tin of validIndividuals) {
    assert.ok(validateTinFormat(tin), `Valid individual TIN '${tin}' should pass`);
    assert.equal(classifyBuyerTin(tin), "INDIVIDUAL");
  }

  // Valid General Public TIN
  const validGp = ["EI00000000010", "ei00000000010", " EI00000000010 "];
  for (const tin of validGp) {
    assert.ok(validateTinFormat(tin), `General public TIN '${tin}' should pass`);
    assert.equal(classifyBuyerTin(tin), "GENERAL_PUBLIC");
  }

  // Malformed / Adversarial TINs
  const invalidTins = [
    "",
    "   ",
    "C123456789", // 9 digits
    "C12345678901", // 11 digits
    "IG123456789", // 9 digits
    "IG12345678901", // 11 digits
    "EI0000000001", // 10 chars
    "EI000000000100", // 14 chars
    "C12345ABCDE", // non-digits
    "IG12345ABCDE", // non-digits
    "A1234567890", // wrong prefix
    "X1234567890", // wrong prefix
    "C 1234567890", // space inside
    "C12345-67890", // dash inside
    "' OR 1=1 --", // SQL injection attempt
    "<script>alert(1)</script>", // XSS payload
    "null",
    "undefined",
  ];

  for (const tin of invalidTins) {
    assert.equal(validateTinFormat(tin), false, `Invalid TIN '${tin}' must fail validation`);
    assert.equal(classifyBuyerTin(tin), "INVALID", `Invalid TIN '${tin}' must classify as INVALID`);
  }
});

test("ADV-LHDN-02: Canonical JSON determinism & SHA-256 digital document hashing", () => {
  // Key permutation determinism: order of properties must produce exact identical hash
  const docVariantA = {
    invoiceNumber: "INV-2026-001",
    issueDateTime: "2026-11-09T12:00:00Z",
    supplier: {
      tin: "C1234567890",
      name: "Nexus FnB Sdn Bhd",
      address: {
        city: "Kuala Lumpur",
        state: "Wilayah Persekutuan",
        postalCode: "50450",
      },
    },
    lineItems: [
      { id: "1", description: "Roti Canai", price: 2.5 },
      { id: "2", description: "Teh Tarik", price: 3.5 },
    ],
    totalPayable: 6.0,
  };

  const docVariantB = {
    totalPayable: 6.0,
    lineItems: [
      { description: "Roti Canai", id: "1", price: 2.5 },
      { price: 3.5, id: "2", description: "Teh Tarik" },
    ],
    supplier: {
      address: {
        postalCode: "50450",
        state: "Wilayah Persekutuan",
        city: "Kuala Lumpur",
      },
      name: "Nexus FnB Sdn Bhd",
      tin: "C1234567890",
    },
    issueDateTime: "2026-11-09T12:00:00Z",
    invoiceNumber: "INV-2026-001",
  };

  const hashA = hashInvoiceDocument(docVariantA);
  const hashB = hashInvoiceDocument(docVariantB);

  assert.equal(hashA.hex, hashB.hex, "Canonical SHA-256 hex digests must be identical across key permutations");
  assert.equal(hashA.base64, hashB.base64, "Canonical SHA-256 base64 digests must be identical");
  assert.equal(hashA.hex.length, 64, "SHA-256 hex must be exactly 64 characters");
  assert.equal(hashA.base64.length, 44, "SHA-256 base64 must be exactly 44 characters");

  // documentHash property omission to prevent recursive hashing
  const docWithSelfHash = {
    ...docVariantA,
    documentHash: hashA,
  };
  const hashC = hashInvoiceDocument(docWithSelfHash);
  assert.equal(hashC.hex, hashA.hex, "documentHash property must be excluded from canonical digest");
});

test("ADV-LHDN-03: Special characters, unicode, and emojis in invoice descriptions", () => {
  const unicodeDoc = {
    invoiceNumber: "INV-UNICODE-001",
    buyer: { name: "Tan Ah Kow 陈亚九 & Muthu முத்து" },
    lineItems: [
      { description: "Nasi Lemak Sambal Sotong 🌶️ (Level 3)", price: 15.5 },
      { description: "Special \"Chef's\" Treat \\ Special", price: 25.0 },
    ],
  };

  const canonical = canonicalizeJson(unicodeDoc);
  assert.ok(canonical.includes("陈亚九"), "Unicode characters must be preserved in canonical JSON");
  assert.ok(canonical.includes("🌶️"), "Emojis must be preserved in canonical JSON");
  assert.ok(canonical.includes("முத்து"), "Tamil script must be preserved in canonical JSON");

  const hash = hashInvoiceDocument(unicodeDoc);
  assert.equal(hash.hex.length, 64);
});

test("ADV-LHDN-04: LhdnMyInvoisClient mock submission validation and rejection paths", async () => {
  const client = new LhdnMyInvoisClient({ mockMode: true });

  // 1. Missing invoiceNumber rejection
  const res1 = await client.submitInvoice({
    invoiceNumber: "",
    issueDateTime: new Date().toISOString(),
    invoiceTypeCode: "01",
    currencyCode: "MYR",
    supplier: { tin: "C1234567890", idType: "BRN", idValue: "1", name: "S" },
    buyer: { tin: "C9876543210", idType: "BRN", idValue: "2", name: "B" },
    lineItems: [{ classificationCode: "001", description: "Item", unitPrice: 10, quantity: 1, taxType: "06", taxRate: 0.06, taxAmount: 0.6, subtotal: 10, totalPayable: 10 }],
    subtotalGross: 10,
    totalDiscount: 0,
    serviceChargeAmount: 0,
    taxableBase: 10,
    sstAmount: 0.6,
    roundingAdjustment: 0,
    totalPayable: 10.6,
  });
  assert.equal(res1.success, false);
  assert.equal(res1.validationStatus, "INVALID");
  assert.ok(res1.validationErrors?.some((e) => e.code === "CF_INV_NUM_REQUIRED"));

  // 2. Invalid buyer TIN rejection
  const res2 = await client.submitInvoice({
    invoiceNumber: "INV-001",
    issueDateTime: new Date().toISOString(),
    invoiceTypeCode: "01",
    currencyCode: "MYR",
    supplier: { tin: "C1234567890", idType: "BRN", idValue: "1", name: "S" },
    buyer: { tin: "INVALID_TIN", idType: "BRN", idValue: "2", name: "B" },
    lineItems: [{ classificationCode: "001", description: "Item", unitPrice: 10, quantity: 1, taxType: "06", taxRate: 0.06, taxAmount: 0.6, subtotal: 10, totalPayable: 10 }],
    subtotalGross: 10,
    totalDiscount: 0,
    serviceChargeAmount: 0,
    taxableBase: 10,
    sstAmount: 0.6,
    roundingAdjustment: 0,
    totalPayable: 10.6,
  });
  assert.equal(res2.success, false);
  assert.equal(res2.validationStatus, "INVALID");
  assert.ok(res2.validationErrors?.some((e) => e.code === "CF_BUYER_TIN_INVALID"));

  // 3. Empty line items rejection
  const res3 = await client.submitInvoice({
    invoiceNumber: "INV-002",
    issueDateTime: new Date().toISOString(),
    invoiceTypeCode: "01",
    currencyCode: "MYR",
    supplier: { tin: "C1234567890", idType: "BRN", idValue: "1", name: "S" },
    buyer: { tin: "C9876543210", idType: "BRN", idValue: "2", name: "B" },
    lineItems: [],
    subtotalGross: 0,
    totalDiscount: 0,
    serviceChargeAmount: 0,
    taxableBase: 0,
    sstAmount: 0,
    roundingAdjustment: 0,
    totalPayable: 0,
  });
  assert.equal(res3.success, false);
  assert.equal(res3.validationStatus, "INVALID");
  assert.ok(res3.validationErrors?.some((e) => e.code === "CF_LINE_ITEMS_EMPTY"));

  // 4. Successful mock submission
  const validDoc: LhdnInvoiceDocument = {
    invoiceNumber: "INV-2026-999",
    issueDateTime: new Date().toISOString(),
    invoiceTypeCode: "01",
    currencyCode: "MYR",
    supplier: { tin: "C1234567890", idType: "BRN", idValue: "202401001234", name: "NEXUS FNB" },
    buyer: { tin: "IG9876543210", idType: "NRIC", idValue: "900101145555", name: "ALI BIN AHMAD" },
    lineItems: [{ classificationCode: "001", description: "Set Lunch", unitPrice: 20, quantity: 1, taxType: "06", taxRate: 0.06, taxAmount: 1.2, subtotal: 20, totalPayable: 21.2 }],
    subtotalGross: 20,
    totalDiscount: 0,
    serviceChargeAmount: 0,
    taxableBase: 20,
    sstAmount: 1.2,
    roundingAdjustment: 0,
    totalPayable: 21.2,
  };
  const validRes = await client.submitInvoice(validDoc);
  assert.equal(validRes.success, true);
  assert.equal(validRes.validationStatus, "VALID");
  assert.ok(validRes.uuid?.startsWith("LHDN-"));
  assert.ok(validRes.qrCodeUrl?.includes(encodeURIComponent(validRes.uuid!)));
  assert.equal(validRes.documentHash?.hex.length, 64);
});

// ============================================================================
// SECTION 4: RECIPE BOM & FOOD COSTING ADVERSARIAL STRESS TESTS
// ============================================================================

test("ADV-BOM-01: Zero base selling price, empty items, and division by zero safety", () => {
  const catalog: IngredientCostProfile[] = [
    {
      id: "ing-1",
      name: "Rice",
      sku: "SKU-RICE",
      uom: "KG",
      currentCostPerUnit: 4.5,
      supplierName: "Bernas",
      isHalalCertified: true,
    },
  ];

  // Zero base price must not produce NaN or Infinity in foodCostPercentage
  const zeroBaseResult = calculateRecipeCost(
    [{ ingredientId: "ing-1", recipeQuantity: 200, recipeUom: "GRAM", wastageAllowancePercent: 0 }],
    catalog,
    0.0
  );
  assert.equal(zeroBaseResult.basePrice, 0.0);
  assert.equal(zeroBaseResult.totalCost, 0.9); // 200g @ RM 4.50/kg = RM 0.90
  assert.equal(zeroBaseResult.foodCostPercentage, 0.0); // Safe fallback
  assert.equal(zeroBaseResult.grossMarginAmount, 0.0);
  assert.equal(zeroBaseResult.grossMarginPercentage, 0.0);

  // Negative base price clamps to 0
  const negBaseResult = calculateRecipeCost(
    [{ ingredientId: "ing-1", recipeQuantity: 200, recipeUom: "GRAM", wastageAllowancePercent: 0 }],
    catalog,
    -15.0
  );
  assert.equal(negBaseResult.basePrice, 0.0);

  // Empty items list
  const emptyResult = calculateRecipeCost([], catalog, 20.0);
  assert.equal(emptyResult.totalCost, 0.0);
  assert.equal(emptyResult.foodCostPercentage, 0.0);
  assert.equal(emptyResult.grossMarginAmount, 20.0);
  assert.equal(emptyResult.grossMarginPercentage, 100.0);
  assert.equal(emptyResult.lineItems.length, 0);

  // Suggested price with zero cost or zero target percent
  assert.equal(calculateSuggestedSellingPrice(0, 30), 0);
  assert.equal(calculateSuggestedSellingPrice(10, 0), 0);
  assert.equal(calculateSuggestedSellingPrice(-5, 30), 0);
});

test("ADV-BOM-02: Wastage allowance boundary extremes (0%, 100%, 500%, negative)", () => {
  const catalog: IngredientCostProfile[] = [
    {
      id: "ing-meat",
      name: "Tenderloin",
      sku: "SKU-MEAT",
      uom: "KG",
      currentCostPerUnit: 60.0,
      supplierName: "MeatSupply Co",
      isHalalCertified: true,
    },
  ];

  // 100% wastage doubles the effective quantity
  // 500g recipe qty with 100% wastage = 1000g gross = 1 KG = RM 60.00
  const res100 = calculateRecipeCost(
    [{ ingredientId: "ing-meat", recipeQuantity: 500, recipeUom: "GRAM", wastageAllowancePercent: 100 }],
    catalog,
    150.0
  );
  assert.equal(res100.lineItems[0].effectiveQuantity, 1000.0);
  assert.equal(res100.totalCost, 60.0);

  // 500% wastage multiplies by 6
  // 100g with 500% wastage = 600g = 0.6 KG = RM 36.00
  const res500 = calculateRecipeCost(
    [{ ingredientId: "ing-meat", recipeQuantity: 100, recipeUom: "GRAM", wastageAllowancePercent: 500 }],
    catalog,
    100.0
  );
  assert.equal(res500.lineItems[0].effectiveQuantity, 600.0);
  assert.equal(res500.totalCost, 36.0);

  // Negative wastage clamps to 0%
  const resNeg = calculateRecipeCost(
    [{ ingredientId: "ing-meat", recipeQuantity: 500, recipeUom: "GRAM", wastageAllowancePercent: -25 }],
    catalog,
    150.0
  );
  assert.equal(resNeg.lineItems[0].effectiveQuantity, 500.0);
  assert.equal(resNeg.totalCost, 30.0);
});

test("ADV-BOM-03: UOM conversion matrix and density edge cases", () => {
  // Density division by zero protection: density <= 0 clamped to 0.0001
  const zeroDensityConv = convertQuantity(100, "GRAM", "ML", 0);
  assert.ok(Number.isFinite(zeroDensityConv), "Zero density must not produce Infinity or NaN");

  const negDensityConv = convertQuantity(100, "GRAM", "ML", -5.0);
  assert.ok(Number.isFinite(negDensityConv), "Negative density must not produce Infinity or NaN");

  // Specific gravity conversions for common F&B liquids
  // Cooking oil: density ~0.92 g/ml. 1000g of oil = 1000 / 0.92 = 1086.956 ml
  const oilMl = convertQuantity(1000, "GRAM", "ML", 0.92);
  assert.equal(Math.round(oilMl * 100) / 100, 1086.96);

  // Honey: density ~1.42 g/ml. 500 ml of honey = 500 * 1.42 = 710 g
  const honeyG = convertQuantity(500, "ML", "GRAM", 1.42);
  assert.equal(Math.round(honeyG * 100) / 100, 710.0);

  // Mass to mass roundtrip
  assert.equal(convertQuantity(1.75, "KG", "GRAM"), 1750);
  assert.equal(convertQuantity(3500, "GRAM", "KG"), 3.5);

  // Volume to volume roundtrip
  assert.equal(convertQuantity(2.25, "LITER", "ML"), 2250);
  assert.equal(convertQuantity(750, "ML", "LITER"), 0.75);

  // Discrete units
  assert.equal(convertQuantity(10, "UNIT", "PORTION"), 10);
  assert.equal(convertQuantity(5, "PORTION", "UNIT"), 5);

  // Unknown UOM string handling
  assert.equal(normalizeUOM("bottle"), "UNIT");
  assert.equal(normalizeUOM("pinch"), "UNIT");
  assert.equal(normalizeUOM("UNKNOWN_UOM"), "UNIT");
});

test("ADV-BOM-04: Food cost threshold boundaries and central kitchen batch scaling", () => {
  // Threshold boundaries
  assert.equal(classifyFoodCostStatus(0.0), "HEALTHY");
  assert.equal(classifyFoodCostStatus(30.0), "HEALTHY");
  assert.equal(classifyFoodCostStatus(30.01), "ACCEPTABLE");
  assert.equal(classifyFoodCostStatus(38.0), "ACCEPTABLE");
  assert.equal(classifyFoodCostStatus(38.01), "WARNING");
  assert.equal(classifyFoodCostStatus(50.0), "WARNING");
  assert.equal(classifyFoodCostStatus(50.01), "CRITICAL");
  assert.equal(classifyFoodCostStatus(100.0), "CRITICAL");

  // Batch scaling
  const sampleBreakdown = {
    menuItemName: "Nasi Lemak",
    basePrice: 15.0,
    totalCost: 4.5,
    grossMarginAmount: 10.5,
    grossMarginPercentage: 70.0,
    foodCostPercentage: 30.0,
    costStatus: "HEALTHY" as const,
    lineItems: [
      {
        ingredientId: "rice",
        ingredientName: "Beras Wangi",
        recipeQuantity: 150,
        recipeUom: "GRAM" as const,
        effectiveQuantity: 165,
        purchaseUom: "KG" as const,
        unitCost: 4.0,
        normalizedQuantityInPurchaseUom: 0.165,
        totalCost: 0.66,
        costSharePercent: 14.67,
      },
      {
        ingredientId: "chicken",
        ingredientName: "Ayam",
        recipeQuantity: 200,
        recipeUom: "GRAM" as const,
        effectiveQuantity: 224,
        purchaseUom: "KG" as const,
        unitCost: 12.0,
        normalizedQuantityInPurchaseUom: 0.224,
        totalCost: 2.69,
        costSharePercent: 59.78,
      },
    ],
  };

  // Normal scaling
  const batch50 = scaleRecipeBatch(sampleBreakdown, 50);
  assert.equal(batch50.batchMultiplier, 50);
  assert.equal(batch50.totalBatchCost, 225.0); // 4.50 * 50
  assert.equal(batch50.scaledLineItems[0].scaledRecipeQuantity, 7500); // 150 * 50
  assert.equal(batch50.scaledLineItems[0].scaledEffectiveQuantity, 8250); // 165 * 50

  // Clamping negative or zero multiplier to 1
  const batchZero = scaleRecipeBatch(sampleBreakdown, 0);
  assert.equal(batchZero.batchMultiplier, 1);
  assert.equal(batchZero.totalBatchCost, 4.5);

  const batchNeg = scaleRecipeBatch(sampleBreakdown, -10);
  assert.equal(batchNeg.batchMultiplier, 1);
  assert.equal(batchNeg.totalBatchCost, 4.5);
});
