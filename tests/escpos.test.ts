import test from "node:test";
import assert from "node:assert/strict";
import {
  EscPosBuilder,
  ESC_POS_BYTES,
  ESC,
  GS,
} from "@/lib/hardware/escpos-builder";
import { format80mmTaxReceipt } from "@/lib/hardware/receipt-formatter";

test("ESC/POS Builder - Initialization byte command (ESC @)", () => {
  const builder = new EscPosBuilder();
  builder.init();
  const bytes = builder.build();

  assert.equal(bytes.length, 2);
  assert.equal(bytes[0], 0x1b);
  assert.equal(bytes[1], 0x40);
  assert.equal(builder.toHex(), "1B 40");
});

test("ESC/POS Builder - Text formatting commands (bold, underline, invert)", () => {
  const builder = new EscPosBuilder();
  builder
    .bold(true)
    .underline(1)
    .invert(true)
    .bold(false)
    .underline(false)
    .invert(false);

  const bytes = builder.build();
  // Expected sequences:
  // bold on: [1B, 45, 01]
  // underline 1: [1B, 2D, 01]
  // invert on: [1D, 42, 01]
  // bold off: [1B, 45, 00]
  // underline 0: [1B, 2D, 00]
  // invert off: [1D, 42, 00]
  assert.equal(bytes.length, 18);
  assert.deepEqual(bytes.slice(0, 3), new Uint8Array([0x1b, 0x45, 0x01]));
  assert.deepEqual(bytes.slice(3, 6), new Uint8Array([0x1b, 0x2d, 0x01]));
  assert.deepEqual(bytes.slice(6, 9), new Uint8Array([0x1d, 0x42, 0x01]));
  assert.deepEqual(bytes.slice(9, 12), new Uint8Array([0x1b, 0x45, 0x00]));
  assert.deepEqual(bytes.slice(12, 15), new Uint8Array([0x1b, 0x2d, 0x00]));
  assert.deepEqual(bytes.slice(15, 18), new Uint8Array([0x1d, 0x42, 0x00]));
});

test("ESC/POS Builder - Alignment commands (left, center, right)", () => {
  const builder = new EscPosBuilder();
  builder.align("center").align("right").align("left");
  const bytes = builder.build();

  assert.equal(bytes.length, 9);
  assert.deepEqual(bytes.slice(0, 3), new Uint8Array([0x1b, 0x61, 0x01])); // center
  assert.deepEqual(bytes.slice(3, 6), new Uint8Array([0x1b, 0x61, 0x02])); // right
  assert.deepEqual(bytes.slice(6, 9), new Uint8Array([0x1b, 0x61, 0x00])); // left
});

test("ESC/POS Builder - Paper cutting commands (full and partial)", () => {
  const builder = new EscPosBuilder();
  builder.cut(true, 0); // Partial cut without feed
  builder.cut(false, 0); // Full cut without feed
  const bytes = builder.build();

  assert.equal(bytes.length, 6);
  assert.deepEqual(bytes.slice(0, 3), new Uint8Array([0x1d, 0x56, 0x01])); // partial: GS V 1
  assert.deepEqual(bytes.slice(3, 6), new Uint8Array([0x1d, 0x56, 0x00])); // full: GS V 0
});

test("ESC/POS Builder - 24V RJ11 Solenoid Cash Drawer pulse (ESC p)", () => {
  const builder = new EscPosBuilder();
  builder.cashDrawer(2, 50, 500); // pin 2, 50ms on (25 * 2ms), 500ms off (250 * 2ms)
  builder.cashDrawer(5, 50, 500); // pin 5
  builder.cashDrawerRealtime(); // real-time pulse
  const bytes = builder.build();

  assert.equal(bytes.length, 15); // 5 + 5 + 5
  // Pin 2: [1B, 70, 00, 19, FA]
  assert.deepEqual(bytes.slice(0, 5), new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]));
  // Pin 5: [1B, 70, 01, 19, FA]
  assert.deepEqual(bytes.slice(5, 10), new Uint8Array([0x1b, 0x70, 0x01, 0x19, 0xfa]));
  // Real-time: [10, 14, 01, 00, 05]
  assert.deepEqual(bytes.slice(10, 15), new Uint8Array([0x10, 0x14, 0x01, 0x00, 0x05]));
});

