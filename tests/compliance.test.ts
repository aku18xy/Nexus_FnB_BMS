import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateHalalStatus,
  computeHalalSummary,
  filterHalalRecords,
  getSampleHalalRecords,
} from "@/lib/halal/halal-tracker";
import {
  computeTyphoidExpiry,
  evaluateStaffHealthStatus,
  calculateCouncilInspectionSummary,
  getSampleStaffHealthRecords,
} from "@/lib/compliance/staff-health";
import { HalalCertificationRecord } from "@/lib/halal/types";
import { StaffHealthRecord } from "@/lib/compliance/types";

// ============================================================================
// 1. JAKIM Halal Certification Expiry Escalation Tests
// ============================================================================

test("Halal Status - Greater than 60 days remaining is VALID", () => {
  const refDate = new Date("2026-11-09T00:00:00Z");
  const expiry = "2027-04-15"; // ~157 days ahead
  const evalResult = evaluateHalalStatus(expiry, true, refDate);

  assert.equal(evalResult.status, "VALID");
  assert.equal(evalResult.badgeVariant, "success");
  assert.equal(evalResult.requiresAction, false);
  assert.equal(evalResult.isAuditBreach, false);
  assert.equal(evalResult.escalationTier, "NONE");
  assert.ok(evalResult.daysRemaining > 60);
});

test("Halal Status - Between 31 and 60 days remaining is EXPIRING_SOON_60D", () => {
  const refDate = new Date("2026-11-09T00:00:00Z");
  const expiry = "2026-12-24"; // 45 days ahead
  const evalResult = evaluateHalalStatus(expiry, true, refDate);

  assert.equal(evalResult.status, "EXPIRING_SOON_60D");
  assert.equal(evalResult.badgeVariant, "warning");
  assert.equal(evalResult.requiresAction, true);
  assert.equal(evalResult.isAuditBreach, false);
  assert.equal(evalResult.escalationTier, "NOTIFY_60D");
  assert.equal(evalResult.daysRemaining, 45);
});

test("Halal Status - Between 1 and 30 days remaining is EXPIRING_URGENT_30D", () => {
  const refDate = new Date("2026-11-09T00:00:00Z");
  const expiry = "2026-11-28"; // 19 days ahead
  const evalResult = evaluateHalalStatus(expiry, true, refDate);

  assert.equal(evalResult.status, "EXPIRING_URGENT_30D");
  assert.equal(evalResult.badgeVariant, "danger");
  assert.equal(evalResult.requiresAction, true);
  assert.equal(evalResult.isAuditBreach, false);
  assert.equal(evalResult.escalationTier, "URGENT_30D");
  assert.equal(evalResult.daysRemaining, 19);
});

test("Halal Status - 0 or negative days remaining is EXPIRED (Audit Breach)", () => {
  const refDate = new Date("2026-11-09T00:00:00Z");
  const expiry = "2026-10-28"; // Expired 12 days ago
  const evalResult = evaluateHalalStatus(expiry, true, refDate);

  assert.equal(evalResult.status, "EXPIRED");
  assert.equal(evalResult.badgeVariant, "danger");
  assert.equal(evalResult.requiresAction, true);
  assert.equal(evalResult.isAuditBreach, true);
  assert.equal(evalResult.escalationTier, "CRITICAL_EXPIRED");
  assert.equal(evalResult.daysRemaining, -12);
});

test("Halal Status - Non-certified ingredient evaluates to NOT_CERTIFIED", () => {
  const evalResult = evaluateHalalStatus(undefined, false);
  assert.equal(evalResult.status, "NOT_CERTIFIED");
  assert.equal(evalResult.requiresAction, false);
});

test("Halal Summary & Registry Auditing", () => {
  const records = getSampleHalalRecords();
  const summary = computeHalalSummary(records);

  assert.ok(summary.totalCount > 0);
  assert.ok(summary.validCount > 0);
  assert.ok(summary.expiring60dCount > 0);
  assert.ok(summary.expiring30dCount > 0);
  assert.ok(summary.expiredCount > 0);
  assert.ok(summary.compliancePercentage > 0 && summary.compliancePercentage <= 100);
});

test("Halal Filtering - By certifying body and status", () => {
  const records = getSampleHalalRecords();
  const jakimRecords = filterHalalRecords(records, { certifyingBody: "JAKIM" });
  assert.ok(jakimRecords.every((r) => r.certifyingBody === "JAKIM"));

  const cicotRecords = filterHalalRecords(records, { certifyingBody: "CICOT" });
  assert.ok(cicotRecords.every((r) => r.certifyingBody === "CICOT"));

  const searchRecords = filterHalalRecords(records, { searchQuery: "Chicken" });
  assert.ok(searchRecords.length >= 1);
});

// ============================================================================
// 2. Staff Health & Typhoid 3-Year Validity Tests
// ============================================================================

test("Typhoid Expiry Calculator - Strictly 3-year statutory validity", () => {
  assert.equal(computeTyphoidExpiry("2024-05-15"), "2027-05-15");
  assert.equal(computeTyphoidExpiry("2023-01-10"), "2026-01-10");
  assert.equal(computeTyphoidExpiry("2021-12-01"), "2024-12-01");
});

test("Typhoid Expiry Calculator - Leap year Feb 29 clamped to Feb 28", () => {
  // 2024 is a leap year; 2027 is not
  assert.equal(computeTyphoidExpiry("2024-02-29"), "2027-02-28");
});

