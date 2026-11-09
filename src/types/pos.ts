/**
 * Nexus FnB Business Management System (Malaysia Edition)
 * Single Source of Truth: Front-of-House POS Interfaces & Types
 * Conforms to SSOT Section 2, Section 5.1 (SRS-FOH-01..06) & TASKS TSK-POS-01/04
 */

import { KitchenStation } from "./menu";

// ==========================================
// 1. FSR Table & Floor Plan State Machine Types
// ==========================================

export type TableStatus =
  | "VACANT"
  | "SEATED"
  | "ORDERED"
  | "SERVED"
  | "BILL_OUT";

export type TableShape = "round" | "square" | "long" | "rectangle";

export type TableSection = "Indoor" | "Outdoor" | "VIP" | "Bar";

export interface TablePosition {
  x: number; // Grid or canvas X coordinate
  y: number; // Grid or canvas Y coordinate
}

export interface TableDimensions {
  width: number;
  height: number;
}

export interface DiningTableLayout {
  id: string;
  tableNumber: string;
  section: TableSection;
  shape: TableShape;
  capacity: number; // 1 to 20 pax
  currentPax?: number;
  status: TableStatus;
  activeOrderId?: string;
  activeOrderTotal?: number;
  seatedAt?: string; // ISO string
  elapsedMinutes?: number;
  position: TablePosition;
  dimensions?: TableDimensions;
  isMerged?: boolean;
  mergedTableIds?: string[];
  notes?: string;
}

export interface TableTransitionAction {
  targetStatus: TableStatus;
  label: string;
  pax?: number;
  notes?: string;
}

// Transition rule map defining valid state transitions
export const VALID_TABLE_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  VACANT: ["SEATED"],
  SEATED: ["ORDERED", "VACANT"], // Can order or cancel seating (walk out)
  ORDERED: ["SERVED", "ORDERED"], // Can be served or add more items
  SERVED: ["BILL_OUT", "ORDERED"], // Can print bill or re-order drinks/dessert
  BILL_OUT: ["VACANT", "ORDERED"], // Settled -> Vacant, or reopen order
};

// ==========================================
// 2. QSR Rapid Tap Ordering & Combo Types
// ==========================================

export type QsrOrderMode = "DINE_IN" | "TAKEAWAY";

export interface ComboModifierItem {
  id: string;
  name: string;
  priceDelta: number; // e.g. +RM 1.50 for Iced Lemon Tea upgrade
  station?: KitchenStation;
}

export interface ComboModifierGroup {
  id: string;
  name: string; // e.g. "Combo Drink", "Combo Side"
  required: boolean;
  options: ComboModifierItem[];
}

export interface QsrMenuItem {
  id: string;
  sku: string;
  name: string;
  nameMalay?: string;
  price: number;
  category: string;
  kitchenStation: KitchenStation;
  hasComboUpsell?: boolean;
  comboDrinkOptions?: ComboModifierItem[];
  comboSideOptions?: ComboModifierItem[];
  imageUrl?: string;
  isAvailable: boolean;
}

export interface SelectedCombo {
  drink?: ComboModifierItem;
  side?: ComboModifierItem;
}

export interface QsrCartItem {
  lineId: string; // Unique ID for each cart line
  menuItem: QsrMenuItem;
  quantity: number;
  combo?: SelectedCombo;
  unitPrice: number; // Base price + combo deltas
  lineTotal: number;
  notes?: string;
}

// ==========================================
// 3. Sequential Token Generator & Calling Display
// ==========================================

export type TokenStatus = "PREPARING" | "CALLING" | "COLLECTED";

export interface QueueToken {
  tokenNumber: number; // 101 to 999
  tokenDisplay: string; // "#101"
  orderId: string;
  orderMode: QsrOrderMode;
  itemsSummary: string;
  totalPayable: number;
  status: TokenStatus;
  createdAt: string; // ISO string
  calledAt?: string;
  collectedAt?: string;
}

// ==========================================
// 4. Tap Audit & Rapid Flow Metrics
// ==========================================

export interface RapidTapFlowMetrics {
  tapCount: number;
  stepSequence: string[];
  flowStartTime: number;
  settledTime?: number;
  elapsedSeconds?: number;
  isUnderConstraint: boolean; // tapCount <= 6 && elapsedSeconds < 15
}