test("ESC/POS Builder - 2D QR Code Generation (GS ( k Model 2)", () => {
  const qrUrl = "https://myinvois.hasil.gov.my/verify/LHDN-123456";
  const builder = new EscPosBuilder();
  builder.qrCode(qrUrl, { size: 6, errorCorrection: "M", model: 2 });
  const bytes = builder.build();

  // 1. Model select (9 bytes): 1D 28 6B 04 00 31 41 32 00
  assert.deepEqual(
    bytes.slice(0, 9),
    new Uint8Array([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])
  );

  // 2. Module size (8 bytes): 1D 28 6B 03 00 31 43 06
  assert.deepEqual(
    bytes.slice(9, 17),
    new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06])
  );

  // 3. EC Level 'M' (8 bytes): 1D 28 6B 03 00 31 45 31
  assert.deepEqual(
    bytes.slice(17, 25),
    new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31])
  );

  // 4. Store symbol data header: 1D 28 6B pL pH 31 50 30
  const dataLen = Buffer.from(qrUrl).length;
  const paramLen = dataLen + 3;
  const expectedPl = paramLen & 0xff;
  const expectedPh = (paramLen >> 8) & 0xff;

  assert.deepEqual(
    bytes.slice(25, 33),
    new Uint8Array([0x1d, 0x28, 0x6b, expectedPl, expectedPh, 0x31, 0x50, 0x30])
  );

  // 5. Print command at the end (8 bytes): 1D 28 6B 03 00 31 51 30
  const printCmd = bytes.slice(bytes.length - 8);
  assert.deepEqual(
    printCmd,
    new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30])
  );
});

test("ESC/POS Builder - Layout formatting helpers (twoColumn, horizontalRule)", () => {
  const builder = new EscPosBuilder();
  builder.horizontalRule("-", 48);
  builder.twoColumn("Subtotal", "RM 100.00", 48);
  const text = new TextDecoder().decode(builder.build());

  const lines = text.split("\n");
  assert.equal(lines[0], "-".repeat(48));
  assert.equal(lines[1].length, 48);
  assert.ok(lines[1].startsWith("Subtotal"));
  assert.ok(lines[1].endsWith("RM 100.00"));
});

test("80mm Tax Receipt Formatter - Full Malaysian receipt with LHDN QR", () => {
  const result = format80mmTaxReceipt({
    outletName: "Nexus Bistro Pavilion",
    companyName: "Nexus F&B Sdn Bhd",
    brn: "202401001234 (1509988-K)",
    sstRegistrationNumber: "W10-2401-32000045",
    tin: "C1234567890",
    addressLine1: "Lot 1.23, Pavilion KL",
    city: "Kuala Lumpur",
    state: "Wilayah Persekutuan",
    postalCode: "55100",
    phoneNumber: "+603-2148-8888",
    orderNumber: "ORD-2026-8812",
    tableNumber: "T-04",
    cashierName: "Ahmad",
    timestamp: "2026-11-09 20:30:00",
    outletType: "FSR",
    orderMode: "DINE_IN",
    items: [
      { name: "Nasi Lemak Ayam Berempah", quantity: 2, unitPrice: 18.0, totalPrice: 36.0 },
      { name: "Teh Tarik Kaw", quantity: 2, unitPrice: 4.5, totalPrice: 9.0 },
    ],
    subtotal: 45.0,
    discountAmount: 0.0,
    discountedSubtotal: 45.0,
    serviceChargeRate: 0.1,
    serviceChargeAmount: 4.5,
    taxableBase: 49.5,
    sstRate: 0.06,
    sstAmount: 2.97,
    packagingFee: 0.0,
    grossPayableAmount: 52.47,
    cashRoundingVariance: 0.03,
    finalPayableAmount: 52.5,
    paymentMethod: "CASH",
    amountTendered: 60.0,
    changeAmount: 7.5,
    lhdnUuid: "LHDN-20261109-A8F2",
    lhdnQrCodeUrl: "https://myinvois.hasil.gov.my/verify/LHDN-20261109-A8F2",
  });

  // Check ASCII representation
  assert.ok(result.formattedText.includes("Nexus Bistro Pavilion"));
  assert.ok(result.formattedText.includes("W10-2401-32000045"));
  assert.ok(result.formattedText.includes("Service Charge (10%)"));
  assert.ok(result.formattedText.includes("Service Tax (SST 6%)"));
  assert.ok(result.formattedText.includes("BNM 5-Sen Cash Rounding"));
  assert.ok(result.formattedText.includes("TOTAL PAYABLE (MYR)"));
  assert.ok(result.formattedText.includes("LHDN MyInvois Verified"));

  // Check binary ESC/POS stream
  assert.ok(result.escposBytes instanceof Uint8Array);
  assert.ok(result.escposBytes.length > 200);
  // Verify init command at start
  assert.equal(result.escposBytes[0], 0x1b);
  assert.equal(result.escposBytes[1], 0x40);
  // Verify partial cut at end
  const cutSlice = result.escposBytes.slice(result.escposBytes.length - 3);
  assert.deepEqual(cutSlice, new Uint8Array([0x1d, 0x56, 0x01]));
});
