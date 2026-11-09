/**
 * RJ11 Cash Drawer Kick Pulse Trigger Module (TSK-PRT-04)
 * Nexus FnB BMS (Malaysia Edition)
 *
 * Drives the 24V RJ11 solenoid kick pulse through receipt thermal printers.
 * Provides security audit logging for cash drawer activations (especially manual opens).
 */

import { EscPosBuilder } from "./escpos-builder";
import { sendRawEscPos } from "./tcp-socket";
import {
  CashDrawerAuditLog,
  CashDrawerTriggerOptions,
  PrinterConfig,
  SocketTransmissionResult,
} from "./types";

// In-memory audit log entries for cash drawer opens
const drawerAuditLogs: CashDrawerAuditLog[] = [];

/**
 * Retrieve cash drawer audit logs
 */
export function getCashDrawerAuditLogs(): CashDrawerAuditLog[] {
  return [...drawerAuditLogs];
}

/**
 * Clear in-memory cash drawer audit logs (used in tests)
 */
export function clearCashDrawerAuditLogs(): void {
  drawerAuditLogs.length = 0;
}

/**
 * Generate standard ESC/POS RJ11 cash drawer solenoid kick pulse bytes
 * Standard EPSON ESC/POS pulse: ESC p m t1 t2
 * - m: 0 for pin 2, 1 for pin 5
 * - t1: pulse on time (units of 2ms, default 25 = 50ms)
 * - t2: pulse off time (units of 2ms, default 250 = 500ms)
 */
export function getCashDrawerPulseBytes(options?: CashDrawerTriggerOptions): Uint8Array {
  const pin = options?.pin ?? 2;
  const onMs = options?.onPulseTimeMs ?? 50;
  const offMs = options?.offPulseTimeMs ?? 500;

  const builder = new EscPosBuilder();
  builder.cashDrawer(pin, onMs, offMs);
  return builder.build();
}

/**
 * Generate real-time cash drawer kick pulse (DLE DC4 1 0 5)
 */
export function getCashDrawerRealtimePulseBytes(): Uint8Array {
  const builder = new EscPosBuilder();
  builder.cashDrawerRealtime();
  return builder.build();
}

/**
 * Trigger physical cash drawer release via printer RJ11 port
 */
export async function triggerCashDrawer(
  printer: PrinterConfig,
  options?: CashDrawerTriggerOptions
): Promise<{
  success: boolean;
  transmission: SocketTransmissionResult;
  auditLog: CashDrawerAuditLog;
}> {
  const pulseBytes = getCashDrawerPulseBytes(options);
  const pulseHex = Array.from(pulseBytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

  const reason = options?.triggerReason ?? "CASH_SETTLEMENT";

  // Transmit pulse to printer
  const transmission = await sendRawEscPos(printer, pulseBytes);

  // Record audit log entry
  const auditLog: CashDrawerAuditLog = {
    id: `cd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    triggerReason: reason,
    staffId: options?.staffId,
    staffName: options?.staffName,
    authorizedBy: options?.supervisorPin ? `SUPERVISOR_PIN` : undefined,
    notes: options?.notes,
    success: transmission.success,
    pulseBytesHex: pulseHex,
  };

  drawerAuditLogs.push(auditLog);

  return {
    success: transmission.success,
    transmission,
    auditLog,
  };
}

/**
 * Helper to record a manual drawer open event requiring supervisor authorization
 */
export async function openCashDrawerManual(
  printer: PrinterConfig,
  staffId: string,
  staffName: string,
  supervisorPin: string,
  reasonDescription: string
): Promise<{
  success: boolean;
  transmission: SocketTransmissionResult;
  auditLog: CashDrawerAuditLog;
}> {
  if (!supervisorPin) {
    throw new Error("Supervisor authorization PIN is required for manual cash drawer open.");
  }

  return triggerCashDrawer(printer, {
    triggerReason: "SUPERVISOR_MANUAL_OPEN",
    staffId,
    staffName,
    supervisorPin,
    notes: reasonDescription,
  });
}
