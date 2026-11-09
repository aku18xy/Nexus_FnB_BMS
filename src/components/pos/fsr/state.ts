/**
 * FSR Table Occupancy State Machine & Layout State Management
 * SSOT Section 5.1 SRS-FOH-01 & SRS-FOH-02
 */

import {
  DiningTableLayout,
  TableStatus,
  VALID_TABLE_TRANSITIONS,
} from "./types";

export const INITIAL_FSR_TABLES: DiningTableLayout[] = [
  {
    id: "t-01",
    tableNumber: "T-01",
    section: "Indoor",
    shape: "square",
    capacity: 2,
    status: "VACANT",
    position: { x: 50, y: 50 },
    dimensions: { width: 90, height: 90 },
  },
  {
    id: "t-02",
    tableNumber: "T-02",
    section: "Indoor",
    shape: "square",
    capacity: 4,
    currentPax: 3,
    status: "SEATED",
    activeOrderTotal: 0,
    seatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    elapsedMinutes: 15,
    position: { x: 180, y: 50 },
    dimensions: { width: 100, height: 100 },
  },
  {
    id: "t-03",
    tableNumber: "T-03",
    section: "Indoor",
    shape: "round",
    capacity: 4,
    currentPax: 4,
    status: "ORDERED",
    activeOrderTotal: 98.5,
    seatedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    elapsedMinutes: 32,
    position: { x: 320, y: 50 },
    dimensions: { width: 100, height: 100 },
  },
  {
    id: "t-04",
    tableNumber: "T-04",
    section: "Indoor",
    shape: "long",
    capacity: 6,
    currentPax: 6,
    status: "SERVED",
    activeOrderTotal: 184.2,
    seatedAt: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    elapsedMinutes: 48,
    position: { x: 50, y: 190 },
    dimensions: { width: 180, height: 100 },
  },
  {
    id: "t-05",
    tableNumber: "T-05",
    section: "Indoor",
    shape: "round",
    capacity: 4,
    currentPax: 4,
    status: "BILL_OUT",
    activeOrderTotal: 236.8,
    seatedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    elapsedMinutes: 75,
    position: { x: 260, y: 190 },
    dimensions: { width: 100, height: 100 },
  },
  {
    id: "t-out-01",
    tableNumber: "OUT-01",
    section: "Outdoor",
    shape: "square",
    capacity: 4,
    currentPax: 2,
    status: "ORDERED",
    activeOrderTotal: 52.0,
    seatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    elapsedMinutes: 20,
    position: { x: 50, y: 50 },
    dimensions: { width: 100, height: 100 },
  },
  {
    id: "t-out-02",
    tableNumber: "OUT-02",
    section: "Outdoor",
    shape: "square",
    capacity: 2,
    status: "VACANT",
    position: { x: 190, y: 50 },
    dimensions: { width: 90, height: 90 },
  },
  {
    id: "t-vip-01",
    tableNumber: "VIP-01",
    section: "VIP",
    shape: "long",
    capacity: 10,
    currentPax: 8,
    status: "SEATED",
    activeOrderTotal: 450.0,
    seatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    elapsedMinutes: 10,
    position: { x: 50, y: 50 },
    dimensions: { width: 220, height: 110 },
  },
  {
    id: "t-bar-01",
    tableNumber: "BAR-01",
    section: "Bar",
    shape: "round",
    capacity: 2,
    status: "VACANT",
    position: { x: 50, y: 50 },
    dimensions: { width: 80, height: 80 },
  },
  {
    id: "t-bar-02",
    tableNumber: "BAR-02",
    section: "Bar",
    shape: "round",
    capacity: 2,
    currentPax: 2,
    status: "SERVED",
    activeOrderTotal: 38.0,
    seatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    elapsedMinutes: 25,
    position: { x: 160, y: 50 },
    dimensions: { width: 80, height: 80 },
  },
];

/**
 * Validates whether a requested transition conforms to canonical FSR rules
 */
