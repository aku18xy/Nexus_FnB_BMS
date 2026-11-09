import { runAllRegisteredSuites } from "./test-harness";
import "./bnm-rounding.test";
import "./sst-calculator.test";
import "../../lhdn/__tests__/myinvois-client.test";

async function main() {
  console.log("Starting Malaysian FinTech & LHDN Compliance Automated Unit Test Suite...\n");
  const { passed, failed, success } = await runAllRegisteredSuites();
  if (!success) {
    console.error(`Tests failed with ${failed} failure(s).`);
    process.exit(1);
  }
  console.log(`All ${passed} tests passed successfully!`);
}

main().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
