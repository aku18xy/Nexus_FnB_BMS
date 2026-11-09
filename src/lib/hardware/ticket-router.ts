/**
 * Multi-Station Kitchen Ticket Router (TSK-PRT-02)
 * Nexus FnB BMS (Malaysia Edition)
 *
 * Partitions order line items across designated kitchen preparation stations:
 * - Hot Kitchen (Wok, Grill, Fryer, Steamer)
 * - Cold Prep (Salads, Larder, Cold Appetizers, Desserts)
 * - Drink Bar (Beverages, Coffee, Barista, Fresh Juices)
 *
 * Formats station-specific tickets with bold quantity emphasis, modifiers,
 * and outputs both ASCII text and ESC/POS binary byte sequences.
 */

import { EscPosBuilder } from "./escpos-builder";
import { sendRawEscPos } from "./tcp-socket";
import {
  KitchenStationMapping,
  KitchenTicketItem,
  PrinterConfig,
  SocketTransmissionResult,
  StationKitchenTicket,
  TargetKitchenStation,
  TicketRoutingResult,
} from "./types";
import { OutletType } from "../../types/outlet";

/**
 * Default LAN Printer Configurations for Kitchen Stations
 */
export const DEFAULT_STATION_MAPPINGS: KitchenStationMapping[] = [
  {
    station: "HOT_KITCHEN",
    displayName: "HOT KITCHEN / WOK",
    printer: {
      id: "prt-hot-kitchen",
      name: "Hot Kitchen LAN Printer",
      host: process.env.PRINTER_HOT_KITCHEN_IP || "192.168.1.201",
      port: 9100,
      paperWidth: 48,
    },
    categories: ["MAIN_COURSE", "NOODLES_RICE", "SPECIALTY"],
    kitchenStations: ["HOT_WOK", "CENTRAL_KITCHEN"],
    enabled: true,
  },
  {
    station: "COLD_PREP",
    displayName: "COLD PREP & LARDER",
    printer: {
      id: "prt-cold-prep",
      name: "Cold Prep LAN Printer",
      host: process.env.PRINTER_COLD_PREP_IP || "192.168.1.202",
      port: 9100,
      paperWidth: 48,
    },
    categories: ["APPETIZER", "DESSERT", "SNACKS"],
    kitchenStations: ["COLD_KITCHEN", "PASTRY_DESSERT"],
    enabled: true,
  },
  {
    station: "DRINK_BAR",
    displayName: "DRINK BAR & BEVERAGE",
    printer: {
      id: "prt-drink-bar",
      name: "Drink Bar LAN Printer",
      host: process.env.PRINTER_DRINK_BAR_IP || "192.168.1.203",
      port: 9100,
      paperWidth: 48,
    },
    categories: ["BEVERAGE"],
    kitchenStations: ["DRINK_BAR"],
    enabled: true,
  },
];

/**
 * Flexible Order Input for routing
 */
export interface RouteOrderInput {
  id?: string;
  orderNumber: string;
  tokenNumber?: string;
  tableNumber?: string;
  tableName?: string;
  paxCount?: number;
  outletId?: string;
  outletName?: string;
  outletType?: OutletType;
  orderMode?: "DINE_IN" | "TAKEAWAY";
  orderNotes?: string;
  cashierName?: string;
  serverName?: string;
  timestamp?: string;
  isReprint?: boolean;
  items: Array<{
    id?: string;
    name: string;
    quantity: number;
    notes?: string;
    modifiers?: Array<{ name: string; priceDelta?: number }>;
    selectedModifiers?: Array<{ id?: string; name: string; priceDelta?: number }>;
    kitchenStation?: string;
    category?: string;
    course?: "DRINKS" | "APPETIZER" | "MAINS" | "DESSERT";
  }>;
}

/**
 * Determine target kitchen station for an individual order item
 */
