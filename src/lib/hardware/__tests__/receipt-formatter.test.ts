import { describe, it } from "node:test";
import assert from "node:assert";
import { format80mmTaxReceipt } from "../receipt-formatter";
import { TaxReceiptData } from "../types";

describe("80mm Tax Receipt Formatter with LHDN QR (TSK-PRT-03)", () => {
  const sampleFSRReceiptData: TaxReceiptData = {
    outletName: "Nexus Bistro Bangsar",
    companyName: "Nexus Hospitality Sdn Bhd",
    brn: "202301099881 (1509988-V)",
    tin: "C2589012340",
    sstRegistrationNumber: "W10-2304-32000123",
    addressLine1: "Lot 4.12, Jalan Telawi 3, Bangsar",
    city: "Kuala Lumpur",
    state: "Wilayah Persekutuan",
    postalCode: "59100",
    phoneNumber: "03-22849900",
    halalCertNumber: "JAKIM.700-2/3/1 042-08/2023",

    orderNumber: "ORD-20261109-0042",
    receiptNumber: "INV-20261109-0042",
    invoiceType: "TAX_INVOICE",
    tableNumber: "Table 12",
    paxCount: 2,
    cashierName: "Ahmad Faizal",
    timestamp: "2026-11-09 14:32:00",
    outletType: "FSR",
    orderMode: "DINE_IN",

    items: [
      {
        name: "Australian Wagyu Ribeye MB7",
        quantity: 1,
        unitPrice: 120.0,
        totalPrice: 120.0,
        modifiers: [{ name: "Truffle Butter Sauce", priceDelta: 8.0 }],
      },
      {
        name: "Wild Mushroom Truffle Soup with Garlic Herb Bread",
        quantity: 1,
        unitPrice: 22.0,
        totalPrice: 22.0,
      },
      {
        name: "Valrhona Warm Chocolate Lava Cake with Madagascar Vanilla Bean Gelato",
        quantity: 1,
        unitPrice: 28.0,
        totalPrice: 28.0,
      },
    ],

    subtotal: 178.0,
    discountedSubtotal: 178.0,
    serviceChargeRate: 0.1,
    serviceChargeAmount: 17.8,
    taxableBase: 195.8, // 178.00 + 17.80
    sstRate: 0.06,
    sstAmount: 11.75, // 195.80 * 0.06 = 11.748 -> 11.75
    grossPayableAmount: 207.55,
    cashRoundingVariance: 0.0, // BNM 5-sen rounding variance
    finalPayableAmount: 207.55,

    paymentMethod: "CARD",

    lhdnUuid: "8a7f4c12-98e3-0d5b-7a12-3456789abcde",
    lhdnQrCodeUrl: "https://myinvois.hasil.gov.my/8a7f4c12-98e3-0d5b-7a12-3456789abcde/share",
    lhdnValidatedAt: "2026-11-09T14:32:05Z",
  };

  it("generates an 80mm receipt with valid 48-char layout and statutory Malaysian fields", () => {
    const result = format80mmTaxReceipt(sampleFSRReceiptData);

    assert.strictEqual(result.lineWidth, 48);
    assert.strictEqual(result.hasLhdnQr, true);
    assert.ok(result.byteLength > 100);

    const txt = result.formattedText;

    // Check Malaysian statutory headers
    assert.ok(txt.includes("Nexus Bistro Bangsar"));
    assert.ok(txt.includes("SSM Reg No: 202301099881 (1509988-V)"));
    assert.ok(txt.includes("SST Reg No: W10-2304-32000123"));
    assert.ok(txt.includes("TIN: C2589012340"));
    assert.ok(txt.includes("59100 Kuala Lumpur, Wilayah Persekutuan"));
    assert.ok(txt.includes("JAKIM Halal: JAKIM.700-2/3/1 042-08/2023"));

    // Check order info
    assert.ok(txt.includes("INV-20261109-0042"));
    assert.ok(txt.includes("Table: Table 12 (2 Pax)"));
    assert.ok(txt.includes("Cashier: Ahmad Faizal"));

    // Check items
    assert.ok(txt.includes("Australian Wagyu Ribeye MB7"));
    assert.ok(txt.includes("120.00"));
    assert.ok(txt.includes("+ Truffle Butter Sauce"));

    // Check financial totals
    assert.ok(txt.includes("Subtotal"));
    assert.ok(txt.includes("178.00"));
    assert.ok(txt.includes("Service Charge (10%)"));
    assert.ok(txt.includes("17.80"));
    assert.ok(txt.includes("Service Tax (SST 6%)"));
    assert.ok(txt.includes("11.75"));
    assert.ok(txt.includes("TOTAL PAYABLE (MYR)"));
    assert.ok(txt.includes("207.55"));

    // Check SST Summary box
    assert.ok(txt.includes("[ SST SUMMARY (JKDM) ]"));
    assert.ok(txt.includes("SST 6%   |   RM 195.80"));

    // Check LHDN MyInvois section
    assert.ok(txt.includes("*** LHDN MyInvois Verified ***"));
    assert.ok(txt.includes("UUID: 8a7f4c12-98e3-0d5b-7a12-3456789abcde"));

    // Check binary ESC/POS byte sequence
    assert.strictEqual(result.escposBytes[0], 0x1b); // ESC
    assert.strictEqual(result.escposBytes[1], 0x40); // @ (INIT)
  });

  it("handles B2B buyer information with buyer TIN and BRN", () => {
    const b2bData: TaxReceiptData = {
      ...sampleFSRReceiptData,
      invoiceType: "TAX_INVOICE",
      buyer: {
        buyerName: "PETRONAS DIGITAL SDN BHD",
        buyerTin: "C1029384756",
        buyerBrn: "199801012345",
        buyerSst: "W10-1808-31000001",
        buyerAddress: "Tower 1, PETRONAS Twin Towers, KLCC",
      },
    };

    const result = format80mmTaxReceipt(b2bData);
    const txt = result.formattedText;

    assert.ok(txt.includes("BUYER / CUSTOMER DETAILS:"));
    assert.ok(txt.includes("Name: PETRONAS DIGITAL SDN BHD"));
    assert.ok(txt.includes("TIN:  C1029384756"));
    assert.ok(txt.includes("BRN:  199801012345"));
    assert.ok(txt.includes("SST:  W10-1808-31000001"));
  });

  it("applies BNM 5-sen rounding on cash payment and triggers cash drawer", () => {
    const cashData: TaxReceiptData = {
      ...sampleFSRReceiptData,
      paymentMethod: "CASH",
      grossPayableAmount: 14.32,
      cashRoundingVariance: -0.02, // 14.32 rounds down to 14.30
      finalPayableAmount: 14.3,
      amountTendered: 20.0,
      changeAmount: 5.7,
      openCashDrawer: true,
    };

    const result = format80mmTaxReceipt(cashData);
    const txt = result.formattedText;

    assert.ok(txt.includes("BNM 5-Sen Cash Rounding"));
    assert.ok(txt.includes("-RM 0.02"));
    assert.ok(txt.includes("14.30"));
    assert.ok(txt.includes("Payment Method:"));
    assert.ok(txt.includes("CASH"));
    assert.ok(txt.includes("Amount Tendered:"));
    assert.ok(txt.includes("20.00"));
    assert.ok(txt.includes("Change Due:"));
    assert.ok(txt.includes("5.70"));

    // Check that cash drawer kick pulse is included in binary stream: 1B 70 00 19 FA
    const hex = Array.from(result.escposBytes.slice(0, 20))
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
    assert.ok(hex.includes("1B 70 00 19 FA"));
  });

  it("wraps extra-long item names cleanly across lines without pushing price column", () => {
    const longNameData: TaxReceiptData = {
      ...sampleFSRReceiptData,
      items: [
        {
          name: "Nasi Lemak Kukus Ayam Goreng Berempah Rendang Daging Sambal Kerang Sambal Sotong Combo Set",
          quantity: 1,
          unitPrice: 38.5,
          totalPrice: 38.5,
        },
      ],
      subtotal: 38.5,
      discountedSubtotal: 38.5,
      serviceChargeRate: 0.1,
      serviceChargeAmount: 3.85,
      taxableBase: 42.35,
      sstRate: 0.06,
      sstAmount: 2.54,
      grossPayableAmount: 44.89,
      cashRoundingVariance: 0,
      finalPayableAmount: 44.89,
    };

    const result = format80mmTaxReceipt(longNameData);
    const lines = result.formattedText.split("\n");

    // Ensure every line length is <= 48
    for (const line of lines) {
      assert.ok(line.length <= 48, `Line exceeded 48 characters: "${line}" (${line.length})`);
    }

    assert.ok(result.formattedText.includes("38.50"));
  });
});
