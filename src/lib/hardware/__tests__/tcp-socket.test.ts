import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  sendRawEscPos,
  TcpPrinterClient,
  getSimulatedPrintJobs,
  clearSimulatedPrintJobs,
  isSimulationMode,
} from "../tcp-socket";

describe("TCP Socket Utility (TSK-PRT-01)", () => {
  beforeEach(() => {
    clearSimulatedPrintJobs();
  });

  it("handles headless simulation mode cleanly without network hardware", async () => {
    const testData = new Uint8Array([0x1b, 0x40, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);

    const result = await sendRawEscPos(
      {
        host: "192.168.1.201",
        port: 9100,
        simulation: true,
      },
      testData
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.simulated, true);
    assert.strictEqual(result.bytesWritten, testData.byteLength);
    assert.strictEqual(result.host, "192.168.1.201");
    assert.strictEqual(result.port, 9100);

    const jobs = getSimulatedPrintJobs();
    assert.strictEqual(jobs.length, 1);
    assert.strictEqual(jobs[0].host, "192.168.1.201");
    assert.strictEqual(jobs[0].byteLength, 7);
    assert.deepStrictEqual(Array.from(jobs[0].data), Array.from(testData));
  });

  it("supports TcpPrinterClient class wrapper in simulation mode", async () => {
    const client = new TcpPrinterClient({
      host: "192.168.1.202",
      port: 9100,
      simulation: true,
    });

    const pingResult = await client.ping();
    assert.strictEqual(pingResult.reachable, true);

    const printResult = await client.print(new Uint8Array([0x1b, 0x64, 0x01]));
    assert.strictEqual(printResult.success, true);
    assert.strictEqual(printResult.simulated, true);

    assert.strictEqual(getSimulatedPrintJobs().length, 1);
  });

  it("gracefully catches socket errors and timeouts without uncaught crashes", async () => {
    // Attempting real connection to an unreachable local port with immediate timeout
    const result = await sendRawEscPos(
      {
        host: "127.0.0.1",
        port: 65432, // Non-existent printer port
        simulation: false,
        timeoutMs: 100,
        retries: 0,
      },
      new Uint8Array([0x1b, 0x40])
    );

    // Must return structured error without throwing unhandled exception
    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.strictEqual(result.bytesWritten, 0);
  });
});
