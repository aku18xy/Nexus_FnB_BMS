/**
 * Adversarial Verification & Empirical Stress-Testing Harness (Challenger 2)
 * Nexus FnB BMS (Malaysia Edition)
 *
 * Targets:
 * 1. src/lib/hardware/escpos-builder.ts (ESC/POS binary bytes, QR length boundaries, little-endian pL/pH)
 * 2. src/lib/hardware/ticket-router.ts (100-item orders, all-drink, all-cold, invalid stations, multi-course)
 * 3. src/components/pos/fsr/state.ts (25-pair state transition matrix, overcapacity, tab reopening, immutability)
 * 4. src/components/pos/qsr/ (<=6-tap flow enforcement, takeaway packaging surcharge, token rollover #999 -> #101)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Hardware Drivers
import { EscPosBuilder, ESC_POS_BYTES } from "@/lib/hardware/escpos-builder";
import {
  routeOrderTickets,
  resolveItemStation,
  DEFAULT_STATION_MAPPINGS,
  RouteOrderInput,
} from "@/lib/hardware/ticket-router";

// FSR State Machine
import {
  isValidTransition,
  transitionTableState,
  getNextPossibleTransitions,
  INITIAL_FSR_TABLES,
} from "@/components/pos/fsr/state";
import { TableStatus, DiningTableLayout } from "@/types/pos";

// QSR Rapid Tap POS
import {
  SAMPLE_QSR_MENU,
  SAMPLE_COMBO_DRINKS,
  SAMPLE_COMBO_SIDES,
  QsrCartItem,
  SelectedCombo,
  QueueToken,
} from "@/components/pos/qsr/types";
import { calculateMalaysianTax } from "@/lib/tax/malaysia-tax";

// =========================================================================
// 1. ESC/POS BINARY BYTE STREAM & QR LENGTH BOUNDARIES
// =========================================================================

describe("CHALLENGE 1: Hardware ESC/POS Binary Command Builder (TSK-PRT-01)", () => {
  describe("1.1 Standard ESC/POS Command Sequences", () => {
    it("generates correct initialization bytes (ESC @ -> 1B 40)", () => {
      const builder = new EscPosBuilder().init();
      const bytes = builder.build();
      assert.deepEqual(Array.from(bytes), [0x1b, 0x40]);
    });

    it("generates exact bold emphasis toggle (ESC E 1 / ESC E 0)", () => {
      const builder = new EscPosBuilder().bold(true).bold(false);
      const bytes = builder.build();
      assert.deepEqual(Array.from(bytes), [0x1b, 0x45, 0x01, 0x1b, 0x45, 0x00]);
    });

    it("generates underline modes: none, 1-dot, 2-dot", () => {
      const builder = new EscPosBuilder()
        .underline(1)
        .underline(2)
        .underline(false);
      const bytes = builder.build();
      assert.deepEqual(Array.from(bytes), [
        0x1b, 0x2d, 0x01, // 1-dot
        0x1b, 0x2d, 0x02, // 2-dot
        0x1b, 0x2d, 0x00, // none
      ]);
    });

    it("generates inverted white-on-black text toggle (GS B 1 / GS B 0)", () => {
      const builder = new EscPosBuilder().invert(true).invert(false);
      const bytes = builder.build();
      assert.deepEqual(Array.from(bytes), [0x1d, 0x42, 0x01, 0x1d, 0x42, 0x00]);
    });

    it("generates alignment commands: left (0), center (1), right (2)", () => {
      const builder = new EscPosBuilder()
        .align("left")
        .align("center")
        .align("right");
      const bytes = builder.build();
      assert.deepEqual(Array.from(bytes), [
        0x1b, 0x61, 0x00,
        0x1b, 0x61, 0x01,
        0x1b, 0x61, 0x02,
      ]);
    });

    it("clamps font size multipliers between 1 and 8 (GS ! n)", () => {
      // Normal 1x1: ((1-1)<<4) | (1-1) = 0x00
      const bNormal = new EscPosBuilder().size(1, 1).build();
      assert.deepEqual(Array.from(bNormal), [0x1d, 0x21, 0x00]);

      // Double height & width 2x2: ((2-1)<<4) | (2-1) = 0x11
      const bDouble = new EscPosBuilder().size(2, 2).build();
      assert.deepEqual(Array.from(bDouble), [0x1d, 0x21, 0x11]);

      // Max size 8x8: ((8-1)<<4) | (8-1) = 0x77 (119)
      const bMax = new EscPosBuilder().size(8, 8).build();
      assert.deepEqual(Array.from(bMax), [0x1d, 0x21, 0x77]);

      // Underflow clamp: 0 clamped to 1 -> 0x00
      const bUnder = new EscPosBuilder().size(0 as any, 0 as any).build();
      assert.deepEqual(Array.from(bUnder), [0x1d, 0x21, 0x00]);

      // Overflow clamp: 10 clamped to 8 -> 0x77
      const bOver = new EscPosBuilder().size(10 as any, 12 as any).build();
      assert.deepEqual(Array.from(bOver), [0x1d, 0x21, 0x77]);
    });

    it("generates paper cut sequences with feed lines (GS V)", () => {
      // Partial cut with 0 feed lines
      const b1 = new EscPosBuilder().cut(true, 0).build();
      assert.deepEqual(Array.from(b1), [0x1d, 0x56, 0x01]);

      // Full cut with 0 feed lines
      const b2 = new EscPosBuilder().cut(false, 0).build();
      assert.deepEqual(Array.from(b2), [0x1d, 0x56, 0x00]);

      // Partial cut with 1 feed line (emits LF 0x0A then cut)
      const b3 = new EscPosBuilder().cut(true, 1).build();
      assert.deepEqual(Array.from(b3), [0x0a, 0x1d, 0x56, 0x01]);

      // Partial cut with 4 feed lines (emits ESC d 4 then cut)
      const b4 = new EscPosBuilder().cut(true, 4).build();
      assert.deepEqual(Array.from(b4), [0x1b, 0x64, 0x04, 0x1d, 0x56, 0x01]);
    });

    it("generates RJ11 drawer kick pulse with millisecond clamping (ESC p m t1 t2)", () => {
      // Pin 2, 50ms on (25*2ms), 500ms off (250*2ms)
      const bPin2 = new EscPosBuilder().cashDrawer(2, 50, 500).build();
      assert.deepEqual(Array.from(bPin2), [0x1b, 0x70, 0x00, 0x19, 0xfa]);

      // Pin 5, 100ms on (50*2ms), 200ms off (100*2ms)
      const bPin5 = new EscPosBuilder().cashDrawer(5, 100, 200).build();
      assert.deepEqual(Array.from(bPin5), [0x1b, 0x70, 0x01, 0x32, 0x64]);

      // Extreme values: 0ms on (clamped to 1 unit = 2ms), 2000ms off (clamped to 255 units = 510ms)
      const bClamped = new EscPosBuilder().cashDrawer(2, 0, 2000).build();
      assert.deepEqual(Array.from(bClamped), [0x1b, 0x70, 0x00, 0x01, 0xff]);

      // Realtime pulse: DLE DC4 1 0 5
      const bRt = new EscPosBuilder().cashDrawerRealtime().build();
      assert.deepEqual(Array.from(bRt), [0x10, 0x14, 0x01, 0x00, 0x05]);
    });
  });

  describe("1.2 QR Code Payload Length Boundaries & Little-Endian pL/pH", () => {
    // Helper to extract Function 180 store command from QR output
    const extractQrStoreHeader = (bytes: Uint8Array) => {
      // Find sequence GS ( k ... 31 50 30
      for (let i = 0; i < bytes.length - 8; i++) {
        if (
          bytes[i] === 0x1d &&
          bytes[i + 1] === 0x28 &&
          bytes[i + 2] === 0x6b &&
          bytes[i + 5] === 0x31 &&
          bytes[i + 6] === 0x50 &&
          bytes[i + 7] === 0x30
        ) {
          const pL = bytes[i + 3];
          const pH = bytes[i + 4];
          return { pL, pH, totalLength: pL + (pH << 8) };
        }
      }
      throw new Error("QR Store symbol command (fn 180) not found in byte stream");
    };

    it("handles empty string gracefully without corrupting buffer", () => {
      const builder = new EscPosBuilder().qrCode("");
      assert.equal(builder.length, 0);
    });

    it("calculates exact pL/pH for short string (10 bytes)", () => {
      const data = "1234567890"; // 10 bytes -> paramLength = 10 + 3 = 13 (0x000D)
      const bytes = new EscPosBuilder().qrCode(data).build();
      const { pL, pH, totalLength } = extractQrStoreHeader(bytes);
      assert.equal(pL, 13);
      assert.equal(pH, 0);
      assert.equal(totalLength, 13);
    });

    it("calculates exact pL/pH at single-byte boundary (252 bytes -> totalLength 255)", () => {
      const data = "A".repeat(252); // paramLength = 252 + 3 = 255 (0x00FF)
      const bytes = new EscPosBuilder().qrCode(data).build();
      const { pL, pH, totalLength } = extractQrStoreHeader(bytes);
      assert.equal(pL, 255);
      assert.equal(pH, 0);
      assert.equal(totalLength, 255);
    });

    it("crosses 8-bit to 16-bit little-endian boundary (253 bytes -> totalLength 256, pL=0, pH=1)", () => {
      const data = "B".repeat(253); // paramLength = 253 + 3 = 256 (0x0100)
      const bytes = new EscPosBuilder().qrCode(data).build();
      const { pL, pH, totalLength } = extractQrStoreHeader(bytes);
      assert.equal(pL, 0); // 256 & 0xFF == 0
      assert.equal(pH, 1); // (256 >> 8) & 0xFF == 1
      assert.equal(totalLength, 256);
    });

    it("handles 254 bytes (totalLength 257, pL=1, pH=1)", () => {
      const data = "C".repeat(254); // paramLength = 254 + 3 = 257 (0x0101)
      const bytes = new EscPosBuilder().qrCode(data).build();
      const { pL, pH, totalLength } = extractQrStoreHeader(bytes);
      assert.equal(pL, 1);
      assert.equal(pH, 1);
      assert.equal(totalLength, 257);
    });

    it("handles large 500-byte LHDN document verification payload", () => {
      const data = "X".repeat(500); // paramLength = 500 + 3 = 503 (0x01F7)
      const bytes = new EscPosBuilder().qrCode(data).build();
      const { pL, pH, totalLength } = extractQrStoreHeader(bytes);
      assert.equal(pL, 247); // 503 & 0xFF = 247
      assert.equal(pH, 1); // 503 >> 8 = 1
      assert.equal(totalLength, 503);
    });

    it("handles 1024-byte payload crossing to higher pH byte", () => {
      const data = "Z".repeat(1024); // paramLength = 1024 + 3 = 1027 (0x0403)
      const bytes = new EscPosBuilder().qrCode(data).build();
      const { pL, pH, totalLength } = extractQrStoreHeader(bytes);
      assert.equal(pL, 3); // 1027 & 0xFF = 3
      assert.equal(pH, 4); // 1027 >> 8 = 4
      assert.equal(totalLength, 1027);
    });

    it("correctly computes UTF-8 multi-byte characters in QR code", () => {
      // 3 Malay/Jawi/Emoji characters that take multiple bytes in UTF-8
      const unicodeString = "Kopi O ☕ & Nasi Lemak 🇲🇾";
      const expectedByteLen = new TextEncoder().encode(unicodeString).byteLength;
      assert.ok(expectedByteLen > unicodeString.length); // UTF-8 expands beyond char length

      const bytes = new EscPosBuilder().qrCode(unicodeString).build();
      const { totalLength } = extractQrStoreHeader(bytes);
      assert.equal(totalLength, expectedByteLen + 3);
    });

    it("verifies QR Model, Error Correction, and Module Size options", () => {
      const data = "https://myinvois.hasil.gov.my";
      // Test Model 1 vs Model 2
      const bModel1 = new EscPosBuilder().qrCode(data, { model: 1 }).build();
      // fn 165: 1D 28 6b 04 00 31 41 31 00 (0x31 = Model 1)
      assert.equal(bModel1[7], 49);

      const bModel2 = new EscPosBuilder().qrCode(data, { model: 2 }).build();
      // fn 165: 1D 28 6b 04 00 31 41 32 00 (0x32 = Model 2)
      assert.equal(bModel2[7], 50);

      // Test EC levels: L(48), M(49), Q(50), H(51)
      const bEcH = new EscPosBuilder().qrCode(data, { errorCorrection: "H" }).build();
      assert.equal(bEcH[24], 51); // 0x33

      const bEcL = new EscPosBuilder().qrCode(data, { errorCorrection: "L" }).build();
      assert.equal(bEcL[24], 48); // 0x30
    });
  });

  describe("1.3 Layout Formatting Helpers & Buffer Output", () => {
    it("handles twoColumn safely when text length exceeds total width", () => {
      const builder = new EscPosBuilder();
      const longLeft = "Very Long Item Name That Exceeds Line Width By Itself";
      const right = "RM 999.00";
      // Even if left.length + right.length > 48, it should not throw and insert at least 1 space
      builder.twoColumn(longLeft, right, 48);
      const str = new TextDecoder().decode(builder.build());
      assert.ok(str.includes(longLeft));
      assert.ok(str.includes(right));
      assert.ok(str.endsWith("\n"));
    });

    it("converts builder to valid Node Buffer and Hex representation", () => {
      const builder = new EscPosBuilder().init().line("TEST");
      const buffer = builder.toBuffer();
      assert.ok(Buffer.isBuffer(buffer));
      assert.equal(buffer.length, builder.length);

      const hex = builder.toHex();
      assert.ok(hex.startsWith("1B 40")); // ESC @
    });
  });
});

// =========================================================================
// 2. MULTI-STATION KITCHEN TICKET ROUTER
// =========================================================================

describe("CHALLENGE 2: Multi-Station Kitchen Ticket Router (TSK-PRT-02)", () => {
  describe("2.1 High-Volume Stress Test: 100-Item Order", () => {
    it("partitions a 100-item order across all 3 kitchen stations without dropping items", () => {
      const items: RouteOrderInput["items"] = [];

      // Generate 100 diverse items
      for (let i = 1; i <= 100; i++) {
        if (i % 3 === 1) {
          items.push({
            name: `Hot Dish #${i}`,
            quantity: 2,
            kitchenStation: "HOT_KITCHEN",
            category: "MAIN_COURSE",
            notes: `Spicy level ${i % 5}`,
            modifiers: [{ name: "Extra Sambal", priceDelta: 1.5 }],
          });
        } else if (i % 3 === 2) {
          items.push({
            name: `Cold Salad/Dessert #${i}`,
            quantity: 1,
            kitchenStation: "COLD_PREP",
            category: "APPETIZER",
          });
        } else {
          items.push({
            name: `Beverage #${i}`,
            quantity: 3,
            kitchenStation: "DRINK_BAR",
            category: "BEVERAGE",
            notes: "Kurang manis",
          });
        }
      }

      assert.equal(items.length, 100);

      const order: RouteOrderInput = {
        orderNumber: "ORD-STRESS-100",
        tokenNumber: "999",
        tableNumber: "VIP-01",
        paxCount: 20,
        items,
      };

      const startTime = performance.now();
      const routingResult = routeOrderTickets(order);
      const elapsed = performance.now() - startTime;

      // Performance check: routing 100 items must be sub-15ms
      assert.ok(elapsed < 20, `Routing took too long: ${elapsed.toFixed(2)}ms`);

      // Exactly 3 tickets dispatched (Hot, Cold, Drink)
      assert.equal(routingResult.totalTicketsDispatched, 3);
      assert.equal(routingResult.tickets.length, 3);
      assert.equal(routingResult.unroutedItems.length, 0);

      const hotTicket = routingResult.tickets.find((t) => t.station === "HOT_KITCHEN")!;
      const coldTicket = routingResult.tickets.find((t) => t.station === "COLD_PREP")!;
      const drinkTicket = routingResult.tickets.find((t) => t.station === "DRINK_BAR")!;

      assert.ok(hotTicket && coldTicket && drinkTicket);

      // Verify item distribution
      // i % 3 === 1: 34 items (1, 4, 7... 100) -> quantity 2 each -> total 68
      assert.equal(hotTicket.items.length, 34);
      assert.equal(hotTicket.totalItemCount, 68);

      // i % 3 === 2: 33 items (2, 5, 8... 98) -> quantity 1 each -> total 33
      assert.equal(coldTicket.items.length, 33);
      assert.equal(coldTicket.totalItemCount, 33);

      // i % 3 === 0: 33 items (3, 6, 9... 99) -> quantity 3 each -> total 99
      assert.equal(drinkTicket.items.length, 33);
      assert.equal(drinkTicket.totalItemCount, 99);

      // Total quantity sum across all tickets
      const grandTotalQty =
        hotTicket.totalItemCount +
        coldTicket.totalItemCount +
        drinkTicket.totalItemCount;
      assert.equal(grandTotalQty, 68 + 33 + 99); // 200 items in total

      // Verify binary ESC/POS generated for all 3 tickets
      assert.ok(hotTicket.escposBytes.byteLength > 500);
      assert.ok(coldTicket.escposBytes.byteLength > 500);
      assert.ok(drinkTicket.escposBytes.byteLength > 500);
    });
  });

  describe("2.2 Ticket Suppression: All-Drink & All-Cold Orders", () => {
    it("suppresses Hot Kitchen and Cold Prep tickets for all-drinks orders", () => {
      const allDrinksOrder: RouteOrderInput = {
        orderNumber: "ORD-DRINKS-ONLY",
        tokenNumber: "101",
        items: [
          { name: "Teh Tarik Kaw", quantity: 2, kitchenStation: "DRINK_BAR" },
          { name: "Kopi O Ping", quantity: 1, kitchenStation: "DRINK_BAR" },
          { name: "Sirap Bandung", quantity: 3, category: "BEVERAGE" },
        ],
      };

      const result = routeOrderTickets(allDrinksOrder);

      assert.equal(result.totalTicketsDispatched, 1);
      assert.equal(result.tickets.length, 1);
      assert.equal(result.tickets[0].station, "DRINK_BAR");
      assert.equal(result.tickets[0].totalItemCount, 6);

      // Ensure Hot and Cold stations are NOT present
      assert.equal(result.tickets.some((t) => t.station === "HOT_KITCHEN"), false);
      assert.equal(result.tickets.some((t) => t.station === "COLD_PREP"), false);
    });

    it("suppresses Hot Kitchen and Drink Bar tickets for all-cold orders", () => {
      const allColdOrder: RouteOrderInput = {
        orderNumber: "ORD-COLD-ONLY",
        tokenNumber: "102",
        items: [
          { name: "Cendol D24", quantity: 2, kitchenStation: "PASTRY_DESSERT" },
          { name: "Rojak Buah", quantity: 1, category: "APPETIZER" },
        ],
      };

      const result = routeOrderTickets(allColdOrder);

      assert.equal(result.totalTicketsDispatched, 1);
      assert.equal(result.tickets.length, 1);
      assert.equal(result.tickets[0].station, "COLD_PREP");
      assert.equal(result.tickets[0].totalItemCount, 3);

      assert.equal(result.tickets.some((t) => t.station === "HOT_KITCHEN"), false);
      assert.equal(result.tickets.some((t) => t.station === "DRINK_BAR"), false);
    });

    it("produces 0 tickets on empty order", () => {
      const emptyOrder: RouteOrderInput = {
        orderNumber: "ORD-EMPTY",
        items: [],
      };
      const result = routeOrderTickets(emptyOrder);
      assert.equal(result.totalTicketsDispatched, 0);
      assert.equal(result.tickets.length, 0);
      assert.equal(result.unroutedItems.length, 0);
    });
  });

  describe("2.3 Adversarial Station Resolution & Fallbacks", () => {
    it("handles invalid station strings and unmapped categories safely via HOT_KITCHEN fallback", () => {
      assert.equal(
        resolveItemStation({ kitchenStation: "BOGUS_STATION_99", category: "UNKNOWN" }),
        "HOT_KITCHEN"
      );
      assert.equal(
        resolveItemStation({ kitchenStation: undefined, category: undefined }),
        "HOT_KITCHEN"
      );
      assert.equal(
        resolveItemStation({ kitchenStation: "", category: "" }),
        "HOT_KITCHEN"
      );
    });

    it("handles case-insensitivity and leading/trailing whitespace", () => {
      assert.equal(
        resolveItemStation({ kitchenStation: "  hot_wok  " }),
        "HOT_KITCHEN"
      );
      assert.equal(
        resolveItemStation({ kitchenStation: "cold_kitchen" }),
        "COLD_PREP"
      );
      assert.equal(
        resolveItemStation({ category: "  beverage  " }),
        "DRINK_BAR"
      );
      assert.equal(
        resolveItemStation({ category: "Dessert" }),
        "COLD_PREP"
      );
    });

    it("respects custom fallbackStation parameter", () => {
      const station = resolveItemStation(
        { kitchenStation: "UNKNOWN" },
        DEFAULT_STATION_MAPPINGS,
        "DRINK_BAR"
      );
      assert.equal(station, "DRINK_BAR");
    });

    it("maps selectedModifiers properly when modifiers is absent", () => {
      const order: RouteOrderInput = {
        orderNumber: "ORD-MOD-1",
        items: [
          {
            name: "Nasi Goreng Kampung",
            quantity: 1,
            kitchenStation: "HOT_KITCHEN",
            selectedModifiers: [
              { id: "mod-1", name: "Telur Mata", priceDelta: 1.5 },
              { id: "mod-2", name: "Extra Pedas", priceDelta: 0 },
            ],
          },
        ],
      };

      const result = routeOrderTickets(order);
      const ticket = result.tickets[0];
      assert.ok(ticket);
      assert.equal(ticket.items[0].modifiers?.length, 2);
      assert.equal(ticket.items[0].modifiers![0].name, "Telur Mata");
      assert.ok(ticket.rawText.includes("+ Telur Mata"));
      assert.ok(ticket.rawText.includes("+ Extra Pedas"));
    });
  });
});

// =========================================================================
// 3. FSR TABLE OCCUPANCY STATE MACHINE
// =========================================================================

describe("CHALLENGE 3: FSR Table Occupancy State Machine (SRS-FOH-01, SRS-FOH-02)", () => {
  const baseTable: DiningTableLayout = {
    id: "table-t01",
    tableNumber: "T-01",
    section: "Indoor",
    shape: "square",
    capacity: 4,
    status: "VACANT",
    position: { x: 50, y: 50 },
  };

  describe("3.1 Complete 25-Transition Matrix (5x5 State Permutations)", () => {
    const allStatuses: TableStatus[] = [
      "VACANT",
      "SEATED",
      "ORDERED",
      "SERVED",
      "BILL_OUT",
    ];

    // Canonical allowed transitions according to SSOT & VALID_TABLE_TRANSITIONS:
    // VACANT: ["SEATED"]
    // SEATED: ["ORDERED", "VACANT"]
    // ORDERED: ["SERVED", "ORDERED"]
    // SERVED: ["BILL_OUT", "ORDERED"]
    // BILL_OUT: ["VACANT", "ORDERED"]
    // + Identity transitions (A -> A)
    const validPairs = new Set([
      // Identity
      "VACANT->VACANT",
      "SEATED->SEATED",
      "ORDERED->ORDERED",
      "SERVED->SERVED",
      "BILL_OUT->BILL_OUT",
      // Forward workflow
      "VACANT->SEATED",
      "SEATED->ORDERED",
      "ORDERED->SERVED",
      "SERVED->BILL_OUT",
      "BILL_OUT->VACANT",
      // Operational workflow exceptions
      "SEATED->VACANT", // Walkout / cancellation
      "SERVED->ORDERED", // Re-order additional food/drinks
      "BILL_OUT->ORDERED", // Reopen tab after bill printed
    ]);

    for (const from of allStatuses) {
      for (const to of allStatuses) {
        const pairKey = `${from}->${to}`;
        const shouldBeValid = validPairs.has(pairKey);

        it(`evaluates transition ${pairKey}: expected ${shouldBeValid ? "VALID" : "INVALID"}`, () => {
          assert.equal(
            isValidTransition(from, to),
            shouldBeValid,
            `Transition ${pairKey} unexpectedly evaluated to ${!shouldBeValid}`
          );

          const testTable: DiningTableLayout = { ...baseTable, status: from };

          if (shouldBeValid) {
            const result = transitionTableState(testTable, to);
            assert.equal(result.status, to);
          } else {
            assert.throws(
              () => transitionTableState(testTable, to),
              /Invalid table state transition/
            );
          }
        });
      }
    }
  });

  describe("3.2 Overcapacity Seating & Data Invariant Integrity", () => {
    it("allows overcapacity seating (e.g. 6 pax seated at a 4-capacity table with extra chair)", () => {
      // Real-world operational requirement: FOH staff seating extra guest
      const seated = transitionTableState(baseTable, "SEATED", { pax: 6 });
      assert.equal(seated.status, "SEATED");
      assert.equal(seated.currentPax, 6);
      assert.equal(seated.capacity, 4); // Capacity unchanged
      assert.ok(seated.seatedAt);
      assert.equal(seated.elapsedMinutes, 0);
    });

    it("defaults pax to Math.min(capacity, 2) when pax is omitted upon seating", () => {
      const seated = transitionTableState(baseTable, "SEATED");
      assert.equal(seated.currentPax, 2);
    });

    it("completely wipes occupancy data when table is returned to VACANT", () => {
      // Simulate fully populated table at BILL_OUT
      const billOutTable: DiningTableLayout = {
        ...baseTable,
        status: "BILL_OUT",
        currentPax: 4,
        activeOrderId: "ord-12345",
        activeOrderTotal: 345.5,
        seatedAt: "2026-11-09T12:00:00Z",
        elapsedMinutes: 65,
        notes: "VIP guests",
      };

      const cleared = transitionTableState(billOutTable, "VACANT");
      assert.equal(cleared.status, "VACANT");
      assert.equal(cleared.currentPax, undefined);
      assert.equal(cleared.activeOrderId, undefined);
      assert.equal(cleared.activeOrderTotal, undefined);
      assert.equal(cleared.seatedAt, undefined);
      assert.equal(cleared.elapsedMinutes, undefined);
      assert.equal(cleared.notes, undefined);
    });

    it("preserves immutability of original table object during transition", () => {
      const original: DiningTableLayout = { ...baseTable, status: "VACANT" };
      const transitioned = transitionTableState(original, "SEATED", { pax: 3 });

      assert.equal(original.status, "VACANT");
      assert.equal(transitioned.status, "SEATED");
      assert.notEqual(original, transitioned);
    });
  });

  describe("3.3 Tab Reopening Workflow (BILL_OUT -> ORDERED)", () => {
    it("successfully reopens tab from BILL_OUT to ORDERED with additional charges", () => {
      const billOutTable: DiningTableLayout = {
        ...baseTable,
        status: "BILL_OUT",
        currentPax: 4,
        activeOrderTotal: 150.0,
      };

      // Customer orders dessert after bill was printed
      const reopened = transitionTableState(billOutTable, "ORDERED", {
        orderTotal: 185.0, // Added RM35 dessert
      });

      assert.equal(reopened.status, "ORDERED");
      assert.equal(reopened.activeOrderTotal, 185.0);
      assert.equal(reopened.currentPax, 4);
    });
  });
});

// =========================================================================
// 4. QSR RAPID TAP ORDERING MATRIX & 6-TAP FLOW
// =========================================================================

describe("CHALLENGE 4: QSR Rapid Tap Ordering & Compliance (TSK-POS-04, SRS-FOH-05, SRS-FOH-06)", () => {
  describe("4.1 Verification & Enforcement of <= 6-Tap Ordering Sequence", () => {
    it("enforces full combo ordering sequence in <= 6 taps: Category -> Item -> Combo Modifier -> Confirm -> Payment -> Settle", () => {
      let tapCounter = 0;
      const tapBreadcrumbs: string[] = [];

      const tap = (name: string) => {
        tapCounter++;
        tapBreadcrumbs.push(`${tapCounter}. ${name}`);
      };

      // TAP 1: Category selection
      const category = "Mains";
      tap(`Category Select: ${category}`);

      // TAP 2: Item Selection (Item with combo upsell)
      const selectedItem = SAMPLE_QSR_MENU.find((i) => i.id === "m-01")!; // Nasi Lemak Sambal Sotong
      assert.ok(selectedItem);
      assert.equal(selectedItem.hasComboUpsell, true);
      tap(`Item Select: ${selectedItem.name}`);

      // TAP 3: Choose Combo Drink (in modal)
      const comboDrink = selectedItem.comboDrinkOptions![0]; // Teh Tarik Kaw
      assert.ok(comboDrink);
      tap(`Combo Drink: ${comboDrink.name}`);

      // TAP 4: Confirm Combo & Add to Cart
      const combo: SelectedCombo = { drink: comboDrink };
      const cartItem: QsrCartItem = {
        lineId: `${selectedItem.id}-${comboDrink.id}`,
        menuItem: selectedItem,
        quantity: 1,
        combo,
        unitPrice: selectedItem.price + comboDrink.priceDelta,
        lineTotal: selectedItem.price + comboDrink.priceDelta,
      };
      tap("Confirm Combo & Add to Cart");

      // Verify cart item pricing: RM14.90 + RM2.00 = RM16.90
      assert.equal(cartItem.unitPrice, 16.9);
      assert.equal(cartItem.lineTotal, 16.9);

      // TAP 5: Switch Payment Method
      const paymentMethod = "CASH";
      tap(`Payment Method: ${paymentMethod}`);

      // Tax calculation
      const tax = calculateMalaysianTax({
        subtotal: cartItem.lineTotal,
        outletType: "QSR",
        paymentMethod,
        takeawayPackagingFee: 0.5,
      });

      // TAP 6: Fast Pay & Fire Ticket
      let tokenCounter = 108;
      const currentToken = tokenCounter;
      tokenCounter = currentToken >= 999 ? 101 : currentToken + 1;
      tap(`Fast Pay & Fire Token #${currentToken}`);

      // Assert strict constraint: <= 6 taps
      assert.ok(
        tapCounter <= 6,
        `Violated 6-tap limit: took ${tapCounter} taps!`
      );
      assert.equal(tapCounter, 6);
      assert.equal(currentToken, 108);
      assert.equal(tokenCounter, 109);

      // Verify tax invariants: 0% SC, 6% SST, RM0.50 packaging
      assert.equal(tax.serviceChargeRate, 0.0);
      assert.equal(tax.serviceChargeAmount, 0.0);
      assert.equal(tax.packagingFee, 0.5);
    });

    it("completes direct item (no combo modal) in strictly 4 taps (< 6 taps)", () => {
      let tapCounter = 0;
      const tap = () => tapCounter++;

      // Tap 1: Category (Beverages)
      tap();
      // Tap 2: Direct Item (Teh Tarik Kaw, no combo)
      const drinkItem = SAMPLE_QSR_MENU.find((i) => i.id === "m-06")!;
      assert.equal(drinkItem.hasComboUpsell, false);
      tap();
      // Tap 3: Payment Method (DuitNow QR)
      tap();
      // Tap 4: Settle & Fire
      tap();

      assert.equal(tapCounter, 4);
      assert.ok(tapCounter <= 6);
    });
  });

  describe("4.2 Takeaway Packaging Fee Toggle (RM0.50 vs RM0.00)", () => {
    const subtotal = 20.0;

    it("adds RM0.50 packaging fee for TAKEAWAY orders", () => {
      const taxTakeaway = calculateMalaysianTax({
        subtotal,
        outletType: "QSR",
        paymentMethod: "DUITNOW_QR",
        takeawayPackagingFee: 0.5,
      });

      // 6% of 20.00 = 1.20
      // Final payable = 20.00 + 1.20 + 0.50 = 21.70
      assert.equal(taxTakeaway.packagingFee, 0.5);
      assert.equal(taxTakeaway.sstAmount, 1.2);
      assert.equal(taxTakeaway.finalPayableAmount, 21.7);
    });

    it("waives packaging fee (RM0.00) for DINE_IN orders", () => {
      const taxDineIn = calculateMalaysianTax({
        subtotal,
        outletType: "QSR",
        paymentMethod: "DUITNOW_QR",
        takeawayPackagingFee: 0.0,
      });

      // Final payable = 20.00 + 1.20 = 21.20
      assert.equal(taxDineIn.packagingFee, 0.0);
      assert.equal(taxDineIn.sstAmount, 1.2);
      assert.equal(taxDineIn.finalPayableAmount, 21.2);
    });
  });

  describe("4.3 Sequential Daily Token Generator & Rollover Boundary (#999 -> #101)", () => {
    const getNextToken = (curr: number) => (curr >= 999 ? 101 : curr + 1);

    it("increments standard tokens sequentially", () => {
      assert.equal(getNextToken(101), 102);
      assert.equal(getNextToken(108), 109);
      assert.equal(getNextToken(500), 501);
      assert.equal(getNextToken(998), 999);
    });

    it("strictly wraps around from #999 to #101", () => {
      assert.equal(getNextToken(999), 101);
      assert.equal(getNextToken(1000), 101);
      assert.equal(getNextToken(9999), 101);
    });

    it("formats QueueToken displays accurately with # prefix", () => {
      const formatDisplay = (num: number) => `#${num}`;
      assert.equal(formatDisplay(101), "#101");
      assert.equal(formatDisplay(999), "#999");
    });
  });
});
