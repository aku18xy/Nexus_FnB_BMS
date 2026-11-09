import { describe, it } from "node:test";
import assert from "node:assert";
import {
  routeOrderTickets,
  resolveItemStation,
  dispatchStationTickets,
} from "../ticket-router";
import { clearSimulatedPrintJobs, getSimulatedPrintJobs } from "../tcp-socket";

describe("Multi-Station Kitchen Ticket Router (TSK-PRT-02)", () => {
  it("resolves target kitchen stations correctly by station and category", () => {
    assert.strictEqual(
      resolveItemStation({ kitchenStation: "HOT_WOK" }),
      "HOT_KITCHEN"
    );
    assert.strictEqual(
      resolveItemStation({ kitchenStation: "HOT_KITCHEN" }),
      "HOT_KITCHEN"
    );
    assert.strictEqual(
      resolveItemStation({ kitchenStation: "COLD_KITCHEN" }),
      "COLD_PREP"
    );
    assert.strictEqual(
      resolveItemStation({ kitchenStation: "DRINK_BAR" }),
      "DRINK_BAR"
    );

    // Fallback to category
    assert.strictEqual(
      resolveItemStation({ category: "MAIN_COURSE" }),
      "HOT_KITCHEN"
    );
    assert.strictEqual(
      resolveItemStation({ category: "APPETIZER" }),
      "COLD_PREP"
    );
    assert.strictEqual(
      resolveItemStation({ category: "BEVERAGE" }),
      "DRINK_BAR"
    );

    // Unmapped fallback
    assert.strictEqual(
      resolveItemStation({ kitchenStation: "UNKNOWN", category: "UNKNOWN" }),
      "HOT_KITCHEN"
    );
  });

  it("partitions a 3-item multi-course order across Hot Kitchen, Cold Prep, and Drink Bar", () => {
    const order = {
      orderNumber: "ORD-20261109-001",
      tokenNumber: "101",
      tableNumber: "T-04",
      paxCount: 3,
      outletName: "Nexus Bistro Bangsar",
      outletType: "FSR" as const,
      cashierName: "Siti Aminah",
      timestamp: "2026-11-09 14:00:00",
      items: [
        {
          name: "Wagyu Ribeye Steak",
          quantity: 1,
          kitchenStation: "HOT_KITCHEN",
          category: "MAIN_COURSE",
          notes: "Medium rare",
          modifiers: [{ name: "Truffle Butter", priceDelta: 5 }],
        },
        {
          name: "Caesar Salad",
          quantity: 1,
          kitchenStation: "COLD_PREP",
          category: "APPETIZER",
          notes: "Dressing on the side",
        },
        {
          name: "Teh Tarik Kaw",
          quantity: 2,
          kitchenStation: "DRINK_BAR",
          category: "BEVERAGE",
          notes: "Kurang manis",
        },
      ],
    };

    const routingResult = routeOrderTickets(order);

    // Must emit exactly 3 tickets
    assert.strictEqual(routingResult.totalTicketsDispatched, 3);
    assert.strictEqual(routingResult.tickets.length, 3);

    // Find tickets by station
    const hotTicket = routingResult.tickets.find((t) => t.station === "HOT_KITCHEN");
    const coldTicket = routingResult.tickets.find((t) => t.station === "COLD_PREP");
    const drinkTicket = routingResult.tickets.find((t) => t.station === "DRINK_BAR");

    assert.ok(hotTicket);
    assert.ok(coldTicket);
    assert.ok(drinkTicket);

    // Hot ticket items
    assert.strictEqual(hotTicket.items.length, 1);
    assert.strictEqual(hotTicket.items[0].name, "Wagyu Ribeye Steak");
    assert.strictEqual(hotTicket.items[0].notes, "Medium rare");
    assert.ok(hotTicket.rawText.includes("Wagyu Ribeye Steak"));
    assert.ok(hotTicket.rawText.includes("+ Truffle Butter"));

    // Cold ticket items
    assert.strictEqual(coldTicket.items.length, 1);
    assert.strictEqual(coldTicket.items[0].name, "Caesar Salad");
    assert.ok(coldTicket.rawText.includes("Caesar Salad"));
    assert.ok(coldTicket.rawText.includes("Dressing on the side"));

    // Drink ticket items
    assert.strictEqual(drinkTicket.items.length, 1);
    assert.strictEqual(drinkTicket.items[0].name, "Teh Tarik Kaw");
    assert.strictEqual(drinkTicket.items[0].quantity, 2);
    assert.strictEqual(drinkTicket.totalItemCount, 2);
    assert.ok(drinkTicket.rawText.includes("[2x] Teh Tarik Kaw"));

    // Binary ESC/POS bytes generated
    assert.ok(hotTicket.escposBytes.byteLength > 0);
    assert.ok(coldTicket.escposBytes.byteLength > 0);
    assert.ok(drinkTicket.escposBytes.byteLength > 0);
  });

  it("omits tickets for stations with zero items", () => {
    // Order containing only beverages
    const beverageOnlyOrder = {
      orderNumber: "ORD-20261109-002",
      tokenNumber: "102",
      outletType: "QSR" as const,
      timestamp: "2026-11-09 14:15:00",
      items: [
        {
          name: "Iced Kopi Cham",
          quantity: 1,
          kitchenStation: "DRINK_BAR",
        },
        {
          name: "Teh O Ais Limau",
          quantity: 2,
          kitchenStation: "DRINK_BAR",
        },
      ],
    };

    const routingResult = routeOrderTickets(beverageOnlyOrder);

    // Only 1 ticket should be dispatched (to DRINK_BAR)
    assert.strictEqual(routingResult.totalTicketsDispatched, 1);
    assert.strictEqual(routingResult.tickets.length, 1);
    assert.strictEqual(routingResult.tickets[0].station, "DRINK_BAR");

    // Hot Kitchen and Cold Prep are omitted
    assert.strictEqual(
      routingResult.tickets.some((t) => t.station === "HOT_KITCHEN"),
      false
    );
    assert.strictEqual(
      routingResult.tickets.some((t) => t.station === "COLD_PREP"),
      false
    );
  });

  it("dispatches tickets to station printers in simulation mode", async () => {
    clearSimulatedPrintJobs();

    const order = {
      orderNumber: "ORD-20261109-003",
      items: [
        { name: "Nasi Lemak", quantity: 1, kitchenStation: "HOT_KITCHEN" },
        { name: "Sirap Bandung", quantity: 1, kitchenStation: "DRINK_BAR" },
      ],
    };

    const result = routeOrderTickets(order);
    const dispatchResults = await dispatchStationTickets(result, { simulation: true });

    assert.strictEqual(dispatchResults.length, 2);
    assert.strictEqual(dispatchResults[0].success, true);
    assert.strictEqual(dispatchResults[1].success, true);

    const printJobs = getSimulatedPrintJobs();
    assert.strictEqual(printJobs.length, 2);
  });
});
