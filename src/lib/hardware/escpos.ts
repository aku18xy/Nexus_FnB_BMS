/**
 * ESC/POS Thermal Receipt Hardware Helper
 * Designed for 80mm standard in-store thermal receipt printers (Epson, Sunmi, Xprinter)
 *
 * Provides backward compatibility with legacy buildReceiptEscPos string output
 * while exposing the binary EscPosBuilder and formatter engines.
 */

export * from "./escpos-builder";
export * from "./tcp-socket";
export * from "./ticket-router";
export * from "./receipt-formatter";
export * from "./cash-drawer";
export * from "./types";

export const ESC_POS_COMMANDS = {
  INIT: "\x1B\x40", // ESC @ - Initialize printer
  ALIGN_LEFT: "\x1B\x61\x00",
  ALIGN_CENTER: "\x1B\x61\x01",
  ALIGN_RIGHT: "\x1B\x61\x02",
  BOLD_ON: "\x1B\x45\x01",
  BOLD_OFF: "\x1B\x45\x00",
  DOUBLE_HEIGHT: "\x1B\x21\x10",
  DOUBLE_WIDTH: "\x1B\x21\x20",
  NORMAL_TEXT: "\x1B\x21\x00",
  PAPER_CUT_PARTIAL: "\x1D\x56\x01", // GS V 1
  PAPER_CUT_FULL: "\x1D\x56\x00", // GS V 0
  DRAWER_KICK_PIN2: "\x1B\x70\x00\x19\xFA", // ESC p 0 25 250 - Kick drawer pin 2
  FEED_LINES: (n: number) => `\x1B\x64${String.fromCharCode(n)}`,
};

export interface LegacyReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface LegacyReceiptData {
  outletName: string;
  sstNumber?: string;
  brn: string;
  orderNumber: string;
  tokenNumber?: string;
  tableNumber?: string;
  cashierName: string;
  items: LegacyReceiptItem[];
  subtotal: number;
  serviceCharge: number;
  sst: number;
  cashRoundingVariance: number;
  total: number;
  paymentMethod: string;
  lhdnUuid?: string;
  lhdnQrCodeUrl?: string;
  timestamp: string;
}

/**
 * Builds an 80mm ESC/POS raw string representation (legacy compatibility)
 */
export function buildReceiptEscPos(data: LegacyReceiptData): string {
  const LINE_WIDTH = 48; // Standard 80mm 48-char width in Font A
  const hr = "-".repeat(LINE_WIDTH);
  const doubleHr = "=".repeat(LINE_WIDTH);

  let output = "";
  output += ESC_POS_COMMANDS.INIT;

  // Header
  output += ESC_POS_COMMANDS.ALIGN_CENTER;
  output += ESC_POS_COMMANDS.BOLD_ON;
  output += `${data.outletName}\n`;
  output += ESC_POS_COMMANDS.BOLD_OFF;
  output += `SSM Reg No: ${data.brn}\n`;
  if (data.sstNumber) {
    output += `SST Reg No: ${data.sstNumber}\n`;
  }
  output += `${doubleHr}\n`;

  // Meta
  output += ESC_POS_COMMANDS.ALIGN_LEFT;
  output += `Order: ${data.orderNumber}\n`;
  if (data.tokenNumber) {
    output += ESC_POS_COMMANDS.BOLD_ON;
    output += `Queue Token: #${data.tokenNumber}\n`;
    output += ESC_POS_COMMANDS.BOLD_OFF;
  }
  if (data.tableNumber) {
    output += `Table: ${data.tableNumber}\n`;
  }
  output += `Cashier: ${data.cashierName}\n`;
  output += `Date: ${data.timestamp}\n`;
  output += `${hr}\n`;

  // Line Items
  data.items.forEach((item) => {
    const left = `${item.quantity}x ${item.name}`;
    const right = `RM ${item.price.toFixed(2)}`;
    const spaces = Math.max(1, LINE_WIDTH - left.length - right.length);
    output += `${left}${" ".repeat(spaces)}${right}\n`;
  });
  output += `${hr}\n`;

  // Summary
  const addSummaryRow = (label: string, amount: number) => {
    const right = `RM ${amount.toFixed(2)}`;
    const spaces = Math.max(1, LINE_WIDTH - label.length - right.length);
    return `${label}${" ".repeat(spaces)}${right}\n`;
  };

  output += addSummaryRow("Subtotal", data.subtotal);
  if (data.serviceCharge > 0) {
    output += addSummaryRow("Service Charge (10%)", data.serviceCharge);
  }
  output += addSummaryRow("Service Tax (SST 6%)", data.sst);
  if (data.cashRoundingVariance !== 0) {
    output += addSummaryRow("BNM 5-Sen Cash Rounding", data.cashRoundingVariance);
  }

  output += ESC_POS_COMMANDS.BOLD_ON;
  output += addSummaryRow("TOTAL PAYABLE", data.total);
  output += ESC_POS_COMMANDS.BOLD_OFF;
  output += `Payment: ${data.paymentMethod}\n`;

  // LHDN e-Invoice validation info if present
  if (data.lhdnUuid) {
    output += `${doubleHr}\n`;
    output += ESC_POS_COMMANDS.ALIGN_CENTER;
    output += "LHDN MyInvois Verified\n";
    output += `UUID: ${data.lhdnUuid}\n`;
  }

  output += `${doubleHr}\n`;
  output += ESC_POS_COMMANDS.ALIGN_CENTER;
  output += "Thank You! Please Come Again.\n";
  output += "Terima Kasih!\n";

  // Feed & Cut
  output += ESC_POS_COMMANDS.FEED_LINES(4);
  output += ESC_POS_COMMANDS.PAPER_CUT_PARTIAL;

  return output;
}
