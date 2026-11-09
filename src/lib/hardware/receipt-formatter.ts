/**
 * 80mm Tax Receipt Formatter (TSK-PRT-03)
 * Nexus FnB BMS (Malaysia Edition)
 *
 * Generates standard 48-character width 80mm customer thermal receipts
 * strictly complying with Malaysian Customs (JKDM) and LHDN MyInvois standards.
 *
 * Features:
 * - Outlet Header with SSM BRN, JKDM SST ID, and LHDN TIN
 * - B2B Buyer details block (Buyer TIN & BRN) for tax-deductible commercial invoices
 * - Clean line-wrapping for long menu item descriptions preventing price column misalignment
 * - Cascading 10% Service Charge (FSR) and 6% SST calculation
 * - Bank Negara Malaysia (BNM) 5-sen cash rounding adjustment (strictly for CASH)
 * - Dynamic 2D ESC/POS QR Code (GS ( k) linking directly to LHDN MyInvois verification URL
 * - Dual output: Formatted human-readable ASCII text & pure binary ESC/POS Uint8Array
 */

import { EscPosBuilder } from "./escpos-builder";
import { FormattedReceiptResult, TaxReceiptData } from "./types";

const DEFAULT_LINE_WIDTH = 48; // Standard 80mm Font A width

/**
 * Format currency amount to 2 decimal places: e.g. "45.00"
 */
function fmtMoney(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Center a string within given line width
 */
function centerLine(text: string, width = DEFAULT_LINE_WIDTH): string {
  if (text.length >= width) return text;
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(pad) + text;
}

/**
 * Format a two-column row with left label and right value aligned to exact line width
 */
function twoColumnLine(left: string, right: string, width = DEFAULT_LINE_WIDTH): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(spaces) + right;
}

/**
 * Wrap item name across multiple lines if it exceeds column width
 */
function wrapItemName(name: string, maxLen: number): string[] {
  if (name.length <= maxLen) return [name];

  const words = name.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxLen) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Formats a complete 80mm tax receipt into human-readable ASCII text and binary ESC/POS bytes.
 */
