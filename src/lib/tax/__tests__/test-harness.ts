import assert from "assert";

export { assert };

export type TestFn = () => void | Promise<void>;

export interface TestCase {
  name: string;
  fn: TestFn;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

export function describe(name: string, fn: () => void) {
  const prevSuite = currentSuite;
  const suite: TestSuite = { name: prevSuite ? `${prevSuite.name} > ${name}` : name, tests: [] };
  suites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = prevSuite;
}

export function it(name: string, fn: TestFn) {
  if (!currentSuite) {
    describe("Default", () => it(name, fn));
    return;
  }
  currentSuite.tests.push({ name, fn });
}

export async function runAllRegisteredSuites(): Promise<{ passed: number; failed: number; success: boolean }> {
  let passed = 0;
  let failed = 0;

  for (const suite of suites) {
    console.log(`\nSuite: ${suite.name}`);
    for (const test of suite.tests) {
      try {
        await test.fn();
        console.log(`  ✓ ${test.name}`);
        passed++;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`  ✗ ${test.name}`);
        console.error(`    ${error.stack || error.message}`);
        failed++;
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed (${suites.length} suites)`);
  console.log(`========================================\n`);

  return { passed, failed, success: failed === 0 };
}
