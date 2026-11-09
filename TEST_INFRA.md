# Automated Test Suite Infrastructure & Architecture
**Nexus FnB BMS (Malaysia Edition)**  
**Milestone:** M-E2E (Automated Testing Track)  
**Date:** 2026-11-09  

---

## 1. Test Harness Overview & Architecture

The Nexus FnB BMS test infrastructure is designed for high-throughput, deterministic, zero-network-dependency execution. It accommodates cloud CI/CD container sandboxes and developer workstations by pairing Vitest configuration standards with Node.js 20+ native sub-millisecond test execution.

### Key Pillars
1. **Zero External Dependencies**: All test suites execute locally in-memory without requiring live PostgreSQL instances, physical thermal printers, or government LHDN API credentials.
2. **First-Class Path Alias Resolution**: Transparent `@/*` path mapping to `./src/*` across all TypeScript modules via custom module interceptor (`tests/register.js`).
3. **Dual Execution Interface**:
   - `npm test` (mapped to `"vitest run"` in `package.json`).
   - `npx vitest run` or `./node_modules/.bin/vitest run`.
   - `node -r ./tests/register.js --test tests/*.test.ts`.
4. **Sub-second Execution**: All 83 automated test cases execute in ~350ms total.

---

## 2. Directory Layout & Test Suite Catalog

```
tests/
├── register.js           # JITI & Module._resolveFilename loader for TypeScript & @/ alias
├── tax.test.ts           # 13 tests: FSR 10% cascading SST, QSR 6% flat SST, discounts & edge cases
├── rounding.test.ts      # 21 tests: BNM 5-sen cash rounding, negative refund safety, cashless preservation
├── lhdn.test.ts          # 12 tests: TIN regex validation, SHA-256 digital document digests, mock simulation
├── escpos.test.ts        #  8 tests: Raw ESC/POS byte sequences (init, bold, cut, drawer pulse, GS ( k QR)
├── router.test.ts        #  8 tests: Multi-station kitchen ticket routing (Hot, Cold, Drinks, omissions)
├── bom.test.ts           #  7 tests: Recipe BOM yield, wastage allowances, UOM conversions, food cost %
└── compliance.test.ts    # 14 tests: JAKIM Halal expiry escalation tiers & staff typhoid 3-year validity
```

**Total Test Count:** **83 automated unit and integration tests** (100% pass rate).

---

## 3. Test Runner Configuration (`vitest.config.ts`)

```typescript
import path from "path";

export default {
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
```

---

## 4. How to Execute Tests

### Run Full Test Suite
```bash
npm test
# Or
npx vitest run
```

### Run Specific Test Suite
```bash
npm test tests/tax.test.ts
npm test tests/rounding.test.ts
npm test tests/lhdn.test.ts
npm test tests/escpos.test.ts
npm test tests/router.test.ts
npm test tests/bom.test.ts
npm test tests/compliance.test.ts
```

### Direct Node.js Execution
```bash
node -r ./tests/register.js --test tests/*.test.ts
```

---

## 5. Domain Mocking & Hardware Simulation Strategy

1. **Hardware Driver Simulation (`src/lib/hardware/tcp-socket.ts`)**:
   - Features built-in simulation mode (`simulation: true` or auto-detection).
   - Captures raw ESC/POS byte streams in-memory without attempting real TCP sockets against port 9100.
2. **LHDN Mock Engine (`src/lib/lhdn/myinvois-client.ts`)**:
   - Implements offline simulation mode producing deterministic UUIDs (`LHDN-${timestamp}-${suffix}`), SHA-256 digests, and validation URLs (`https://myinvois.hasil.gov.my/verify/${uuid}`).
3. **Pure Math Calculations**:
   - `sst-calculator.ts`, `bnm-rounding.ts`, and `bom-calculator.ts` operate as pure stateless calculation engines.
