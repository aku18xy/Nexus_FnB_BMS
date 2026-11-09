import { OutletType } from "./outlet";
import { TaxCalculationBreakdown, PaymentMethod } from "./tax";
import { KitchenStation } from "./menu";

export type OrderStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"
  | "VOID";

export type PaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "REFUNDED";

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  selectedModifiers?: Array<{ id: string; name: string; priceDelta: number }>;
  kitchenStation: KitchenStation;
  kitchenStatus: "QUEUED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  firedAt?: string;
  completedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "ORD-20261109-001"
  tokenNumber?: string; // QSR token calling number e.g. "101"
  outletId: string;
  outletType: OutletType;
  tableId?: string; // FSR Dining Table ID
  tableName?: string; // FSR e.g. "T-04 (Indoor)"
  paxCount?: number;
  customerName?: string;
  customerTin?: string; // For B2B LHDN e-Invoice
  customerBrn?: string; // SSM Business Reg No
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  items: OrderItem[];
  breakdown: TaxCalculationBreakdown;
  lhdnUuid?: string; // Validated LHDN MyInvois document UUID
  lhdnQrCodeUrl?: string; // Official LHDN verification QR link
  isConsolidatedLhdnBatch?: boolean; // True for standard B2C end-of-month consolidated e-invoice
  cashierStaffId: string;
  cashierName: string;
  offlineCreated?: boolean;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}