test("Staff Health Evaluation - Valid Typhoid (>90d) and Certified Training", () => {
  const refDate = new Date("2026-11-09T00:00:00Z");
  const record: StaffHealthRecord = {
    id: "stf-test-1",
    employeeCode: "EMP-01",
    fullName: "Ahmad Staff",
    icNumber: "900101-14-1234",
    role: "Chef",
    outletId: "out-01",
    outletName: "Outlet 1",
    isFoodHandler: true,
    typhoidInjectionDate: "2024-06-01",
    typhoidExpiryDate: "2027-06-01", // ~204 days left
    foodHandlerCertNumber: "SLPM-2024-001",
    trainingProvider: "SLPM Academy",
    trainingDate: "2024-05-20",
  };

  const evalResult = evaluateStaffHealthStatus(record, refDate);
  assert.equal(evalResult.typhoidStatus, "VALID");
  assert.equal(evalResult.typhoidBadgeVariant, "success");
  assert.equal(evalResult.trainingStatus, "CERTIFIED");
  assert.equal(evalResult.isAuditReady, true);
  assert.equal(evalResult.compoundRisk, "LOW");
});

test("Staff Health Evaluation - Expiring Typhoid Warning (<90d)", () => {
  const refDate = new Date("2026-11-09T00:00:00Z");
  const record: StaffHealthRecord = {
    id: "stf-test-2",
    employeeCode: "EMP-02",
    fullName: "Sarah Crew",
    icNumber: "950202-10-5678",
    role: "Barista",
    outletId: "out-01",
    outletName: "Outlet 1",
    isFoodHandler: true,
    typhoidInjectionDate: "2023-12-20",
    typhoidExpiryDate: "2026-12-20", // 41 days left (<90d)
    foodHandlerCertNumber: "SLPM-2023-999",
    trainingProvider: "SLPM Academy",
    trainingDate: "2023-12-10",
  };

  const evalResult = evaluateStaffHealthStatus(record, refDate);
  assert.equal(evalResult.typhoidStatus, "EXPIRING_WARNING");
  assert.equal(evalResult.typhoidBadgeVariant, "warning");
  assert.equal(evalResult.isAuditReady, true); // Still technically valid, but warned
  assert.equal(evalResult.compoundRisk, "MEDIUM");
});

test("Staff Health Evaluation - Expired Typhoid (High Risk & Audit Failure)", () => {
  const refDate = new Date("2026-11-09T00:00:00Z");
  const record: StaffHealthRecord = {
    id: "stf-test-3",
    employeeCode: "EMP-03",
    fullName: "Badrul Helper",
    icNumber: "000303-14-9999",
    role: "Kitchen Helper",
    outletId: "out-01",
    outletName: "Outlet 1",
    isFoodHandler: true,
    typhoidInjectionDate: "2023-10-01",
    typhoidExpiryDate: "2026-10-01", // Expired 39 days ago
    foodHandlerCertNumber: "SLPM-2023-123",
    trainingProvider: "SLPM Academy",
    trainingDate: "2023-09-15",
  };

  const evalResult = evaluateStaffHealthStatus(record, refDate);
  assert.equal(evalResult.typhoidStatus, "EXPIRED");
  assert.equal(evalResult.typhoidBadgeVariant, "danger");
  assert.equal(evalResult.isAuditReady, false);
  assert.equal(evalResult.compoundRisk, "HIGH");
});

test("Staff Health Evaluation - Missing Food Handler Training fails audit readiness", () => {
  const refDate = new Date("2026-11-09T00:00:00Z");
  const record: StaffHealthRecord = {
    id: "stf-test-4",
    employeeCode: "EMP-04",
    fullName: "New Crew",
    icNumber: "030404-08-1111",
    role: "Service Crew",
    outletId: "out-01",
    outletName: "Outlet 1",
    isFoodHandler: true,
    typhoidInjectionDate: "2026-01-01",
    typhoidExpiryDate: "2029-01-01", // Valid
    foodHandlerCertNumber: "", // Missing
    trainingProvider: "",
    trainingDate: "",
  };

  const evalResult = evaluateStaffHealthStatus(record, refDate);
  assert.equal(evalResult.trainingStatus, "MISSING");
  assert.equal(evalResult.isAuditReady, false);
  assert.equal(evalResult.compoundRisk, "MEDIUM");
});

test("Municipal Council (PBT) Inspection Readiness Summary", () => {
  const sampleRecords = getSampleStaffHealthRecords();
  const summary = calculateCouncilInspectionSummary(sampleRecords);

  assert.ok(summary.totalStaff >= 8);
  assert.ok(summary.totalFoodHandlers >= 7);
  assert.ok(summary.fullyCompliantCount > 0);
  assert.ok(summary.readinessScore > 0 && summary.readinessScore <= 100);
  assert.ok(["A", "B", "C"].includes(summary.grade));
  assert.ok(
    ["PBT_AUDIT_READY", "ACTION_REQUIRED", "CRITICAL_RISK"].includes(
      summary.readinessRating
    )
  );
  // Estimated fine: RM 1,000 per non-compliant staff
  const expectedNonCompliant = summary.totalFoodHandlers - summary.fullyCompliantCount;
  assert.equal(summary.estimatedFineRiskMYR, expectedNonCompliant * 1000);
});