export function resolveItemStation(
  item: {
    kitchenStation?: string;
    category?: string;
  },
  stationMappings: KitchenStationMapping[] = DEFAULT_STATION_MAPPINGS,
  fallbackStation: TargetKitchenStation = "HOT_KITCHEN"
): TargetKitchenStation {
  const stationStr = (item.kitchenStation || "").trim().toUpperCase();
  const categoryStr = (item.category || "").trim().toUpperCase();

  // 1. Direct station matching
  if (stationStr === "HOT_KITCHEN" || stationStr === "HOT_WOK" || stationStr === "CENTRAL_KITCHEN") {
    return "HOT_KITCHEN";
  }
  if (stationStr === "COLD_PREP" || stationStr === "COLD_KITCHEN" || stationStr === "PASTRY_DESSERT") {
    return "COLD_PREP";
  }
  if (stationStr === "DRINK_BAR" || stationStr === "BEVERAGE" || stationStr === "BAR") {
    return "DRINK_BAR";
  }

  // 2. Custom mappings match by kitchenStation
  for (const mapping of stationMappings) {
    if (!mapping.enabled) continue;
    if (mapping.kitchenStations.some((ks) => ks.toUpperCase() === stationStr)) {
      return mapping.station;
    }
  }

  // 3. Category based matching
  if (categoryStr === "MAIN_COURSE" || categoryStr === "NOODLES_RICE" || categoryStr === "SPECIALTY") {
    return "HOT_KITCHEN";
  }
  if (categoryStr === "APPETIZER" || categoryStr === "DESSERT" || categoryStr === "SNACKS") {
    return "COLD_PREP";
  }
  if (categoryStr === "BEVERAGE") {
    return "DRINK_BAR";
  }

  // 4. Custom mappings match by category
  for (const mapping of stationMappings) {
    if (!mapping.enabled) continue;
    if (mapping.categories.some((cat) => cat.toUpperCase() === categoryStr)) {
      return mapping.station;
    }
  }

  // 5. Safe fallback
  return fallbackStation;
}

/**
 * Format a kitchen station ticket into both ASCII text and binary ESC/POS Uint8Array
 */
