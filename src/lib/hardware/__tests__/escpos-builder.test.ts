import { describe, it } from "node:test";
import assert from "node:assert";
import { EscPosBuilder, ESC_POS_BYTES } from "../escpos-builder";

describe("EscPosBuilder (TSK-PRT-01)", () => {
  it("initializes printer with ESC @ bytes", () => {
    const builder = new EscPosBuilder();
    builder.init();
    const bytes = builder.build();
    assert.deepStrictEqual(Array.from(bytes), [0x1b, 0x40]);
  });

  it("sets bold emphasis correctly (ESC E 1 / ESC E 0)", () => {
    const builder = new EscPosBuilder();
    builder.bold(true).bold(false);
    const bytes = builder.build();
    assert.deepStrictEqual(Array.from(bytes), [0x1b, 0x45, 0x01, 0x1b, 0x45, 0x00]);
  });

  it("sets alignments (left, center, right)", () => {
    const builder = new EscPosBuilder();
    builder.align("left").align("center").align("right");
    const bytes = builder.build();
    assert.deepStrictEqual(Array.from(bytes), [
      0x1b, 0x61, 0x00,
      0x1b, 0x61, 0x01,
      0x1b, 0x61, 0x02,
    ]);
  });

  it("sets text sizes via GS ! n", () => {
    const builder = new EscPosBuilder();
    // Normal: 1x1 -> (0 << 4) | 0 = 0x00
    builder.normal();
    // Double height: 1x2 -> (0 << 4) | 1 = 0x01
    builder.doubleHeight();
    // Double width: 2x1 -> (1 << 4) | 0 = 0x10
    builder.doubleWidth();
    // Double both: 2x2 -> (1 << 4) | 1 = 0x11
    builder.doubleSize();

    const bytes = builder.build();
    // normal() emits: SIZE_NORMAL (1D 21 00), BOLD_OFF (1B 45 00), UNDERLINE_NONE (1B 2D 00), INVERT_OFF (1D 42 00)
    // then doubleHeight: 1D 21 01
    // then doubleWidth: 1D 21 10
    // then doubleSize: 1D 21 11
    assert.strictEqual(bytes[0], 0x1d);
    assert.strictEqual(bytes[1], 0x21);
    assert.strictEqual(bytes[2], 0x00);

    const hex = builder.toHex();
    assert.ok(hex.includes("1D 21 01"));
    assert.ok(hex.includes("1D 21 10"));
    assert.ok(hex.includes("1D 21 11"));
  });

  it("triggers partial and full paper cut with feed", () => {
    const builder = new EscPosBuilder();
    builder.cut(true, 3); // feed 3 lines then partial cut (1D 56 01)
    const bytes = builder.build();
    // Feed 3 lines: ESC d 3 -> 1B 64 03
    // Partial cut: GS V 1 -> 1D 56 01
    assert.deepStrictEqual(Array.from(bytes), [0x1b, 0x64, 0x03, 0x1d, 0x56, 0x01]);
  });

  it("generates RJ11 cash drawer solenoid kick pulse (ESC p 0 25 250)", () => {
    const builder = new EscPosBuilder();
    builder.cashDrawer(2, 50, 500); // pin 2, 50ms on (25 * 2ms), 500ms off (250 * 2ms)
    const bytes = builder.build();
    assert.deepStrictEqual(Array.from(bytes), [0x1b, 0x70, 0x00, 0x19, 0xfa]);
  });

  it("generates standard GS ( k Model 2 QR Code with dynamic 16-bit little-endian length", () => {
    // 72-byte URL: 72 + 3 = 75 (0x4B)
    const testUrl = "https://myinvois.hasil.gov.my/uuid-8a7f-4c12-98e3-0d5b7a1234567890/share";
    assert.strictEqual(testUrl.length, 72);

    const builder = new EscPosBuilder();
    builder.qrCode(testUrl, { model: 2, size: 6, errorCorrection: "M" });
    const bytes = builder.build();

    // 1. Model select (Model 2): 1D 28 6B 04 00 31 41 32 00
    assert.strictEqual(bytes[0], 0x1d);
    assert.strictEqual(bytes[1], 0x28);
    assert.strictEqual(bytes[2], 0x6b);
    assert.strictEqual(bytes[3], 0x04);
    assert.strictEqual(bytes[4], 0x00);
    assert.strictEqual(bytes[5], 0x31);
    assert.strictEqual(bytes[6], 0x41);
    assert.strictEqual(bytes[7], 0x32); // '2' -> Model 2
    assert.strictEqual(bytes[8], 0x00);

    // 2. Module size (6 dots): 1D 28 6B 03 00 31 43 06
    assert.strictEqual(bytes[9], 0x1d);
    assert.strictEqual(bytes[10], 0x28);
    assert.strictEqual(bytes[11], 0x6b);
    assert.strictEqual(bytes[12], 0x03);
    assert.strictEqual(bytes[13], 0x00);
    assert.strictEqual(bytes[14], 0x31);
    assert.strictEqual(bytes[15], 0x43);
    assert.strictEqual(bytes[16], 0x06); // size 6

    // 3. Error correction 'M' (0x31): 1D 28 6B 03 00 31 45 31
    assert.strictEqual(bytes[17], 0x1d);
    assert.strictEqual(bytes[18], 0x28);
    assert.strictEqual(bytes[19], 0x6b);
    assert.strictEqual(bytes[20], 0x03);
    assert.strictEqual(bytes[21], 0x00);
    assert.strictEqual(bytes[22], 0x31);
    assert.strictEqual(bytes[23], 0x45);
    assert.strictEqual(bytes[24], 0x31); // 49 = 'M'

    // 4. Store symbol data: 1D 28 6B pL pH 31 50 30 ...
    // Length L = 72 + 3 = 75 (0x4B). pL = 0x4B, pH = 0x00
    assert.strictEqual(bytes[25], 0x1d);
    assert.strictEqual(bytes[26], 0x28);
    assert.strictEqual(bytes[27], 0x6b);
    assert.strictEqual(bytes[28], 0x4b); // pL = 75
    assert.strictEqual(bytes[29], 0x00); // pH = 0
    assert.strictEqual(bytes[30], 0x31);
    assert.strictEqual(bytes[31], 0x50);
    assert.strictEqual(bytes[32], 0x30);

    // 5. Print symbol command at the end: 1D 28 6B 03 00 31 51 30
    const endSlice = Array.from(bytes.slice(bytes.length - 8));
    assert.deepStrictEqual(endSlice, [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
  });

  it("formats two-column lines aligned across width", () => {
    const builder = new EscPosBuilder();
    builder.twoColumn("Subtotal", "RM 45.00", 48);
    const bytes = builder.build();
    const str = new TextDecoder().decode(bytes);
    assert.strictEqual(str, "Subtotal                                RM 45.00\n");
  });
});
