/**
 * Unit Test Suite for Staff Health Registry & KKM/PBT Compliance Engine
 * Nexus FnB BMS (TSK-HAL-02)
 */

import assert from "node:assert/strict";
import {
  computeTyphoidExpiry,
  evaluateStaffHealthStatus,
  calculateCouncilInspectionSummary,
  filterStaffHealthRecords,
  getSampleStaffHealthRecords,
} from "../staff-health";
import { StaffHealthRecord } from "../types";

export function runStaffHealthTests(): void {
  // Test 1: Statutory 3-year Typhoid Expiry Computation
  assert.equal(computeTyphoidExpiry("2024-05-10"), "2027-05-10");
  assert.equal(computeTyphoidExpiry("2023-11-20"), "2026-11-20");

  // Test 1b: Leap Year handling (Feb 29 + 3 years clamped to Feb 28)
  assert.equal(computeTyphoidExpiry("2024-02-29"), "2027-02-28");

  const refDate = new Date("2026-06-01T00:00:00.000Z");

  // Test 2: Valid Staff Record (>90 days remaining on typhoid & SLPM certified)
  const compliantStaff: StaffHealthRecord = {
    id: "stf-1",
    employeeCode: "EMP-01",
    fullName: "Mohd Hafiz",
    icNumber: "920101-14-1111",
    role: "Head Chef",
    outletId: "out-1",
    outletName: "Pavilion",
    isFoodHandler: true,
    typhoidInjectionDate: "2024-01-15",
    typhoidExpiryDate: "2027-01-15", // >90 days from 2026-06-01 (~228 days)
    foodHandlerCertNumber: "SLPM-KKM-2023-1001",
    trainingProvider: "Akademi KKM",
    trainingDate: "2023-05-10",
  };

  const eval1 = evaluateStaffHealthStatus(compliantStaff, refDate);
  assert.equal(eval1.typhoidStatus, "VALID");
  assert.equal(eval1.typhoidBadgeVariant, "success");
  assert.equal(eval1.trainingStatus, "CERTIFIED");
  assert.equal(eval1.isAuditReady, true);
  assert.equal(eval1.compoundRisk, "LOW");

  // Test 3: Expiring Soon (<90 days remaining)
  // 45 days from 2026-06-01 is 2026-07-16
  const warningStaff: StaffHealthRecord = {
    ...compliantStaff,
    id: "stf-2",
    fullName: "Aisyah Razak",
    typhoidExpiryDate: "2026-07-16",
  };

  const eval2 = evaluateStaffHealthStatus(warningStaff, refDate);
  assert.equal(eval2.typhoidStatus, "EXPIRING_WARNING");
  assert.equal(eval2.typhoidBadgeVariant, "warning");
  assert.equal(eval2.isAuditReady, true); // Still legally valid until expiry date
  assert.equal(eval2.compoundRisk, "MEDIUM");

  // Test 4: Expired Typhoid (<= 0 days)
  const expiredStaff: StaffHealthRecord = {
    ...compliantStaff,
    id: "stf-3",
    fullName: "Danish Zulkifli",
    typhoidExpiryDate: "2026-05-20", // Expired 12 days ago
  };

  const eval3 = evaluateStaffHealthStatus(expiredStaff, refDate);
  assert.equal(eval3.typhoidStatus, "EXPIRED");
  assert.equal(eval3.typhoidBadgeVariant, "danger");
  assert.equal(eval3.isAuditReady, false);
  assert.equal(eval3.compoundRisk, "HIGH");

  // Test 5: Missing Food Handler Training (SLPM)
  const untrainedStaff: StaffHealthRecord = {
    ...compliantStaff,
    id: "stf-4",
    fullName: "Farhana Othman",
    foodHandlerCertNumber: "", // Missing
    trainingDate: "",
  };

  const eval4 = evaluateStaffHealthStatus(untrainedStaff, refDate);
  assert.equal(eval4.trainingStatus, "MISSING");
  assert.equal(eval4.isAuditReady, false);

  // Test 6: Council (PBT) Inspection Readiness Summary
  const mockStaffList = [compliantStaff, warningStaff, expiredStaff, untrainedStaff];
  const summary = calculateCouncilInspectionSummary(mockStaffList, refDate);

  assert.equal(summary.totalStaff, 4);
  assert.equal(summary.totalFoodHandlers, 4);
  // Compliant = compliantStaff (1) + warningStaff (1) = 2
  assert.equal(summary.fullyCompliantCount, 2);
  // Readiness score = 2 / 4 = 50%
  assert.equal(summary.readinessScore, 50.0);
  assert.equal(summary.grade, "C");
  assert.equal(summary.readinessRating, "CRITICAL_RISK");
  // Compound fine risk = 2 non-compliant * RM 1,000 = RM 2,000
  assert.equal(summary.estimatedFineRiskMYR, 2000);

  // Test 7: Filter function
  const filteredExpired = filterStaffHealthRecords(
    mockStaffList,
    { typhoidStatus: "EXPIRED" },
    refDate
  );
  assert.equal(filteredExpired.length, 1);
  assert.equal(filteredExpired[0].fullName, "Danish Zulkifli");

  // Test 8: Sample pre-seeded records exist
  const sampleRecords = getSampleStaffHealthRecords();
  assert.ok(sampleRecords.length >= 7);
}

// Auto-run if executed directly via node
if (typeof require !== "undefined" && require.main === module) {
  runStaffHealthTests();
  console.log("All Staff Health tests passed successfully.");
}
