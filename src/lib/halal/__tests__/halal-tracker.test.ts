/**
 * Unit Test Suite for JAKIM Halal Certification Registry & Escalation Engine
 * Nexus FnB BMS (TSK-HAL-01)
 */

import assert from "node:assert/strict";
import {
  evaluateHalalStatus,
  computeHalalSummary,
  filterHalalRecords,
  getSampleHalalRecords,
} from "../halal-tracker";
import { HalalCertificationRecord } from "../types";

export function runHalalTrackerTests(): void {
  const refDate = new Date("2026-06-01T00:00:00.000Z");

  // Test 1: Valid Status (> 60 days)
  const validEval = evaluateHalalStatus("2026-10-01", true, refDate);
  assert.equal(validEval.status, "VALID");
  assert.equal(validEval.badgeVariant, "success");
  assert.equal(validEval.requiresAction, false);
  assert.equal(validEval.isAuditBreach, false);
  assert.ok(validEval.daysRemaining > 60);

  // Test 2: Expiring Soon 60-day Escalation (31 to 60 days)
  // 45 days from 2026-06-01 is 2026-07-16
  const expiring60dEval = evaluateHalalStatus("2026-07-16", true, refDate);
  assert.equal(expiring60dEval.status, "EXPIRING_SOON_60D");
  assert.equal(expiring60dEval.badgeVariant, "warning");
  assert.equal(expiring60dEval.requiresAction, true);
  assert.equal(expiring60dEval.escalationTier, "NOTIFY_60D");

  // Test 3: Urgent Renewal 30-day Escalation (1 to 30 days)
  // 15 days from 2026-06-01 is 2026-06-16
  const urgent30dEval = evaluateHalalStatus("2026-06-16", true, refDate);
  assert.equal(urgent30dEval.status, "EXPIRING_URGENT_30D");
  assert.equal(urgent30dEval.badgeVariant, "danger");
  assert.equal(urgent30dEval.requiresAction, true);
  assert.equal(urgent30dEval.escalationTier, "URGENT_30D");

  // Test 4: Expired Certificate (<= 0 days)
  const expiredEval = evaluateHalalStatus("2026-05-25", true, refDate);
  assert.equal(expiredEval.status, "EXPIRED");
  assert.equal(expiredEval.badgeVariant, "danger");
  assert.equal(expiredEval.isAuditBreach, true);
  assert.equal(expiredEval.requiresAction, true);
  assert.equal(expiredEval.escalationTier, "CRITICAL_EXPIRED");

  // Test 5: Non-certified Item
  const nonCertifiedEval = evaluateHalalStatus("2026-10-01", false, refDate);
  assert.equal(nonCertifiedEval.status, "NOT_CERTIFIED");
  assert.equal(nonCertifiedEval.badgeVariant, "default");

  // Test 6: Summary aggregation logic
  const mockRecords: HalalCertificationRecord[] = [
    {
      id: "1",
      ingredientSku: "SKU-1",
      ingredientName: "Ayamas Chicken",
      category: "Poultry",
      supplierName: "Ayamas",
      certifyingBody: "JAKIM",
      certNumber: "JAKIM-001",
      expiryDate: "2026-12-01", // Valid
      isHalalCertified: true,
    },
    {
      id: "2",
      ingredientSku: "SKU-2",
      ingredientName: "Cap Sauh Flour",
      category: "Flour",
      supplierName: "FFM",
      certifyingBody: "JAKIM",
      certNumber: "JAKIM-002",
      expiryDate: "2026-07-15", // Expiring 60d
      isHalalCertified: true,
    },
    {
      id: "3",
      ingredientSku: "SKU-3",
      ingredientName: "Saji Oil",
      category: "Oil",
      supplierName: "Saji",
      certifyingBody: "JAKIM",
      certNumber: "JAKIM-003",
      expiryDate: "2026-06-15", // Urgent 30d
      isHalalCertified: true,
    },
    {
      id: "4",
      ingredientSku: "SKU-4",
      ingredientName: "Thai Tea",
      category: "Tea",
      supplierName: "Siam Tea",
      certifyingBody: "CICOT",
      certNumber: "CICOT-001",
      expiryDate: "2026-05-01", // Expired
      isHalalCertified: true,
    },
  ];

  const summary = computeHalalSummary(mockRecords, refDate);
  assert.equal(summary.totalCount, 4);
  assert.equal(summary.validCount, 1);
  assert.equal(summary.expiring60dCount, 1);
  assert.equal(summary.expiring30dCount, 1);
  assert.equal(summary.expiredCount, 1);
  // Active valid = valid (1) + expiring60d (1) = 2 out of 4 certified = 50%
  assert.equal(summary.compliancePercentage, 50.0);

  // Test 7: Filter function
  const filteredCicot = filterHalalRecords(
    mockRecords,
    { certifyingBody: "CICOT" },
    refDate
  );
  assert.equal(filteredCicot.length, 1);
  assert.equal(filteredCicot[0].certifyingBody, "CICOT");

  const filteredUrgent = filterHalalRecords(
    mockRecords,
    { status: "EXPIRING_URGENT_30D" },
    refDate
  );
  assert.equal(filteredUrgent.length, 1);
  assert.equal(filteredUrgent[0].ingredientSku, "SKU-3");

  // Test 8: Sample catalog pre-population has records
  const sampleRecords = getSampleHalalRecords();
  assert.ok(sampleRecords.length >= 8);
}

// Auto-run if executed directly via node
if (typeof require !== "undefined" && require.main === module) {
  runHalalTrackerTests();
  console.log("All Halal Tracker tests passed successfully.");
}
