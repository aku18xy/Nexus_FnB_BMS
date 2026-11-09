/**
 * ESC/POS Binary Command Builder
 * Produces pure Uint8Array byte sequences conforming to Epson ESC/POS specifications.
 * Designed for 80mm and 58mm thermal receipt and kitchen printers (Epson, Sunmi, Xprinter, Star, Bixolon).
 */

import {
  EscPosAlignment,
  EscPosBarcodeOptions,
  EscPosQrCodeOptions,
  EscPosTextScale,
} from "./types";

// Constant command byte tuples
export const ESC = 0x1b;
export const FS = 0x1c;
export const GS = 0x1d;
export const DLE = 0x10;
export const EOT = 0x04;

export const ESC_POS_BYTES = {
  // Initialization
  INIT: new Uint8Array([ESC, 0x40]), // ESC @

  // Text formatting
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]), // ESC E 0

  UNDERLINE_NONE: new Uint8Array([ESC, 0x2d, 0x00]), // ESC - 0
  UNDERLINE_1DOT: new Uint8Array([ESC, 0x2d, 0x01]), // ESC - 1
  UNDERLINE_2DOT: new Uint8Array([ESC, 0x2d, 0x02]), // ESC - 2

  INVERT_ON: new Uint8Array([GS, 0x42, 0x01]), // GS B 1
  INVERT_OFF: new Uint8Array([GS, 0x42, 0x00]), // GS B 0

  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]), // ESC a 2

  // Sizing via GS !
  SIZE_NORMAL: new Uint8Array([GS, 0x21, 0x00]), // GS ! 0
  SIZE_DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x01]), // GS ! 1
  SIZE_DOUBLE_WIDTH: new Uint8Array([GS, 0x21, 0x10]), // GS ! 16
  SIZE_DOUBLE_BOTH: new Uint8Array([GS, 0x21, 0x11]), // GS ! 17 (2x width, 2x height)

  // Paper cutting
  CUT_FULL: new Uint8Array([GS, 0x56, 0x00]), // GS V 0
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x01]), // GS V 1
  CUT_FULL_FEED: (feedLines = 3) => new Uint8Array([GS, 0x56, 0x41, feedLines]), // GS V 65 n
  CUT_PARTIAL_FEED: (feedLines = 3) => new Uint8Array([GS, 0x56, 0x42, feedLines]), // GS V 66 n

  // Cash Drawer Pulse (24V RJ11)
  // ESC p m t1 t2: m=0 (pin 2) or 1 (pin 5), t1=on time (x 2ms), t2=off time (x 2ms)
  DRAWER_PIN2_PULSE: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]), // ESC p 0 25 250 (50ms on, 500ms off)
  DRAWER_PIN5_PULSE: new Uint8Array([ESC, 0x70, 0x01, 0x19, 0xfa]), // ESC p 1 25 250
  DRAWER_REALTIME_PULSE: new Uint8Array([DLE, 0x14, 0x01, 0x00, 0x05]), // DLE DC4 1 0 5

  // Line feeds
  LF: new Uint8Array([0x0a]),
  FEED_LINES: (n: number) => new Uint8Array([ESC, 0x64, Math.min(Math.max(0, n), 255)]), // ESC d n
};

/**
 * EscPosBuilder provides a fluent interface for composing raw ESC/POS byte commands.
 */
export class EscPosBuilder {
  private chunks: Uint8Array[] = [];
  private encoder: TextEncoder;

  constructor() {
    this.encoder = new TextEncoder();
  }

  /**
   * Append raw byte sequence
   */
  public append(bytes: Uint8Array | number[]): this {
    if (bytes instanceof Uint8Array) {
      this.chunks.push(bytes);
    } else {
      this.chunks.push(new Uint8Array(bytes));
    }
    return this;
  }

  /**
   * Hardware initialization (ESC @)
   * Resets printer settings, clear buffer, return to default font/spacing.
   */
  public init(): this {
    return this.append(ESC_POS_BYTES.INIT);
  }

  /**
   * Set text alignment (left, center, right)
   */
  public align(alignment: EscPosAlignment): this {
    switch (alignment) {
      case "center":
        return this.append(ESC_POS_BYTES.ALIGN_CENTER);
      case "right":
        return this.append(ESC_POS_BYTES.ALIGN_RIGHT);
      case "left":
      default:
        return this.append(ESC_POS_BYTES.ALIGN_LEFT);
    }
  }

  /**
   * Set bold / emphasized text mode (ESC E n)
   */
  public bold(enable = true): this {
    return this.append(enable ? ESC_POS_BYTES.BOLD_ON : ESC_POS_BYTES.BOLD_OFF);
  }