export function format80mmTaxReceipt(data: TaxReceiptData): FormattedReceiptResult {
  const width = data.paperWidth ?? DEFAULT_LINE_WIDTH;
  const hr = "-".repeat(width);
  const doubleHr = "=".repeat(width);

  const textLines: string[] = [];
  const builder = new EscPosBuilder();

  // Initialize printer
  builder.init();

  // Cash drawer kick pulse if requested for cash payment
  if (data.openCashDrawer && data.paymentMethod === "CASH") {
    builder.cashDrawer(2, 50, 500);
  }

  // ==========================================
  // 1. OUTLET / SELLER HEADER
  // ==========================================
  builder.align("center");
  builder.bold(true);
  builder.size(2, 2); // Double size header for outlet name
  builder.line(data.outletName);
  builder.normal();
  builder.align("center");

  textLines.push(centerLine(data.outletName, width));

  if (data.companyName && data.companyName !== data.outletName) {
    builder.line(data.companyName);
    textLines.push(centerLine(data.companyName, width));
  }

  // SSM Business Registration Number (BRN)
  const brnText = `SSM Reg No: ${data.brn}`;
  builder.line(brnText);
  textLines.push(centerLine(brnText, width));

  // JKDM SST Registration Number
  if (data.sstRegistrationNumber) {
    const sstText = `SST Reg No: ${data.sstRegistrationNumber}`;
    builder.line(sstText);
    textLines.push(centerLine(sstText, width));
  }

  // LHDN Tax Identification Number (TIN)
  if (data.tin) {
    const tinText = `TIN: ${data.tin}`;
    builder.line(tinText);
    textLines.push(centerLine(tinText, width));
  }

  // Address & Contacts
  builder.line(data.addressLine1);
  textLines.push(centerLine(data.addressLine1, width));
  if (data.addressLine2) {
    builder.line(data.addressLine2);
    textLines.push(centerLine(data.addressLine2, width));
  }
  const cityStatePost = `${data.postalCode} ${data.city}, ${data.state}`;
  builder.line(cityStatePost);
  textLines.push(centerLine(cityStatePost, width));

  if (data.phoneNumber) {
    const phoneText = `Tel: ${data.phoneNumber}`;
    builder.line(phoneText);
    textLines.push(centerLine(phoneText, width));
  }

  // Halal Certification info if present
  if (data.halalCertNumber) {
    const halalText = `JAKIM Halal: ${data.halalCertNumber}`;
    builder.line(halalText);
    textLines.push(centerLine(halalText, width));
  }

  builder.doubleHorizontalRule("=", width);
  textLines.push(doubleHr);

  // ==========================================
  // 2. INVOICE & ORDER METADATA
  // ==========================================
  const invoiceTypeTitle =
    data.invoiceType === "TAX_INVOICE"
      ? "TAX INVOICE"
      : data.invoiceType === "CREDIT_NOTE"
      ? "CREDIT NOTE"
      : "SIMPLIFIED TAX INVOICE";

  builder.bold(true);
  builder.line(invoiceTypeTitle);
  builder.bold(false);
  builder.align("left");

  textLines.push(centerLine(invoiceTypeTitle, width));
  textLines.push(hr);
  builder.horizontalRule("-", width);

  const receiptNo = data.receiptNumber || `INV-${data.orderNumber}`;
  const invLine = twoColumnLine(`Invoice No: ${receiptNo}`, data.orderMode, width);
  builder.line(invLine);
  textLines.push(invLine);

  const dateStaffLine = twoColumnLine(`Date: ${data.timestamp}`, `Cashier: ${data.cashierName}`, width);
  builder.line(dateStaffLine);
  textLines.push(dateStaffLine);

  if (data.tokenNumber) {
    builder.bold(true);
    builder.size(1, 2);
    const tokenLine = `Queue Token: #${data.tokenNumber}`;
    builder.line(tokenLine);
    builder.normal();
    textLines.push(tokenLine);
  }

  if (data.tableNumber) {
    const paxStr = data.paxCount ? ` (${data.paxCount} Pax)` : "";
    const tableLine = `Table: ${data.tableNumber}${paxStr}`;
    builder.line(tableLine);
    textLines.push(tableLine);
  }

  // ==========================================
  // 3. B2B BUYER DETAILS BLOCK (if provided)
  // ==========================================
  if (data.buyer) {
    builder.horizontalRule("-", width);
    textLines.push(hr);

    builder.bold(true);
    builder.line("BUYER / CUSTOMER DETAILS:");
    builder.bold(false);
    textLines.push("BUYER / CUSTOMER DETAILS:");

    const buyerNameLine = `Name: ${data.buyer.buyerName}`;
    builder.line(buyerNameLine);
    textLines.push(buyerNameLine);

    const buyerTinLine = `TIN:  ${data.buyer.buyerTin}`;
    builder.line(buyerTinLine);
    textLines.push(buyerTinLine);

    if (data.buyer.buyerBrn) {
      const buyerBrnLine = `BRN:  ${data.buyer.buyerBrn}`;
      builder.line(buyerBrnLine);
      textLines.push(buyerBrnLine);
    }
    if (data.buyer.buyerSst) {
      const buyerSstLine = `SST:  ${data.buyer.buyerSst}`;
      builder.line(buyerSstLine);
      textLines.push(buyerSstLine);
    }
  }

  builder.doubleHorizontalRule("=", width);
  textLines.push(doubleHr);

  // ==========================================
  // 4. LINE ITEMS
  // ==========================================
  // Header row: QTY DESCRIPTION / AMOUNT (MYR)
  const itemHeader = twoColumnLine("QTY  DESCRIPTION", "AMOUNT (MYR)", width);
  builder.bold(true);
  builder.line(itemHeader);
  builder.bold(false);
  builder.horizontalRule("-", width);

  textLines.push(itemHeader);
  textLines.push(hr);

  const priceColWidth = 10; // e.g. "   1234.56"
  const descColWidth = width - priceColWidth - 1;

  for (const item of data.items) {
    const qtyStr = `${item.quantity}x `.padEnd(5);
    const priceStr = fmtMoney(item.totalPrice).padStart(priceColWidth);

    const fullDesc = item.name;
    const availableDescWidth = descColWidth - 5;
    const descLines = wrapItemName(fullDesc, availableDescWidth);

    // First line with Qty + First desc line + Price
    const firstLine = `${qtyStr}${descLines[0]}`.padEnd(width - priceColWidth) + priceStr;
    builder.line(firstLine);
    textLines.push(firstLine);

    // Subsequent wrapped description lines
    for (let i = 1; i < descLines.length; i++) {
      const contLine = "     " + descLines[i];
      builder.line(contLine);
      textLines.push(contLine);
    }

    // Modifiers if any
    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        const modPriceStr = mod.priceDelta > 0 ? fmtMoney(mod.priceDelta).padStart(priceColWidth) : "";
        const modName = `  + ${mod.name}`;
        const modLine = modPriceStr
          ? modName.padEnd(width - priceColWidth) + modPriceStr
          : modName;
        builder.line(modLine);
        textLines.push(modLine);
      }
    }

    // Notes if any
    if (item.notes) {
      const noteLine = `  * ${item.notes}`;
      builder.line(noteLine);
      textLines.push(noteLine);
    }
  }

  builder.horizontalRule("-", width);
  textLines.push(hr);

  // ==========================================
  // 5. TOTALS & STATUTORY TAX BREAKDOWN
  // ==========================================
  const addSummaryRow = (label: string, amount: number, isNegative = false) => {
    const prefix = isNegative ? "-RM " : " RM ";
    const right = `${prefix}${fmtMoney(Math.abs(amount))}`;
    const row = twoColumnLine(label, right, width);
    builder.line(row);
    textLines.push(row);
  };

  // Subtotal
  addSummaryRow("Subtotal", data.subtotal);

  // Discount
  if (data.discountAmount && data.discountAmount > 0) {
    addSummaryRow("Discount", data.discountAmount, true);
    addSummaryRow("Discounted Subtotal", data.discountedSubtotal);
  }

  // 10% Service Charge (FSR)
  if (data.serviceChargeAmount > 0) {
    const scPercent = Math.round(data.serviceChargeRate * 100);
    addSummaryRow(`Service Charge (${scPercent}%)`, data.serviceChargeAmount);
  }

  // 6% Service Tax (SST)
  if (data.sstAmount > 0) {
    const sstPercent = Math.round(data.sstRate * 100);
    addSummaryRow(`Service Tax (SST ${sstPercent}%)`, data.sstAmount);
  }

  // Packaging Fee (QSR Takeaway)
  if (data.packagingFee && data.packagingFee > 0) {
    addSummaryRow("Takeaway Packaging Fee", data.packagingFee);
  }

  // Bank Negara Malaysia (BNM) 5-Sen Cash Rounding Adjustment
  if (data.paymentMethod === "CASH" && data.cashRoundingVariance !== 0) {
    const sign = data.cashRoundingVariance > 0 ? "+RM " : "-RM ";
    const varianceStr = `${sign}${fmtMoney(Math.abs(data.cashRoundingVariance))}`;
    const roundingRow = twoColumnLine("BNM 5-Sen Cash Rounding", varianceStr, width);
    builder.line(roundingRow);
    textLines.push(roundingRow);
  }

  builder.doubleHorizontalRule("=", width);
  textLines.push(doubleHr);

  // TOTAL PAYABLE (Emphasized)
  builder.bold(true);
  builder.size(1, 2); // Double height for grand total
  const totalLine = twoColumnLine("TOTAL PAYABLE (MYR)", `RM ${fmtMoney(data.finalPayableAmount)}`, width);
  builder.line(totalLine);
  builder.normal();

  textLines.push(twoColumnLine("TOTAL PAYABLE (MYR)", `RM ${fmtMoney(data.finalPayableAmount)}`, width));
  textLines.push(doubleHr);
  builder.doubleHorizontalRule("=", width);

  // ==========================================
  // 6. PAYMENT TENDER & CHANGE
  // ==========================================
  const methodLine = twoColumnLine("Payment Method:", data.paymentMethod.replace("_", " "), width);
  builder.line(methodLine);
  textLines.push(methodLine);

  if (data.amountTendered !== undefined) {
    addSummaryRow("Amount Tendered:", data.amountTendered);
  }
  if (data.changeAmount !== undefined) {
    addSummaryRow("Change Due:", data.changeAmount);
  }

  // ==========================================
  // 7. SST TAX SUMMARY BOX (JKDM REQUIREMENT)
  // ==========================================
  builder.horizontalRule("-", width);
  textLines.push(hr);

  const taxBoxTitle = centerLine("[ SST SUMMARY (JKDM) ]", width);
  builder.line(taxBoxTitle);
  textLines.push(taxBoxTitle);

  const taxBoxHeader = twoColumnLine("Rate %   |   Taxable Base", "Tax Amount", width);
  builder.line(taxBoxHeader);
  textLines.push(taxBoxHeader);

  const sstSummaryRow = twoColumnLine(
    `SST 6%   |   RM ${fmtMoney(data.taxableBase)}`,
    `RM ${fmtMoney(data.sstAmount)}`,
    width
  );
  builder.line(sstSummaryRow);
  textLines.push(sstSummaryRow);

  builder.horizontalRule("-", width);
  textLines.push(hr);

  // ==========================================
  // 8. LHDN MYINVOIS VERIFICATION & QR CODE
  // ==========================================
  const lhdnQrUrl =
    data.lhdnQrCodeUrl ||
    (data.lhdnUuid ? `https://myinvois.hasil.gov.my/${data.lhdnUuid}/share` : undefined);

  if (data.lhdnUuid || lhdnQrUrl) {
    builder.align("center");
    builder.bold(true);
    const lhdnHeader = "*** LHDN MyInvois Verified ***";
    builder.line(lhdnHeader);
    builder.bold(false);
    textLines.push(centerLine(lhdnHeader, width));

    if (data.lhdnUuid) {
      const uuidLine = `UUID: ${data.lhdnUuid}`;
      builder.line(uuidLine);
      textLines.push(centerLine(uuidLine, width));
    }
    if (data.lhdnValidatedAt) {
      const valLine = `Validated: ${data.lhdnValidatedAt}`;
      builder.line(valLine);
      textLines.push(centerLine(valLine, width));
    }

    if (lhdnQrUrl) {
      // Embed scannable Model 2 QR code in print stream
      builder.feed(1);
      builder.qrCode(lhdnQrUrl, { model: 2, size: 5, errorCorrection: "M" });
      builder.feed(1);

      textLines.push(centerLine("[ LHDN MyInvois QR Code ]", width));
      textLines.push(centerLine("Scan QR to verify e-Invoice with LHDN", width));
    }

    builder.doubleHorizontalRule("=", width);
    textLines.push(doubleHr);
  } else if (data.isConsolidatedBatch) {
    builder.align("center");
    const b2cNote = "[ B2C Retail Receipt - Consolidated LHDN Monthly ]";
    builder.line(b2cNote);
    builder.doubleHorizontalRule("=", width);
    textLines.push(centerLine(b2cNote, width));
    textLines.push(doubleHr);
  }

  // ==========================================
  // 9. CLOSING GREETING & CUT
  // ==========================================
  builder.align("center");
  builder.line("Thank You! Please Come Again.");
  builder.line("Terima Kasih!");
  builder.feed(1);

  textLines.push(centerLine("Thank You! Please Come Again.", width));
  textLines.push(centerLine("Terima Kasih!", width));

  // Partial paper cut
  if (data.printCut !== false) {
    builder.cut(true, 3);
  }

  const formattedText = textLines.join("\n");
  const escposBytes = builder.build();

  return {
    receiptNumber: receiptNo,
    formattedText,
    escposBytes,
    lineWidth: width,
    lineCount: textLines.length,
    byteLength: escposBytes.byteLength,
    hasLhdnQr: Boolean(lhdnQrUrl),
  };
}