export function formatKitchenTicket(
  ticketMeta: {
    orderNumber: string;
    tokenNumber?: string;
    tableNumber?: string;
    paxCount?: number;
    outletName?: string;
    outletType?: OutletType;
    orderMode?: "DINE_IN" | "TAKEAWAY";
    stationDisplayName: string;
    serverName?: string;
    orderNotes?: string;
    timestamp: string;
    isReprint?: boolean;
    paperWidth?: number;
  },
  items: KitchenTicketItem[]
): { rawText: string; escposBytes: Uint8Array } {
  const width = ticketMeta.paperWidth ?? 48;
  const hr = "-".repeat(width);
  const doubleHr = "=".repeat(width);

  // 1. Build ASCII Text
  const textLines: string[] = [];

  textLines.push(doubleHr);
  textLines.push(centerText(`*** ${ticketMeta.stationDisplayName} ***`, width));
  if (ticketMeta.isReprint) {
    textLines.push(centerText("** REPRINT / COPY **", width));
  }
  textLines.push(doubleHr);

  textLines.push(`Order: ${ticketMeta.orderNumber}`);
  if (ticketMeta.tokenNumber) {
    textLines.push(`TOKEN: #${ticketMeta.tokenNumber}`);
  }
  if (ticketMeta.tableNumber) {
    const paxInfo = ticketMeta.paxCount ? ` (${ticketMeta.paxCount} Pax)` : "";
    textLines.push(`Table: ${ticketMeta.tableNumber}${paxInfo}`);
  }
  if (ticketMeta.orderMode) {
    textLines.push(`Type:  ${ticketMeta.orderMode.replace("_", " ")}`);
  }
  textLines.push(`Time:  ${ticketMeta.timestamp}`);
  if (ticketMeta.serverName) {
    textLines.push(`Staff: ${ticketMeta.serverName}`);
  }
  textLines.push(hr);

  // Items
  for (const item of items) {
    const qtyPrefix = `[${item.quantity}x] `;
    textLines.push(`${qtyPrefix}${item.name}`);

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        textLines.push(`   + ${mod.name}`);
      }
    }
    if (item.notes) {
      textLines.push(`   * NOTE: ${item.notes}`);
    }
  }

  textLines.push(hr);
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  textLines.push(`Total Items for Station: ${totalItemCount}`);

  if (ticketMeta.orderNotes) {
    textLines.push(`Order Notes: ${ticketMeta.orderNotes}`);
  }
  textLines.push(doubleHr);
  textLines.push("");

  const rawText = textLines.join("\n");

  // 2. Build Binary ESC/POS
  const builder = new EscPosBuilder();
  builder.init();

  // Header
  builder.align("center");
  builder.doubleHorizontalRule("=", width);
  builder.bold(true);
  builder.size(2, 2); // Double width & height for station header
  builder.line(`*** ${ticketMeta.stationDisplayName} ***`);
  builder.normal();

  if (ticketMeta.isReprint) {
    builder.align("center");
    builder.bold(true);
    builder.invert(true);
    builder.line("  ** REPRINT / COPY **  ");
    builder.invert(false);
    builder.bold(false);
  }

  builder.align("center");
  builder.doubleHorizontalRule("=", width);

  // Meta Section
  builder.align("left");
  builder.bold(true);
  builder.line(`Order: ${ticketMeta.orderNumber}`);

  if (ticketMeta.tokenNumber) {
    builder.size(2, 2);
    builder.line(`TOKEN: #${ticketMeta.tokenNumber}`);
    builder.normal();
  }

  if (ticketMeta.tableNumber) {
    builder.size(1, 2); // Double height for table number
    const paxInfo = ticketMeta.paxCount ? ` (${ticketMeta.paxCount} Pax)` : "";
    builder.line(`Table: ${ticketMeta.tableNumber}${paxInfo}`);
    builder.normal();
  }

  if (ticketMeta.orderMode) {
    builder.bold(true);
    builder.line(`Type:  ${ticketMeta.orderMode.replace("_", " ")}`);
    builder.bold(false);
  }

  builder.line(`Time:  ${ticketMeta.timestamp}`);
  if (ticketMeta.serverName) {
    builder.line(`Staff: ${ticketMeta.serverName}`);
  }
  builder.horizontalRule("-", width);

  // Line items
  for (const item of items) {
    builder.bold(true);
    builder.size(1, 2); // Double height for item line
    builder.line(`[${item.quantity}x] ${item.name}`);
    builder.normal();

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        builder.line(`   + ${mod.name}`);
      }
    }
    if (item.notes) {
      builder.bold(true);
      builder.line(`   * NOTE: ${item.notes}`);
      builder.bold(false);
    }
  }

  builder.horizontalRule("-", width);
  builder.bold(true);
  builder.line(`Total Items for Station: ${totalItemCount}`);
  builder.bold(false);

  if (ticketMeta.orderNotes) {
    builder.bold(true);
    builder.line(`Order Notes: ${ticketMeta.orderNotes}`);
    builder.bold(false);
  }

  builder.doubleHorizontalRule("=", width);

  // Feed and partial cut
  builder.cut(true, 4);

  const escposBytes = builder.build();

  return { rawText, escposBytes };
}

/**
 * Route order items to multi-station tickets.
 * Omits tickets for stations with 0 items.
 */
