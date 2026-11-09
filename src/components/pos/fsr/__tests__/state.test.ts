import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidTransition,
  transitionTableState,
  getNextPossibleTransitions,
  INITIAL_FSR_TABLES,
} from "../state";
import { DiningTableLayout } from "../types";

describe("FSR Table Occupancy State Machine (SRS-FOH-01, SRS-FOH-02, TSK-POS-01)", () => {
  const sampleTable: DiningTableLayout = {
    id: "test-01",
    tableNumber: "T-99",
    section: "Indoor",
    shape: "square",
    capacity: 4,
    status: "VACANT",
    position: { x: 50, y: 50 },
    dimensions: { width: 90, height: 90 },
  };

  describe("Validation of Canonical Transitions", () => {
    it("allows valid forward transition sequence VACANT -> SEATED -> ORDERED -> SERVED -> BILL_OUT -> VACANT", () => {
      assert.equal(isValidTransition("VACANT", "SEATED"), true);
      assert.equal(isValidTransition("SEATED", "ORDERED"), true);
      assert.equal(isValidTransition("ORDERED", "SERVED"), true);
      assert.equal(isValidTransition("SERVED", "BILL_OUT"), true);
      assert.equal(isValidTransition("BILL_OUT", "VACANT"), true);
    });

    it("rejects illegal transitions: cannot jump from VACANT directly to BILL_OUT or SERVED", () => {
      assert.equal(isValidTransition("VACANT", "BILL_OUT"), false);
      assert.equal(isValidTransition("VACANT", "SERVED"), false);
    });

    it("allows guest walk-out / cancellation from SEATED to VACANT", () => {
      assert.equal(isValidTransition("SEATED", "VACANT"), true);
    });

    it("allows reopening a tab from BILL_OUT to ORDERED when guest orders extra coffee/dessert", () => {
      assert.equal(isValidTransition("BILL_OUT", "ORDERED"), true);
    });

    it("allows adding additional rounds in ORDERED status", () => {
      assert.equal(isValidTransition("ORDERED", "ORDERED"), true);
    });
  });

  describe("State Mutation & Invariant Enforcement", () => {
    it("transitions table from VACANT to SEATED with guest count and seated timestamp", () => {
      const seated = transitionTableState(sampleTable, "SEATED", { pax: 3 });
      assert.equal(seated.status, "SEATED");
      assert.equal(seated.currentPax, 3);
      assert.ok(seated.seatedAt);
      assert.equal(seated.elapsedMinutes, 0);
      assert.equal(seated.activeOrderTotal, 0);
    });

    it("transitions from SEATED to ORDERED with order total", () => {
      const seated = transitionTableState(sampleTable, "SEATED", { pax: 2 });
      const ordered = transitionTableState(seated, "ORDERED", { orderTotal: 88.5 });
      assert.equal(ordered.status, "ORDERED");
      assert.equal(ordered.activeOrderTotal, 88.5);
      assert.equal(ordered.currentPax, 2);
    });

    it("transitions from ORDERED to SERVED and then BILL_OUT", () => {
      const seated = transitionTableState(sampleTable, "SEATED", { pax: 4 });
      const ordered = transitionTableState(seated, "ORDERED", { orderTotal: 120.0 });
      const served = transitionTableState(ordered, "SERVED");
      assert.equal(served.status, "SERVED");

      const billOut = transitionTableState(served, "BILL_OUT");
      assert.equal(billOut.status, "BILL_OUT");
      assert.equal(billOut.activeOrderTotal, 120.0);
    });

    it("clears all occupancy data upon transition to VACANT", () => {
      const seated = transitionTableState(sampleTable, "SEATED", { pax: 4 });
      const ordered = transitionTableState(seated, "ORDERED", { orderTotal: 120.0 });
      const served = transitionTableState(ordered, "SERVED");
      const billOut = transitionTableState(served, "BILL_OUT");
      const vacant = transitionTableState(billOut, "VACANT");

      assert.equal(vacant.status, "VACANT");
      assert.equal(vacant.currentPax, undefined);
      assert.equal(vacant.activeOrderId, undefined);
      assert.equal(vacant.activeOrderTotal, undefined);
      assert.equal(vacant.seatedAt, undefined);
      assert.equal(vacant.elapsedMinutes, undefined);
    });

    it("throws error on illegal state jump", () => {
      assert.throws(
        () => {
          transitionTableState(sampleTable, "BILL_OUT");
        },
        /Invalid table state transition from VACANT to BILL_OUT/
      );
    });
  });

  describe("Next Action Resolution", () => {
    it("returns correct action triggers for each status", () => {
      const vacantActions = getNextPossibleTransitions("VACANT");
      assert.ok(vacantActions.some((a) => a.targetStatus === "SEATED"));

      const seatedActions = getNextPossibleTransitions("SEATED");
      assert.ok(seatedActions.some((a) => a.targetStatus === "ORDERED"));
      assert.ok(seatedActions.some((a) => a.targetStatus === "VACANT"));

      const billOutActions = getNextPossibleTransitions("BILL_OUT");
      assert.ok(billOutActions.some((a) => a.targetStatus === "VACANT"));
    });
  });

  describe("Initial Tables Layout Dataset", () => {
    it("includes diverse table shapes and capacities across all 4 zones", () => {
      const sections = new Set(INITIAL_FSR_TABLES.map((t) => t.section));
      assert.equal(sections.has("Indoor"), true);
      assert.equal(sections.has("Outdoor"), true);
      assert.equal(sections.has("VIP"), true);
      assert.equal(sections.has("Bar"), true);

      const shapes = new Set(INITIAL_FSR_TABLES.map((t) => t.shape));
      assert.equal(shapes.has("square"), true);
      assert.equal(shapes.has("round"), true);
      assert.equal(shapes.has("long"), true);

      INITIAL_FSR_TABLES.forEach((t) => {
        assert.ok(t.capacity >= 1 && t.capacity <= 20);
      });
    });
  });
});
