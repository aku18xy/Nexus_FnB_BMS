/**
 * Direct TCP Port 9100 Socket Utility for LAN Thermal Receipt & Kitchen Printers
 * Nexus FnB BMS (Malaysia Edition)
 *
 * Provides resilient socket communication with timeout handling, retry backoff,
 * and a first-class headless simulation harness for CI/CD and testing environments.
 */

import * as net from "net";
import { PrinterConfig, SocketTransmissionResult } from "./types";

/**
 * Record of simulated print transmission
 */
export interface SimulatedPrintJob {
  id: string;
  host: string;
  port: number;
  data: Uint8Array;
  byteLength: number;
  timestamp: string;
}

// In-memory registry of simulated print jobs for headless test assertions
const simulatedPrintJobs: SimulatedPrintJob[] = [];

/**
 * Query all simulated print jobs received in headless mode
 */
export function getSimulatedPrintJobs(): SimulatedPrintJob[] {
  return [...simulatedPrintJobs];
}

/**
 * Clear the in-memory simulation registry
 */
export function clearSimulatedPrintJobs(): void {
  simulatedPrintJobs.length = 0;
}

/**
 * Retrieve the latest simulated print job
 */
export function getLastSimulatedPrintJob(): SimulatedPrintJob | undefined {
  return simulatedPrintJobs[simulatedPrintJobs.length - 1];
}

/**
 * Check if running in simulated or headless environment
 */
export function isSimulationMode(config?: Partial<PrinterConfig>): boolean {
  if (config?.simulation !== undefined) {
    return Boolean(config.simulation);
  }
  if (process.env.PRINTER_SIMULATION_MODE === "true" || process.env.PRINTER_SIMULATION_MODE === "1") {
    return true;
  }
  // In automated test environments without physical printers, default to simulation
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  return false;
}

/**
 * Send raw byte payload to LAN thermal printer over TCP port 9100
 */
export async function sendRawEscPos(
  config: PrinterConfig,
  data: Uint8Array | Buffer | number[]
): Promise<SocketTransmissionResult> {
  const host = config.host || "127.0.0.1";
  const port = config.port || 9100;
  const timeoutMs = config.timeoutMs ?? 5000;
  const maxRetries = config.retries ?? 0;

  // Convert input to Uint8Array
  const uint8Data =
    data instanceof Uint8Array
      ? data
      : Buffer.isBuffer(data)
      ? new Uint8Array(data)
      : new Uint8Array(data);

  // 1. Simulation / Headless Mode Handler
  if (isSimulationMode(config)) {
    const startTime = Date.now();
    const job: SimulatedPrintJob = {
      id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      host,
      port,
      data: uint8Data,
      byteLength: uint8Data.byteLength,
      timestamp: new Date().toISOString(),
    };
    simulatedPrintJobs.push(job);

    return {
      success: true,
      bytesWritten: uint8Data.byteLength,
      durationMs: Date.now() - startTime,
      host,
      port,
      simulated: true,
    };
  }

  // 2. Real TCP Socket Connection with Retries
  let attempts = 0;
  let lastError: { message: string; code?: string } = { message: "Unknown socket error" };

  while (attempts <= maxRetries) {
    attempts++;
    const startTime = Date.now();

    try {
      const result = await new Promise<SocketTransmissionResult>((resolve) => {
        const socket = new net.Socket();
        let isResolved = false;

        const safeResolve = (res: SocketTransmissionResult) => {
          if (!isResolved) {
            isResolved = true;
            socket.removeAllListeners();
            socket.destroy();
            resolve(res);
          }
        };

        // Timeout handler
        socket.setTimeout(timeoutMs);
        socket.on("timeout", () => {
          safeResolve({
            success: false,
            bytesWritten: 0,
            durationMs: Date.now() - startTime,
            host,
            port,
            error: `Connection timed out after ${timeoutMs}ms`,
            errorCode: "ETIMEDOUT",
          });
        });

        // Error handler (ECONNREFUSED, ENOTFOUND, EHOSTUNREACH, etc.)
        socket.on("error", (err: NodeJS.ErrnoException) => {
          safeResolve({
            success: false,
            bytesWritten: 0,
            durationMs: Date.now() - startTime,
            host,
            port,
            error: err.message,
            errorCode: err.code || "ERR_SOCKET",
          });
        });

        // Connect and transmit
        socket.connect(port, host, () => {
          const buffer = Buffer.from(uint8Data.buffer, uint8Data.byteOffset, uint8Data.byteLength);

          socket.write(buffer, (err) => {
            if (err) {
              safeResolve({
                success: false,
                bytesWritten: 0,
                durationMs: Date.now() - startTime,
                host,
                port,
                error: err.message,
                errorCode: (err as NodeJS.ErrnoException).code || "ERR_WRITE",
              });
            } else {
              socket.end(() => {
                safeResolve({
                  success: true,
                  bytesWritten: buffer.length,
                  durationMs: Date.now() - startTime,
                  host,
                  port,
                });
              });
            }
          });
        });
      });

      if (result.success) {
        return result;
      }

      lastError = { message: result.error || "Socket error", code: result.errorCode };
    } catch (unexpected) {
      const err = unexpected as Error;
      lastError = { message: err.message || "Unexpected exception" };
    }

    // Exponential backoff between retries if configured
    if (attempts <= maxRetries) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempts - 1), 3000)));
    }
  }

  return {
    success: false,
    bytesWritten: 0,
    durationMs: 0,
    host,
    port,
    error: lastError.message,
    errorCode: lastError.code || "ECONNFAILED",
  };
}

/**
 * High-level TCP Printer Client
 */
export class TcpPrinterClient {
  private config: PrinterConfig;

  constructor(config: PrinterConfig) {
    this.config = {
      port: 9100,
      timeoutMs: 5000,
      retries: 0,
      paperWidth: 48,
      ...config,
    };
  }

  /**
   * Print raw ESC/POS byte sequence
   */
  public async print(data: Uint8Array | Buffer | number[]): Promise<SocketTransmissionResult> {
    return sendRawEscPos(this.config, data);
  }

  /**
   * Health check / probe printer accessibility over port 9100
   */
  public async ping(timeoutMs = 2000): Promise<{ reachable: boolean; durationMs: number; error?: string }> {
    if (isSimulationMode(this.config)) {
      return { reachable: true, durationMs: 5 };
    }

    const host = this.config.host || "127.0.0.1";
    const port = this.config.port || 9100;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on("connect", () => {
        socket.destroy();
        resolve({ reachable: true, durationMs: Date.now() - startTime });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ reachable: false, durationMs: Date.now() - startTime, error: "ETIMEDOUT" });
      });

      socket.on("error", (err: NodeJS.ErrnoException) => {
        socket.destroy();
        resolve({ reachable: false, durationMs: Date.now() - startTime, error: err.code || err.message });
      });

      socket.connect(port, host);
    });
  }

  public getConfig(): Readonly<PrinterConfig> {
    return { ...this.config };
  }
}