export function routeOrderTickets(
  order: RouteOrderInput,
  stationMappings: KitchenStationMapping[] = DEFAULT_STATION_MAPPINGS
): TicketRoutingResult {
  const timestamp = order.timestamp || new Date().toISOString();
  const orderId = order.id || order.orderNumber;

  // Group items by target station
  const stationItemsMap = new Map<TargetKitchenStation, KitchenTicketItem[]>();
  const unroutedItems: KitchenTicketItem[] = [];

  for (const rawItem of order.items) {
    const normalizedItem: KitchenTicketItem = {
      id: rawItem.id || `item-${Math.random().toString(36).substring(2, 7)}`,
      name: rawItem.name,
      quantity: rawItem.quantity,
      notes: rawItem.notes,
      modifiers: rawItem.modifiers || rawItem.selectedModifiers?.map((m) => ({ name: m.name, priceDelta: m.priceDelta })),
      kitchenStation: rawItem.kitchenStation || "",
      category: rawItem.category,
      course: rawItem.course,
    };

    const targetStation = resolveItemStation(
      { kitchenStation: rawItem.kitchenStation, category: rawItem.category },
      stationMappings
    );

    if (targetStation) {
      const existing = stationItemsMap.get(targetStation) || [];
      existing.push(normalizedItem);
      stationItemsMap.set(targetStation, existing);
    } else {
      unroutedItems.push(normalizedItem);
    }
  }

  // Build tickets ONLY for stations with items > 0
  const tickets: StationKitchenTicket[] = [];

  for (const mapping of stationMappings) {
    if (!mapping.enabled) continue;

    const itemsForStation = stationItemsMap.get(mapping.station);
    if (!itemsForStation || itemsForStation.length === 0) {
      // Omit ticket for empty station
      continue;
    }

    const { rawText, escposBytes } = formatKitchenTicket(
      {
        orderNumber: order.orderNumber,
        tokenNumber: order.tokenNumber,
        tableNumber: order.tableNumber || order.tableName,
        paxCount: order.paxCount,
        outletName: order.outletName,
        outletType: order.outletType || "FSR",
        orderMode: order.orderMode || (order.tableNumber ? "DINE_IN" : "TAKEAWAY"),
        stationDisplayName: mapping.displayName,
        serverName: order.serverName || order.cashierName,
        orderNotes: order.orderNotes,
        timestamp,
        isReprint: order.isReprint,
        paperWidth: mapping.printer.paperWidth || 48,
      },
      itemsForStation
    );

    const ticket: StationKitchenTicket = {
      ticketId: `tkt-${mapping.station.toLowerCase()}-${order.orderNumber}-${Date.now()}`,
      orderId,
      orderNumber: order.orderNumber,
      tokenNumber: order.tokenNumber,
      tableNumber: order.tableNumber || order.tableName,
      outletId: order.outletId,
      outletName: order.outletName,
      outletType: order.outletType || "FSR",
      station: mapping.station,
      stationDisplayName: mapping.displayName,
      printer: mapping.printer,
      items: itemsForStation,
      totalItemCount: itemsForStation.reduce((sum, item) => sum + item.quantity, 0),
      orderNotes: order.orderNotes,
      serverName: order.serverName || order.cashierName,
      timestamp,
      isReprint: order.isReprint,
      rawText,
      escposBytes,
    };

    tickets.push(ticket);
  }

  return {
    orderId,
    orderNumber: order.orderNumber,
    totalTicketsDispatched: tickets.length,
    tickets,
    unroutedItems,
    timestamp,
  };
}

/**
 * Dispatch generated station tickets across all active printer targets
 */
export async function dispatchStationTickets(
  routingResult: TicketRoutingResult,
  options?: { simulation?: boolean }
): Promise<Array<{ station: TargetKitchenStation; success: boolean; transmission: SocketTransmissionResult }>> {
  const results: Array<{ station: TargetKitchenStation; success: boolean; transmission: SocketTransmissionResult }> = [];

  for (const ticket of routingResult.tickets) {
    const printerConfig: PrinterConfig = {
      ...ticket.printer,
      simulation: options?.simulation ?? ticket.printer.simulation,
    };

    const transmission = await sendRawEscPos(printerConfig, ticket.escposBytes);
    results.push({
      station: ticket.station,
      success: transmission.success,
      transmission,
    });
  }

  return results;
}

/**
 * Helper to center text inside fixed character width
 */
function centerText(text: string, width = 48): string {
  if (text.length >= width) return text;
  const totalPadding = width - text.length;
  const leftPad = Math.floor(totalPadding / 2);
  const rightPad = totalPadding - leftPad;
  return " ".repeat(leftPad) + text + " ".repeat(rightPad);
}