  /**
   * Set underline mode (ESC - n)
   */
  public underline(mode: boolean | 1 | 2 = true): this {
    if (!mode) {
      return this.append(ESC_POS_BYTES.UNDERLINE_NONE);
    }
    if (mode === 2) {
      return this.append(ESC_POS_BYTES.UNDERLINE_2DOT);
    }
    return this.append(ESC_POS_BYTES.UNDERLINE_1DOT);
  }

  /**
   * Set reverse / inverted white-on-black text mode (GS B n)
   */
  public invert(enable = true): this {
    return this.append(enable ? ESC_POS_BYTES.INVERT_ON : ESC_POS_BYTES.INVERT_OFF);
  }

  /**
   * Set font size multiplier (1-8 width, 1-8 height) using GS ! n
   */
  public size(widthScale: EscPosTextScale = 1, heightScale: EscPosTextScale = 1): this {
    const clampedW = Math.max(1, Math.min(8, widthScale));
    const clampedH = Math.max(1, Math.min(8, heightScale));
    const n = ((clampedW - 1) << 4) | (clampedH - 1);
    return this.append(new Uint8Array([GS, 0x21, n]));
  }

  /**
   * Reset font size and decorations to normal standard Font A
   */
  public normal(): this {
    this.append(ESC_POS_BYTES.SIZE_NORMAL);
    this.append(ESC_POS_BYTES.BOLD_OFF);
    this.append(ESC_POS_BYTES.UNDERLINE_NONE);
    this.append(ESC_POS_BYTES.INVERT_OFF);
    return this;
  }

  /**
   * Double width & double height preset
   */
  public doubleSize(): this {
    return this.append(ESC_POS_BYTES.SIZE_DOUBLE_BOTH);
  }

  /**
   * Double height preset
   */
  public doubleHeight(): this {
    return this.append(ESC_POS_BYTES.SIZE_DOUBLE_HEIGHT);
  }

  /**
   * Double width preset
   */
  public doubleWidth(): this {
    return this.append(ESC_POS_BYTES.SIZE_DOUBLE_WIDTH);
  }

  /**
   * Write UTF-8 string without trailing newline
   */
  public text(str: string): this {
    if (str) {
      this.chunks.push(this.encoder.encode(str));
    }
    return this;
  }

  /**
   * Write text followed by newline (0x0A)
   */
  public line(str = ""): this {
    if (str) {
      this.text(str);
    }
    this.append(ESC_POS_BYTES.LF);
    return this;
  }

  /**
   * Feed n blank lines (ESC d n)
   */
  public feed(lines = 1): this {
    if (lines <= 0) return this;
    if (lines === 1) {
      return this.append(ESC_POS_BYTES.LF);
    }
    return this.append(ESC_POS_BYTES.FEED_LINES(lines));
  }

  /**
   * Trigger paper cut (partial or full)
   */
  public cut(partial = true, feedLines = 3): this {
    if (feedLines > 0) {
      this.feed(feedLines);
    }
    return this.append(partial ? ESC_POS_BYTES.CUT_PARTIAL : ESC_POS_BYTES.CUT_FULL);
  }

  /**
   * Generate 24V RJ11 Solenoid pulse to kick open cash drawer (ESC p m t1 t2)
   * @param pin 2 or 5 (RJ11 pin, default 2)
   * @param onMs Pulse ON duration in milliseconds (default 50ms)
   * @param offMs Pulse OFF duration in milliseconds (default 500ms)
   */
  public cashDrawer(pin: 2 | 5 = 2, onMs = 50, offMs = 500): this {
    const m = pin === 5 ? 1 : 0;
    const t1 = Math.min(255, Math.max(1, Math.round(onMs / 2))); // Units of 2ms
    const t2 = Math.min(255, Math.max(1, Math.round(offMs / 2)));
    return this.append(new Uint8Array([ESC, 0x70, m, t1, t2]));
  }

  /**
   * Real-time cash drawer kick pulse (DLE DC4)
   */
  public cashDrawerRealtime(): this {
    return this.append(ESC_POS_BYTES.DRAWER_REALTIME_PULSE);
  }

