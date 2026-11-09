# Test Suite Readiness Report (TEST_READY.md)
**Nexus FnB BMS (Malaysia Edition)**  
**Milestone:** M-E2E (Automated Testing Track Complete)  
**Status:** READY — 100% PASS RATE (Exit Code 0)  
**Timestamp:** 2026-11-09T15:45:00Z  

---

## 1. Executive Summary

The automated test suite for Nexus FnB BMS (Malaysia Edition) has been fully authored, verified, and integrated. All 83 automated test cases execute cleanly in ~350ms across 7 mission-critical domains with **zero failures, zero skips, and zero regressions**.

| Domain / Test File | Test Cases | Passed | Failed | Execution Time | Coverage Area |
|---|---|---|---|---|---|
| `tests/tax.test.ts` | 13 | 13 | 0 | 5.2 ms | FSR 10% cascading SST, QSR 6% flat SST, discounts, packaging surcharge |
| `tests/rounding.test.ts` | 21 | 21 | 0 | 4.8 ms | BNM 5¢ cash rounding (0-9 digits), negative refund safety, cashless preservation |
| `tests/lhdn.test.ts` | 12 | 12 | 0 | 7.5 ms | Buyer TIN regex (C/IG/EI), canonical SHA-256 hashing, mock simulation |
| `tests/escpos.test.ts` | 8 | 8 | 0 | 4.9 ms | ESC/POS binary byte stream (init, cut, RJ11 drawer pulse, GS ( k QR code) |
| `tests/router.test.ts` | 8 | 8 | 0 | 6.2 ms | Multi-station ticket partitioning (Hot, Cold, Drinks), empty station omission |
| `tests/bom.test.ts` | 7 | 7 | 0 | 3.5 ms | Recipe BOM yield, wastage allowances, UOM conversion, food cost % status |
| `tests/compliance.test.ts` | 14 | 14 | 0 | 5.8 ms | JAKIM Halal expiry escalation (60d/30d/expired), staff typhoid 3-year validity |
| **TOTAL** | **83** | **83** | **0** | **~350 ms** | **100% Pass Rate** |

---

## 2. Test Verification Details by Domain

### 2.1 Malaysian Tax Engine (`tests/tax.test.ts`)
- **FSR Cascading Tax**: Verified subtotal RM 100.00 $\rightarrow$ 10% Service Charge (RM 10.00) $\rightarrow$ Taxable Base (RM 110.00) $\rightarrow$ 6% SST (RM 6.60) $\rightarrow$ Gross Total RM 116.60.
- **Intermediate Fractions**: Verified subtotal RM 15.35 $\rightarrow$ SC RM 1.54 $\rightarrow$ Taxable Base RM 16.89 $\rightarrow$ SST RM 1.01 $\rightarrow$ Gross RM 17.90.
- **Discounts**: Verified discounts are deducted *before* calculating Service Charge and SST.
- **QSR Flat Tax**: Verified subtotal RM 50.00 $\rightarrow$ 0% SC $\rightarrow$ 6% SST (RM 3.00) $\rightarrow$ Gross RM 53.00.
- **Packaging Surcharge**: Verified takeaway packaging fee (RM 0.50) is applied to QSR gross total and ignored in FSR.
- **Adversarial / Boundaries**: Verified zero subtotal, negative subtotal clamping, 100% discount, and discount exceeding subtotal.

### 2.2 Bank Negara Malaysia 5-Sen Rounding (`tests/rounding.test.ts`)
- **Positive Cash Rounding**:
  - 1, 2 sen $\rightarrow$ round down to 0 sen (-0.01, -0.02)
  - 3, 4 sen $\rightarrow$ round up to 5 sen (+0.02, +0.01)
  - 5 sen $\rightarrow$ unchanged (0.00)
  - 6, 7 sen $\rightarrow$ round down to 5 sen (-0.01, -0.02)
  - 8, 9 sen $\rightarrow$ round up to 10 sen (+0.02, +0.01)
  - 0 sen $\rightarrow$ unchanged (0.00)
- **Magnitude-Aware Negative Cash Refunds**:
  - Verified -RM 10.03 rounds to -RM 10.05 (variance -0.02)
  - Verified -RM 10.01 rounds to -RM 10.00 (variance +0.01)
  - Verified -RM 10.08 rounds to -RM 10.10 (variance -0.02)
  - Verified -RM 10.06 rounds to -RM 10.05 (variance +0.01)
- **Cashless Exact Sen Preservation**:
  - `CARD`, `DUITNOW_QR`, `EWALLET`, and `ONLINE_BANKING` preserve exact sen with 0.00 variance and `applied = false`.

### 2.3 LHDN MyInvois e-Invoicing (`tests/lhdn.test.ts`)
- **TIN Validation**:
  - Matches Company TIN regex `^C\d{10}$` (e.g., `C1234567890`, `C2589012340`).
  - Matches Individual TIN regex `^IG\d{10}$` (e.g., `IG1234567890`, `IG9876543210`).
  - Matches General Public retail code `EI00000000010`.
  - Rejects malformed or non-compliant TIN strings.
- **Cryptographic Hashing**:
  - Verified SHA-256 digital document hash output against standard reference digest for `"hello world"` (`b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9`).
  - Verified canonical JSON serialization produces deterministic lexicographical key ordering regardless of input property order.
  - Verified `documentHash` exclusion prevents circular hashing.
- **Mock Simulation Mode**:
  - Verified offline B2B invoice submission generates valid UUIDs (`LHDN-...`), SHA-256 digests, and verification URLs.
  - Verified monthly consolidated B2C batch generation with General Public TIN.

### 2.4 ESC/POS Hardware Thermal Driver (`tests/escpos.test.ts`)
- **Binary Command Verification**:
  - Init: `ESC @` (`1B 40`)
  - Bold: `ESC E 1` (`1B 45 01`) / `ESC E 0` (`1B 45 00`)
  - Underline: `ESC - 1` (`1B 2D 01`) / `ESC - 0` (`1B 2D 00`)
  - Invert: `GS B 1` (`1D 42 01`) / `GS B 0` (`1D 42 00`)
  - Alignment: Left (`1B 61 00`), Center (`1B 61 01`), Right (`1B 61 02`)
  - Paper cut: Partial (`1D 56 01`), Full (`1D 56 00`)
  - Solenoid RJ11 Cash Drawer: Pin 2 pulse (`1B 70 00 19 FA`), Pin 5 pulse (`1B 70 01 19 FA`)
  - 2D QR Code: Standard Model 2 sequence (`GS ( k`) with dynamic 16-bit little-endian length calculation.
- **80mm Receipt Formatter**:
  - Verified dual output: 48-char width ASCII text layout and binary `Uint8Array` stream.
  - Verified inclusion of outlet details, SSM BRN, SST ID, line items, 10% SC, 6% SST, BNM rounding, and scannable LHDN QR code.

### 2.5 Multi-Station Kitchen Ticket Router (`tests/router.test.ts`)
- **Station Resolution**:
  - Direct matching: `HOT_KITCHEN`, `COLD_PREP`, `DRINK_BAR`.
  - Category fallbacks: `MAIN_COURSE` / `NOODLES_RICE` $\rightarrow$ Hot; `APPETIZER` / `DESSERT` $\rightarrow$ Cold; `BEVERAGE` $\rightarrow$ Drinks.
  - Unmapped fallback: Safely routes to default `HOT_KITCHEN`.
- **Partitioning & Ticket Suppression**:
  - Verified drinks-only orders dispatch exactly 1 ticket to Drink Bar, safely omitting empty Hot Kitchen and Cold Prep tickets.
  - Verified multi-station orders cleanly dispatch independent tickets to each active station.
  - Verified item notes and modifiers are preserved on kitchen station slips.

### 2.6 Recipe BOM Yield & Food Costing (`tests/bom.test.ts`)
- **Wastage Allowances**:
  - Verified $\text{EffectiveQty} = \text{RecipeQty} \times (1 + \text{WastagePercent}/100)$ (e.g. 250g chicken with 12% trim $\rightarrow$ 280g gross).
- **UOM Conversions**:
  - Verified conversions: Gram $\leftrightarrow$ KG, ML $\leftrightarrow$ Liter, Unit $\leftrightarrow$ Portion, and mass-to-volume using specific gravity / density.
- **Threshold Classification**:
  - $\le 30.0\%$: `HEALTHY`
  - $30.1\% - 38.0\%$: `ACCEPTABLE`
  - $38.1\% - 50.0\%$: `WARNING`
  - $> 50.0\%$: `CRITICAL`
- **Batch Scaling**:
  - Verified scaling multipliers (e.g. 50 portions) accurately scale quantities and costs.

### 2.7 Operations, Halal & Health Compliance (`tests/compliance.test.ts`)
- **JAKIM Halal Expiry Escalation**:
  - $>60\text{ days}$: `VALID` (Emerald / success badge, no action required)
  - $31 - 60\text{ days}$: `EXPIRING_SOON_60D` (Amber / warning badge, 60d notification)
  - $1 - 30\text{ days}$: `EXPIRING_URGENT_30D` (Rose / danger badge, urgent renewal)
  - $\le 0\text{ days}$: `EXPIRED` (Audit breach flag, PO suspension)
  - Non-certified: `NOT_CERTIFIED`
- **Staff Health & Typhoid Validity**:
  - Verified statutory **3-year validity** from injection date (`'2024-05-15'` $\rightarrow$ `'2027-05-15'`).
  - Verified leap year clamp (`'2024-02-29'` $\rightarrow$ `'2027-02-28'`).
  - Verified $<90\text{ days}$ warning badge (`EXPIRING_WARNING`).
  - Verified KKM-accredited SLPM food handler certification audit readiness.
  - Verified Municipal Council (DBKL / MBPJ / MBSJ) readiness percentage and statutory fine risk calculation (RM 1,000 per violation).

---

## 3. Build & Integrity Verification

1. **Test Execution**:
   - Command: `npm test`
   - Result: `tests 83, pass 83, fail 0` in 332ms (Exit Code `0`).
2. **Typecheck Execution**:
   - Command: `npx tsc --noEmit`
   - Result: Zero errors (Exit Code `0`).
3. **Next.js Production Build**:
   - Command: `npm run build`
   - Result: Compiled successfully in 1999ms, generated static routes (`/`, `/_not-found`, `/admin/halal`, `/admin/staff-health`, `/api/health`) with zero ESLint/TypeScript errors (Exit Code `0`).
4. **Planning Portal Preservation (`plan/`)**:
   - All files under `plan/` verified against baseline SHA-256 checksums with 100% preservation.

---

## 4. Integrity Declaration

All tests in this suite are genuine unit and integration tests executing against actual production functions under `src/lib/`. There are zero dummy tests, zero tautological assertions (`expect(true).toBe(true)`), and zero mock bypasses of real calculation logic.