export function isValidTransition(
  currentStatus: TableStatus,
  targetStatus: TableStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_TABLE_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

/**
 * Returns available next transition actions for a given status
 */
export function getNextPossibleTransitions(
  status: TableStatus
): Array<{ targetStatus: TableStatus; label: string; actionStyle: string }> {
  switch (status) {
    case "VACANT":
      return [
        {
          targetStatus: "SEATED",
          label: "Seat Guests",
          actionStyle: "bg-amber-600 hover:bg-amber-500 text-white",
        },
      ];
    case "SEATED":
      return [
        {
          targetStatus: "ORDERED",
          label: "Fire Kitchen Order",
          actionStyle: "bg-blue-600 hover:bg-blue-500 text-white",
        },
        {
          targetStatus: "VACANT",
          label: "Cancel / Walk-Out",
          actionStyle: "bg-slate-700 hover:bg-slate-600 text-slate-200",
        },
      ];
    case "ORDERED":
      return [
        {
          targetStatus: "SERVED",
          label: "Mark All Served",
          actionStyle: "bg-purple-600 hover:bg-purple-500 text-white",
        },
        {
          targetStatus: "ORDERED",
          label: "Add Another Round",
          actionStyle: "bg-blue-800 hover:bg-blue-700 text-white",
        },
      ];
    case "SERVED":
      return [
        {
          targetStatus: "BILL_OUT",
          label: "Print Bill / Request Bill",
          actionStyle: "bg-rose-600 hover:bg-rose-500 text-white",
        },
        {
          targetStatus: "ORDERED",
          label: "Order Dessert/Drinks",
          actionStyle: "bg-blue-700 hover:bg-blue-600 text-white",
        },
      ];
    case "BILL_OUT":
      return [
        {
          targetStatus: "VACANT",
          label: "Settle & Clear Table",
          actionStyle: "bg-emerald-600 hover:bg-emerald-500 text-white",
        },
        {
          targetStatus: "ORDERED",
          label: "Reopen Tab",
          actionStyle: "bg-slate-700 hover:bg-slate-600 text-slate-200",
        },
      ];
    default:
      return [];
  }
}

/**
 * Pure transition state updater ensuring state invariants
 */
export function transitionTableState(
  table: DiningTableLayout,
  nextStatus: TableStatus,
  options?: {
    pax?: number;
    orderTotal?: number;
    notes?: string;
  }
): DiningTableLayout {
  if (!isValidTransition(table.status, nextStatus)) {
    throw new Error(
      `Invalid table state transition from ${table.status} to ${nextStatus}`
    );
  }

  const now = new Date().toISOString();

  if (nextStatus === "VACANT") {
    return {
      ...table,
      status: "VACANT",
      currentPax: undefined,
      activeOrderId: undefined,
      activeOrderTotal: undefined,
      seatedAt: undefined,
      elapsedMinutes: undefined,
      notes: undefined,
    };
  }

  if (table.status === "VACANT" && nextStatus === "SEATED") {
    return {
      ...table,
      status: "SEATED",
      currentPax: options?.pax ?? Math.min(table.capacity, 2),
      activeOrderTotal: 0,
      seatedAt: now,
      elapsedMinutes: 0,
      notes: options?.notes ?? table.notes,
    };
  }

  return {
    ...table,
    status: nextStatus,
    currentPax: options?.pax ?? table.currentPax,
    activeOrderTotal:
      options?.orderTotal !== undefined
        ? options.orderTotal
        : table.activeOrderTotal ?? 0,
    notes: options?.notes ?? table.notes,
  };
}

/**
 * Visual styling metadata per occupancy state
 */
export function getStatusStyle(status: TableStatus): {
  label: string;
  badgeVariant: "success" | "warning" | "danger" | "default" | "outline";
  cardBg: string;
  cardBorder: string;
  textColor: string;
} {
  switch (status) {
    case "VACANT":
      return {
        label: "Vacant",
        badgeVariant: "success",
        cardBg: "bg-slate-900/90",
        cardBorder: "border-slate-800 hover:border-emerald-500/70",
        textColor: "text-emerald-400",
      };
    case "SEATED":
      return {
        label: "Seated",
        badgeVariant: "warning",
        cardBg: "bg-amber-950/25",
        cardBorder: "border-amber-700/50 hover:border-amber-600",
        textColor: "text-amber-400",
      };
    case "ORDERED":
      return {
        label: "Ordered (Kitchen)",
        badgeVariant: "default",
        cardBg: "bg-blue-950/30",
        cardBorder: "border-blue-700/60 hover:border-blue-500",
        textColor: "text-blue-400",
      };
    case "SERVED":
      return {
        label: "Served",
        badgeVariant: "outline",
        cardBg: "bg-purple-950/25",
        cardBorder: "border-purple-700/50 hover:border-purple-500",
        textColor: "text-purple-300",
      };
    case "BILL_OUT":
      return {
        label: "Bill Out",
        badgeVariant: "danger",
        cardBg: "bg-rose-950/35",
        cardBorder: "border-rose-700/80 hover:border-rose-500",
        textColor: "text-rose-400",
      };
  }
}