  /**
   * Standard ESC/POS 2D QR Code generator using GS ( k command sequences conforming to Model 2
   * Sequence:
   * 1. Function 165: Select QR code model (Model 2) -> 1D 28 6B 04 00 31 41 32 00
   * 2. Function 167: Set QR code module size (dots) -> 1D 28 6B 03 00 31 43 <size>
   * 3. Function 169: Set error correction level -> 1D 28 6B 03 00 31 45 <level>
   * 4. Function 180: Store symbol data in storage area -> 1D 28 6B <pL> <pH> 31 50 30 <data>
   * 5. Function 181: Print symbol data from storage area -> 1D 28 6B 03 00 31 51 30
   *
   * Dynamic 16-bit little-endian length calculation:
   * Total param length L = dataBytes.length + 3
   * pL = L & 0xFF, pH = (L >> 8) & 0xFF
   */
  public qrCode(data: string, options?: EscPosQrCodeOptions): this {
    if (!data) return this;

    const dataBytes = this.encoder.encode(data);
    const model = options?.model === 1 ? 49 : 50; // 49=Model 1, 50=Model 2 (0x32)
    const size = Math.min(16, Math.max(1, options?.size ?? 6));

    // EC Level: L=48 (0x30), M=49 (0x31), Q=50 (0x32), H=51 (0x33)
    let ecByte = 49; // Default 'M' (15%)
    switch (options?.errorCorrection) {
      case "L":
        ecByte = 48; // 7%
        break;
      case "Q":
        ecByte = 50; // 25%
        break;
      case "H":
        ecByte = 51; // 30%
        break;
      case "M":
      default:
        ecByte = 49;
        break;
    }

    // 1. Select Model
    this.append(new Uint8Array([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, model, 0x00]));

    // 2. Set Module Size
    this.append(new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]));

    // 3. Set Error Correction Level
    this.append(new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ecByte]));

    // 4. Store symbol data (fn 80)
    // Length L = dataBytes.length + 3 (for cn=0x31, fn=0x50, m=0x30)
    const paramLength = dataBytes.length + 3;
    const pL = paramLength & 0xff;
    const pH = (paramLength >> 8) & 0xff;

    const storeHeader = new Uint8Array([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]);
    this.append(storeHeader);
    this.append(dataBytes);

    // 5. Print symbol (fn 81)
    this.append(new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));

    return this;
  }

  /**
   * 1D Barcode Generator (GS k)
   * Supports CODE128, EAN13, CODE39
   */
  public barcode(data: string, options?: EscPosBarcodeOptions): this {
    if (!data) return this;

    const width = Math.min(6, Math.max(2, options?.width ?? 3));
    const height = Math.min(255, Math.max(1, options?.height ?? 64));

    // Set barcode width (GS w n)
    this.append(new Uint8Array([GS, 0x77, width]));
    // Set barcode height (GS h n)
    this.append(new Uint8Array([GS, 0x68, height]));

    // Set HRI characters print position (GS H n: 0=none, 1=above, 2=below, 3=both)
    let hri = 0;
    if (options?.hriPosition === "above") hri = 1;
    else if (options?.hriPosition === "below") hri = 2;
    else if (options?.hriPosition === "both") hri = 3;
    this.append(new Uint8Array([GS, 0x48, hri]));

    const system = options?.system ?? "CODE128";
    const dataBytes = this.encoder.encode(data);

    // Format B commands (GS k m n d1...dn)
    let m = 0x49; // CODE128
    if (system === "EAN13") m = 0x43;
    else if (system === "CODE39") m = 0x45;
    else if (system === "EAN8") m = 0x44;

    this.append(new Uint8Array([GS, 0x6b, m, dataBytes.length]));
    this.append(dataBytes);

    return this;
  }

  /**
   * Horizontal divider rule (e.g. "------------------------------------------------")
   */
  public horizontalRule(char = "-", width = 48): this {
    return this.line(char.repeat(width));
  }

  /**
   * Double horizontal rule (e.g. "================================================")
   */
  public doubleHorizontalRule(char = "=", width = 48): this {
    return this.line(char.repeat(width));
  }

  /**
   * Two-column aligned row with left and right alignment within designated character width
   */
  public twoColumn(left: string, right: string, totalWidth = 48): this {
    const spacesCount = Math.max(1, totalWidth - left.length - right.length);
    return this.line(left + " ".repeat(spacesCount) + right);
  }

  /**
   * Three-column aligned row (e.g. item, qty, price)
   */
  public threeColumn(col1: string, col2: string, col3: string, totalWidth = 48): this {
    const col2Width = Math.max(4, Math.floor(totalWidth * 0.15));
    const col3Width = Math.max(8, Math.floor(totalWidth * 0.25));
    const col1Width = totalWidth - col2Width - col3Width;

    const c1 = col1.length > col1Width ? col1.substring(0, col1Width - 1) + " " : col1.padEnd(col1Width);
    const c2 = col2.padStart(col2Width);
    const c3 = col3.padStart(col3Width);

    return this.line(c1 + c2 + c3);
  }

  /**
   * Get total byte length of all buffered chunks
   */
  public get length(): number {
    return this.chunks.reduce((acc, c) => acc + c.byteLength, 0);
  }

  /**
   * Build final concatenated Uint8Array byte sequence
   */
  public build(): Uint8Array {
    const totalLength = this.length;
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  /**
   * Output as Node.js Buffer for network transmissions
   */
  public toBuffer(): Buffer {
    return Buffer.from(this.build().buffer);
  }

  /**
   * Convert buffer to uppercase Hex string for logging or debugging
   */
  public toHex(): string {
    const bytes = this.build();
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
  }
}
