/**
 * Hardware IoT & Thermal Driver Type Definitions
 * Nexus FnB BMS (Malaysia Edition)
 */

import { KitchenStation, MenuCategory } from "./menu";
import { PaymentMethod } from "./tax";
import { OutletType } from "./outlet";

/**
 * Text alignment options in ESC/POS
 */
export type EscPosAlignment = "left" | "center" | "right";

/**
 * Text size multiplier (1 to 8)
 */
export type EscPosTextScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * QR Code Error Correction Level for ESC/POS GS ( k
 */
export type QrCodeErrorCorrection = "L" | "M" | "Q" | "H";

/**
 * Options for ESC/POS QR code generation
 */
export interface EscPosQrCodeOptions {
  model?: 1 | 2; // Default: 2 (Model 2)
  size?: number; // Module size in dots (1-16, default: 6)
  errorCorrection?: QrCodeErrorCorrection; // Default: 'M'
}

/**
 * Options for Barcode generation
 */
export type BarcodeSystem = "UPC-A" | "UPC-E" | "EAN13" | "EAN8" | "CODE39" | "ITF" | "CODABAR" | "CODE93" | "CODE128";

export interface EscPosBarcodeOptions {
  system?: BarcodeSystem;
  width?: number; // 2 to 6
  height?: number; // 1 to 255 dots
  hriPosition?: "none" | "above" | "below" | "both";
}

/**
 * Thermal Printer Connection Configuration
 */
export interface PrinterConfig {
  id?: string;
  name?: string;
  host: string;
  port?: number; // Default: 9100
  timeoutMs?: number; // Default: 5000ms
  paperWidth?: number; // Characters per line, default: 48 (80mm)
  simulation?: boolean; // Headless simulation mode
  retries?: number; // Number of reconnect attempts
}

/**
 * Result of socket print transmission
 */
export interface SocketTransmissionResult {
  success: boolean;
  bytesWritten: number;
  durationMs: number;
  host: string;
  port: number;
  simulated?: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Canonical Kitchen Routing Stations
 */
export type TargetKitchenStation = "HOT_KITCHEN" | "COLD_PREP" | "DRINK_BAR" | "PASTRY_DESSERT";

/**
 * Station Printer Mapping Configuration
 */
export interface KitchenStationMapping {
  station: TargetKitchenStation;
  displayName: string;
  printer: PrinterConfig;
  backupPrinter?: PrinterConfig;
  categories: MenuCategory[];
  kitchenStations: KitchenStation[];
  enabled: boolean;
}

/**
 * Line item on a ticket
 */
export interface KitchenTicketItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  modifiers?: Array<{ name: string; priceDelta?: number }>;
  kitchenStation: KitchenStation | TargetKitchenStation | string;
  category?: MenuCategory | string;
  course?: "DRINKS" | "APPETIZER" | "MAINS" | "DESSERT";
}

/**
 * Formatted Kitchen Ticket for a specific station
 */
export interface StationKitchenTicket {
  ticketId: string;
  orderId: string;
  orderNumber: string;
  tokenNumber?: string;
  tableNumber?: string;
  outletId?: string;
  outletName?: string;
  outletType: OutletType;
  station: TargetKitchenStation;
  stationDisplayName: string;
  printer: PrinterConfig;
  items: KitchenTicketItem[];
  totalItemCount: number;
  orderNotes?: string;
  serverName?: string;
  timestamp: string;
  isReprint?: boolean;
  rawText: string;
  escposBytes: Uint8Array;
}

/**
 * Multi-Station Routing Result
 */
export interface TicketRoutingResult {
  orderId: string;
  orderNumber: string;
  totalTicketsDispatched: number;
  tickets: StationKitchenTicket[];
  unroutedItems: KitchenTicketItem[];
  timestamp: string;
}

/**
 * Customer Line Item on Tax Receipt
 */
export interface ReceiptItemInput {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxable?: boolean;
  notes?: string;
  modifiers?: Array<{ name: string; priceDelta: number }>;
}

/**
 * Buyer details for statutory B2B Tax Invoices
 */
export interface ReceiptBuyerDetails {
  buyerName: string;
  buyerTin: string;
  buyerBrn?: string;
  buyerSst?: string;
  buyerAddress?: string;
}

/**
 * Input data for 80mm Tax Receipt Formatter
 */
export interface TaxReceiptData {
  // Outlet & Seller Info
  outletName: string;
  outletCode?: string;
  companyName: string;
  brn: string; // SSM Business Registration Number
  tin?: string; // LHDN Tax Identification Number
  sstRegistrationNumber?: string; // JKDM SST Registration No
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  email?: string;
  halalCertNumber?: string;

  // Order Details
  orderNumber: string;
  receiptNumber?: string;
  invoiceType?: "TAX_INVOICE" | "SIMPLIFIED_TAX_INVOICE" | "CREDIT_NOTE";
  tokenNumber?: string;
  tableNumber?: string;
  paxCount?: number;
  cashierName: string;
  timestamp: string;
  outletType: OutletType;
  orderMode: "DINE_IN" | "TAKEAWAY";

  // Items
  items: ReceiptItemInput[];

  // Financial & Tax Breakdown
  subtotal: number;
  discountAmount?: number;
  discountedSubtotal: number;
  serviceChargeRate: number; // 0.10 for FSR, 0 for QSR
  serviceChargeAmount: number;
  taxableBase: number;
  sstRate: number; // 0.06
  sstAmount: number;
  packagingFee?: number;
  grossPayableAmount: number;
  cashRoundingVariance: number; // BNM 5-sen rounding
  finalPayableAmount: number;

  // Payment
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  changeAmount?: number;

  // LHDN MyInvois e-Invoicing
  lhdnUuid?: string;
  lhdnQrCodeUrl?: string;
  lhdnValidatedAt?: string;
  isConsolidatedBatch?: boolean;

  // Optional B2B Buyer Details
  buyer?: ReceiptBuyerDetails;

  // Options
  paperWidth?: number; // Default: 48
  openCashDrawer?: boolean;
  printCut?: boolean;
}

/**
 * Formatted Receipt Result
 */
export interface FormattedReceiptResult {
  receiptNumber: string;
  formattedText: string;
  escposBytes: Uint8Array;
  lineWidth: number;
  lineCount: number;
  byteLength: number;
  hasLhdnQr: boolean;
}

/**
 * Cash Drawer Trigger Options
 */
export interface CashDrawerTriggerOptions {
  pin?: 2 | 5; // RJ11 Pin 2 or Pin 5 (default: 2)
  onPulseTimeMs?: number; // Solenoid pulse on-time in ms (default: 50ms)
  offPulseTimeMs?: number; // Solenoid pulse off-time in ms (default: 500ms)
  triggerReason?: "CASH_SETTLEMENT" | "CHANGE_GIVEN" | "SUPERVISOR_MANUAL_OPEN" | "FLOAT_ADJUSTMENT";
  staffId?: string;
  staffName?: string;
  supervisorPin?: string;
  notes?: string;
}

/**
 * Cash Drawer Audit Log Entry
 */
export interface CashDrawerAuditLog {
  id: string;
  timestamp: string;
  triggerReason: string;
  staffId?: string;
  staffName?: string;
  authorizedBy?: string;
  notes?: string;
  success: boolean;
  pulseBytesHex: string;
}
