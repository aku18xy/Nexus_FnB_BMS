import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  getCashDrawerPulseBytes,
  getCashDrawerRealtimePulseBytes,
  triggerCashDrawer,
  openCashDrawerManual,
  getCashDrawerAuditLogs,
  clearCashDrawerAuditLogs,
} from "../cash-drawer";

describe("Cash Drawer Kick Pulse Trigger (TSK-PRT-04)", () => {
  beforeEach(() => {
    clearCashDrawerAuditLogs();
  });

  it("generates correct ESC/POS RJ11 kick pulse byte sequences", () => {
    // Pin 2, 50ms on, 500ms off -> 1B 70 00 19 FA
    const pin2Bytes = getCashDrawerPulseBytes({ pin: 2, onPulseTimeMs: 50, offPulseTimeMs: 500 });
    assert.deepStrictEqual(Array.from(pin2Bytes), [0x1b, 0x70, 0x00, 0x19, 0xfa]);

    // Pin 5 -> 1B 70 01 19 FA
    const pin5Bytes = getCashDrawerPulseBytes({ pin: 5, onPulseTimeMs: 50, offPulseTimeMs: 500 });
    assert.deepStrictEqual(Array.from(pin5Bytes), [0x1b, 0x70, 0x01, 0x19, 0xfa]);

    // Realtime pulse -> 10 14 01 00 05
    const realtimeBytes = getCashDrawerRealtimePulseBytes();
    assert.deepStrictEqual(Array.from(realtimeBytes), [0x10, 0x14, 0x01, 0x00, 0x05]);
  });

  it("triggers cash drawer release in simulation mode and creates an audit log entry", async () => {
    const printer = {
      host: "192.168.1.200",
      port: 9100,
      simulation: true,
    };

    const res = await triggerCashDrawer(printer, {
      triggerReason: "CASH_SETTLEMENT",
      staffId: "STF-001",
      staffName: "Ahmad",
      notes: "Order ORD-101 Cash Settlement",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.transmission.simulated, true);
    assert.strictEqual(res.auditLog.triggerReason, "CASH_SETTLEMENT");
    assert.strictEqual(res.auditLog.staffName, "Ahmad");
    assert.strictEqual(res.auditLog.pulseBytesHex, "1B 70 00 19 FA");

    const logs = getCashDrawerAuditLogs();
    assert.strictEqual(logs.length, 1);
  });

  it("handles supervisor manual open with required PIN authorization", async () => {
    const printer = {
      host: "192.168.1.200",
      port: 9100,
      simulation: true,
    };

    // Fails without supervisor PIN
    await assert.rejects(
      async () => {
        await openCashDrawerManual(printer, "STF-002", "Siti", "", "Change replenishment");
      },
      /Supervisor authorization PIN is required/
    );

    // Succeeds with supervisor PIN
    const res = await openCashDrawerManual(
      printer,
      "STF-002",
      "Siti",
      "9988",
      "Change replenishment"
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.auditLog.triggerReason, "SUPERVISOR_MANUAL_OPEN");
    assert.strictEqual(res.auditLog.authorizedBy, "SUPERVISOR_PIN");
  });
});
