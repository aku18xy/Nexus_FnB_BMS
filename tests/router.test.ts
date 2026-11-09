import test from "node:test";
import assert from "node:assert/strict";
import {
  routeOrderTickets,
  resolveItemStation,
  DEFAULT_STATION_MAPPINGS,
  RouteOrderInput,
} from "@/lib/hardware/ticket-router";

test("Station Resolution - Direct kitchen station identifiers", () => {
  assert.equal(resolveItemStation({ kitchenStation: "HOT_KITCHEN" }), "HOT_KITCHEN");
  assert.equal(resolveItemStation({ kitchenStation: "HOT_WOK" }), "HOT_KITCHEN");
  assert.equal(resolveItemStation({ kitchenStation: "CENTRAL_KITCHEN" }), "HOT_KITCHEN");

  assert.equal(resolveItemStation({ kitchenStation: "COLD_PREP" }), "COLD_PREP");
  assert.equal(resolveItemStation({ kitchenStation: "COLD_KITCHEN" }), "COLD_PREP");
  assert.equal(resolveItemStation({ kitchenStation: "PASTRY_DESSERT" }), "COLD_PREP");

  assert.equal(resolveItemStation({ kitchenStation: "DRINK_BAR" }), "DRINK_BAR");
  assert.equal(resolveItemStation({ kitchenStation: "BEVERAGE" }), "DRINK_BAR");
  assert.equal(resolveItemStation({ kitchenStation: "BAR" }), "DRINK_BAR");
});

test("Station Resolution - Fallback to Category mappings", () => {
  assert.equal(resolveItemStation({ category: "MAIN_COURSE" }), "HOT_KITCHEN");
  assert.equal(resolveItemStation({ category: "NOODLES_RICE" }), "HOT_KITCHEN");
  assert.equal(resolveItemStation({ category: "SPECIALTY" }), "HOT_KITCHEN");

  assert.equal(resolveItemStation({ category: "APPETIZER" }), "COLD_PREP");
  assert.equal(resolveItemStation({ category: "DESSERT" }), "COLD_PREP");
  assert.equal(resolveItemStation({ category: "SNACKS" }), "COLD_PREP");

  assert.equal(resolveItemStation({ category: "BEVERAGE" }), "DRINK_BAR");
});

test("Station Resolution - Unmapped / missing items safely fallback to default HOT_KITCHEN", () => {
  assert.equal(resolveItemStation({}), "HOT_KITCHEN");
  assert.equal(resolveItemStation({ kitchenStation: "UNKNOWN_DEPT", category: "MERCHANDISE" }), "HOT_KITCHEN");
  assert.equal(resolveItemStation({ kitchenStation: "" }), "HOT_KITCHEN");
});

test("Ticket Routing - Drinks-only order generates exactly 1 ticket, omitting Hot and Cold stations", () => {
  const order: RouteOrderInput = {
    orderNumber: "ORD-DRK-001",
    tableNumber: "T-02",
    items: [
      { name: "Teh Tarik Kaw", quantity: 2, category: "BEVERAGE" },
      { name: "Kopi O Beng", quantity: 1, category: "BEVERAGE" },
    ],
  };

  const result = routeOrderTickets(order);

  assert.equal(result.totalTicketsDispatched, 1);
  assert.equal(result.tickets.length, 1);
  assert.equal(result.tickets[0].station, "DRINK_BAR");
  assert.equal(result.tickets[0].items.length, 2);
  assert.equal(result.tickets[0].totalItemCount, 3); // 2 + 1
  assert.ok(result.tickets[0].rawText.includes("DRINK BAR & BEVERAGE"));
  assert.ok(result.tickets[0].escposBytes instanceof Uint8Array);
});

test("Ticket Routing - Multi-station order partitions items across Hot, Cold, and Drinks", () => {
  const order: RouteOrderInput = {
    orderNumber: "ORD-FULL-001",
    tableNumber: "T-12",
    paxCount: 4,
    orderMode: "DINE_IN",
    items: [
      { name: "Wagyu Ribeye Steak", quantity: 2, kitchenStation: "HOT_KITCHEN" },
      { name: "Caesar Salad", quantity: 1, kitchenStation: "COLD_PREP" },
      { name: "Matcha Lava Cake", quantity: 1, kitchenStation: "PASTRY_DESSERT" },
      { name: "Fresh Iced Lemon Tea", quantity: 4, kitchenStation: "DRINK_BAR" },
    ],
  };

  const result = routeOrderTickets(order);

  // Expect tickets for 3 stations: HOT_KITCHEN, COLD_PREP (salad + dessert), DRINK_BAR
  assert.equal(result.totalTicketsDispatched, 3);

  const hotTicket = result.tickets.find((t) => t.station === "HOT_KITCHEN");
  assert.ok(hotTicket);
  assert.equal(hotTicket.items.length, 1);
  assert.equal(hotTicket.items[0].name, "Wagyu Ribeye Steak");

  const coldTicket = result.tickets.find((t) => t.station === "COLD_PREP");
  assert.ok(coldTicket);
  assert.equal(coldTicket.items.length, 2); // Salad + Cake

  const drinkTicket = result.tickets.find((t) => t.station === "DRINK_BAR");
  assert.ok(drinkTicket);
  assert.equal(drinkTicket.items.length, 1);
  assert.equal(drinkTicket.totalItemCount, 4);
});

test("Ticket Routing - Unmapped items default to HOT_KITCHEN ticket", () => {
  const order: RouteOrderInput = {
    orderNumber: "ORD-DEF-001",
    tokenNumber: "105",
    orderMode: "TAKEAWAY",
    items: [
      { name: "Special Daily Curry Puff", quantity: 3 }, // No station or category
    ],
  };

  const result = routeOrderTickets(order);

  assert.equal(result.totalTicketsDispatched, 1);
  assert.equal(result.tickets[0].station, "HOT_KITCHEN");
  assert.equal(result.tickets[0].items[0].name, "Special Daily Curry Puff");
  assert.ok(result.tickets[0].rawText.includes("TOKEN: #105"));
  assert.ok(result.tickets[0].rawText.includes("Type:  TAKEAWAY"));
});

test("Ticket Routing - Modifiers and cooking notes are preserved on station tickets", () => {
  const order: RouteOrderInput = {
    orderNumber: "ORD-MOD-001",
    tableNumber: "T-05",
    items: [
      {
        name: "Char Kway Teow",
        quantity: 1,
        kitchenStation: "HOT_KITCHEN",
        notes: "No cockles, extra spicy",
        modifiers: [
          { name: "Add Fried Egg", priceDelta: 1.5 },
          { name: "Extra Prawns (x2)", priceDelta: 4.0 },
        ],
      },
    ],
  };

  const result = routeOrderTickets(order);

  assert.equal(result.totalTicketsDispatched, 1);
  const ticket = result.tickets[0];
  assert.ok(ticket.rawText.includes("[1x] Char Kway Teow"));
  assert.ok(ticket.rawText.includes("+ Add Fried Egg"));
  assert.ok(ticket.rawText.includes("+ Extra Prawns (x2)"));
  assert.ok(ticket.rawText.includes("* NOTE: No cockles, extra spicy"));
});

test("Ticket Routing - Empty order produces 0 dispatched tickets", () => {
  const emptyOrder: RouteOrderInput = {
    orderNumber: "ORD-EMPTY",
    items: [],
  };

  const result = routeOrderTickets(emptyOrder);
  assert.equal(result.totalTicketsDispatched, 0);
  assert.equal(result.tickets.length, 0);
});
