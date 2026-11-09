/**
 * Nexus FnB BMS - Staff Health & KKM/PBT Compliance Engine
 * Malaysia Edition (TSK-HAL-02, SSOT §3.5)
 *
 * Enforces KKM Food Hygiene Regulations 2009 & Municipal Council (PBT: DBKL, MBPJ, MBSJ)
 * statutory health requirements:
 * 1. Strictly 3-year validity on Typhoid Injections (Suntikan Tifoid) with <90d warning.
 * 2. KKM-accredited SLPM Food Handler Training (Latihan Pengendali Makanan) certification.
 * 3. Municipal council audit inspection readiness score.
 */

import {
  CouncilInspectionSummary,
  CouncilReadinessRating,
  StaffComplianceEvaluation,
  StaffHealthFilterOptions,
  StaffHealthRecord,
  TrainingComplianceStatus,
  TyphoidComplianceStatus,
} from "./types";

/**
 * Normalizes a date string or Date object to midnight UTC timestamp
 */
function toUtcDayTimestamp(dateInput: string | Date): number {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Computes statutory Typhoid injection expiry date (strictly 3 years from injection)
 * Example: '2024-05-15' -> '2027-05-15'
 */
export function computeTyphoidExpiry(injectionDateStr: string): string {
  const [yearStr, monthStr, dayStr] = injectionDateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  const expiryYear = year + 3;
  // Handle Feb 29 on leap years gracefully
  const targetDate = new Date(Date.UTC(expiryYear, month, day));
  if (targetDate.getUTCMonth() !== month) {
    // Clamped to last day of February (Feb 28)
    const clampedDate = new Date(Date.UTC(expiryYear, month + 1, 0));
    return clampedDate.toISOString().split("T")[0];
  }

  return targetDate.toISOString().split("T")[0];
}

/**
 * Evaluates individual staff compliance against typhoid injection validity
 * and KKM SLPM food handler training.
 */
export function evaluateStaffHealthStatus(
  record: StaffHealthRecord,
  referenceDate = new Date()
): StaffComplianceEvaluation {
  const todayUtc = toUtcDayTimestamp(referenceDate);
  const expiryUtc = toUtcDayTimestamp(record.typhoidExpiryDate);

  const diffMs = expiryUtc - todayUtc;
  const daysUntilTyphoidExpiry = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let typhoidStatus: TyphoidComplianceStatus = "VALID";
  let typhoidBadgeVariant: "success" | "warning" | "danger" = "success";
  let typhoidLabel = "Valid";

  if (daysUntilTyphoidExpiry <= 0) {
    typhoidStatus = "EXPIRED";
    typhoidBadgeVariant = "danger";
    typhoidLabel =
      daysUntilTyphoidExpiry === 0
        ? "Expires Today"
        : `Expired (${Math.abs(daysUntilTyphoidExpiry)}d ago)`;
  } else if (daysUntilTyphoidExpiry <= 90) {
    typhoidStatus = "EXPIRING_WARNING";
    typhoidBadgeVariant = "warning";
    typhoidLabel = `Expiring (${daysUntilTyphoidExpiry}d)`;
  }

  // Evaluate Food Handler Training certification
  let trainingStatus: TrainingComplianceStatus = "CERTIFIED";
  let trainingBadgeVariant: "success" | "warning" | "danger" = "success";
  let trainingLabel = "Certified (SLPM)";

  const hasCertNumber =
    record.foodHandlerCertNumber && record.foodHandlerCertNumber.trim().length > 0;
  const hasTrainingDate =
    record.trainingDate && record.trainingDate.trim().length > 0;

  if (!hasCertNumber || !hasTrainingDate) {
    trainingStatus = "MISSING";
    trainingBadgeVariant = "danger";
    trainingLabel = "Missing Training";
  } else if (!record.trainingProvider || record.trainingProvider.trim().length === 0) {
    trainingStatus = "PENDING_TRAINING";
    trainingBadgeVariant = "warning";
    trainingLabel = "Pending Verification";
  }

  // Audit readiness requires non-expired typhoid AND accredited training
  const isAuditReady =
    typhoidStatus !== "EXPIRED" && trainingStatus === "CERTIFIED";

  let compoundRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (typhoidStatus === "EXPIRED") {
    compoundRisk = "HIGH";
  } else if (typhoidStatus === "EXPIRING_WARNING" || trainingStatus !== "CERTIFIED") {
    compoundRisk = "MEDIUM";
  }

  return {
    staffId: record.id,
    fullName: record.fullName,
    daysUntilTyphoidExpiry,
    typhoidStatus,
    typhoidBadgeVariant,
    typhoidLabel,
    trainingStatus,
    trainingBadgeVariant,
    trainingLabel,
    isAuditReady,
    compoundRisk,
  };
}

/**
 * Computes municipal council (DBKL, MBPJ, MBSJ) inspection-readiness summary
 */
export function calculateCouncilInspectionSummary(
  records: StaffHealthRecord[],
  referenceDate = new Date()
): CouncilInspectionSummary {
  const foodHandlers = records.filter((r) => r.isFoodHandler);
  const totalStaff = records.length;
  const totalFoodHandlers = foodHandlers.length;

  let fullyCompliantCount = 0;
  let typhoidValidCount = 0;
  let typhoidExpiringSoonCount = 0;
  let typhoidExpiredCount = 0;
  let trainingCertifiedCount = 0;
  let trainingMissingCount = 0;

  for (const staff of foodHandlers) {
    const evaluation = evaluateStaffHealthStatus(staff, referenceDate);

    if (evaluation.isAuditReady) {
      fullyCompliantCount++;
    }

    if (evaluation.typhoidStatus === "VALID") {
      typhoidValidCount++;
    } else if (evaluation.typhoidStatus === "EXPIRING_WARNING") {
      typhoidExpiringSoonCount++;
    } else {
      typhoidExpiredCount++;
    }

    if (evaluation.trainingStatus === "CERTIFIED") {
      trainingCertifiedCount++;
    } else {
      trainingMissingCount++;
    }
  }

  const readinessScore =
    totalFoodHandlers > 0
      ? Math.round((fullyCompliantCount / totalFoodHandlers) * 10000) / 100
      : 100;

  let readinessRating: CouncilReadinessRating = "PBT_AUDIT_READY";
  let grade: "A" | "B" | "C" = "A";

  if (readinessScore >= 95) {
    readinessRating = "PBT_AUDIT_READY";
    grade = "A";
  } else if (readinessScore >= 80) {
    readinessRating = "ACTION_REQUIRED";
    grade = "B";
  } else {
    readinessRating = "CRITICAL_RISK";
    grade = "C";
  }

  // Statutory compound estimation under Food Act 1983 / Food Hygiene Regs (RM 1,000 per violation)
  const nonCompliantFoodHandlers = totalFoodHandlers - fullyCompliantCount;
  const estimatedFineRiskMYR = nonCompliantFoodHandlers * 1000;

  return {
    totalStaff,
    totalFoodHandlers,
    fullyCompliantCount,
    typhoidValidCount,
    typhoidExpiringSoonCount,
    typhoidExpiredCount,
    trainingCertifiedCount,
    trainingMissingCount,
    readinessScore,
    readinessRating,
    grade,
    estimatedFineRiskMYR,
  };
}

/**
 * Filters staff records based on query, outlet, typhoid status, and training status
 */
export function filterStaffHealthRecords(
  records: StaffHealthRecord[],
  filters: StaffHealthFilterOptions,
  referenceDate = new Date()
): StaffHealthRecord[] {
  const query = filters.searchQuery ? filters.searchQuery.toLowerCase().trim() : "";
  const targetOutlet = filters.outletId || "ALL";
  const targetTyphoid = filters.typhoidStatus || "ALL";
  const targetTraining = filters.trainingStatus || "ALL";
  const targetRole = filters.role || "ALL";

  return records.filter((rec) => {
    // Search query match
    if (query) {
      const matchSearch =
        rec.fullName.toLowerCase().includes(query) ||
        rec.employeeCode.toLowerCase().includes(query) ||
        rec.icNumber.toLowerCase().includes(query) ||
        rec.role.toLowerCase().includes(query) ||
        rec.foodHandlerCertNumber.toLowerCase().includes(query);

      if (!matchSearch) return false;
    }

    // Outlet filter
    if (targetOutlet !== "ALL" && rec.outletId !== targetOutlet) {
      return false;
    }

    // Role filter
    if (targetRole !== "ALL" && rec.role !== targetRole) {
      return false;
    }

    const evaluation = evaluateStaffHealthStatus(rec, referenceDate);

    // Typhoid filter
    if (targetTyphoid !== "ALL" && evaluation.typhoidStatus !== targetTyphoid) {
      return false;
    }

    // Training filter
    if (targetTraining !== "ALL" && evaluation.trainingStatus !== targetTraining) {
      return false;
    }

    return true;
  });
}

/**
 * Standard pre-seeded Malaysian kitchen & service personnel dataset
 */
export function getSampleStaffHealthRecords(): StaffHealthRecord[] {
  const now = new Date();
  const formatOffsetDate = (days: number): string => {
    const d = new Date(now.getTime() + days * 86400000);
    return d.toISOString().split("T")[0];
  };

  return [
    {
      id: "stf-001",
      employeeCode: "NX-KTH-01",
      fullName: "Muhammad Hafiz bin Ismail",
      icNumber: "910412-14-5821",
      role: "Head Chef",
      outletId: "out-01",
      outletName: "Nexus Signature Pavilion (KL)",
      isFoodHandler: true,
      typhoidInjectionDate: "2024-01-10",
      typhoidExpiryDate: "2027-01-10", // Valid (>90d)
      typhoidClinicName: "Klinik Mediviron Bukit Bintang",
      typhoidBatchNumber: "TYPH-MY-2024-A19",
      foodHandlerCertNumber: "SLPM-KKM-2023-8821",
      trainingProvider: "Pusat Latihan Pengendali Makanan Hikmah (KKM Accredited)",
      trainingDate: "2023-04-12",
      notes: "Lead culinary operations; full compliance verified",
    },
    {
      id: "stf-002",
      employeeCode: "NX-KTH-02",
      fullName: "Tan Wei Lun",
      icNumber: "950824-10-6133",
      role: "Sous Chef",
      outletId: "out-01",
      outletName: "Nexus Signature Pavilion (KL)",
      isFoodHandler: true,
      typhoidInjectionDate: "2024-03-20",
      typhoidExpiryDate: "2027-03-20", // Valid (>90d)
      typhoidClinicName: "Qualitas Health Clinic KL",
      typhoidBatchNumber: "TYPH-MY-2024-B03",
      foodHandlerCertNumber: "SLPM-KKM-2023-9104",
      trainingProvider: "Akademi Kebersihan Makanan Selangor",
      trainingDate: "2023-06-18",
      notes: "Hot wok and grill specialist",
    },
    {
      id: "stf-003",
      employeeCode: "NX-BAR-01",
      fullName: "Siti Nur Aisyah binti Razak",
      icNumber: "981105-08-5420",
      role: "Head Barista",
      outletId: "out-01",
      outletName: "Nexus Signature Pavilion (KL)",
      isFoodHandler: true,
      typhoidInjectionDate: "2023-02-14",
      typhoidExpiryDate: formatOffsetDate(42), // EXPIRING_WARNING (<90d, e.g. 42 days left)
      typhoidClinicName: "Poliklinik Kota Damansara",
      typhoidBatchNumber: "TYPH-MY-2023-K77",
      foodHandlerCertNumber: "SLPM-KKM-2022-7719",
      trainingProvider: "Pusat Latihan Industri Makanan Lembah Klang",
      trainingDate: "2022-09-05",
      notes: "Typhoid renewal scheduled at clinic next Tuesday",
    },
    {
      id: "stf-004",
      employeeCode: "NX-KTH-03",
      fullName: "Kavitha a/p Subramaniam",
      icNumber: "940618-05-5912",
      role: "Pastry & Dessert Chef",
      outletId: "out-01",
      outletName: "Nexus Signature Pavilion (KL)",
      isFoodHandler: true,
      typhoidInjectionDate: "2024-05-18",
      typhoidExpiryDate: "2027-05-18", // Valid (>90d)
      typhoidClinicName: "Klinik Kesihatan Cheras",
      typhoidBatchNumber: "TYPH-MY-2024-C88",
      foodHandlerCertNumber: "SLPM-KKM-2024-1102",
      trainingProvider: "Pusat Latihan Pengendali Makanan Hikmah",
      trainingDate: "2024-05-10",
      notes: "In charge of pastry line and chilled dessert preparation",
    },
    {
      id: "stf-005",
      employeeCode: "NX-KTH-04",
      fullName: "Ahmad Danish bin Zulkifli",
      icNumber: "010214-14-6331",
      role: "Kitchen Helper",
      outletId: "out-01",
      outletName: "Nexus Signature Pavilion (KL)",
      isFoodHandler: true,
      typhoidInjectionDate: "2023-01-05",
      typhoidExpiryDate: formatOffsetDate(-15), // EXPIRED (15 days ago)
      typhoidClinicName: "Klinik Mediviron Mid Valley",
      typhoidBatchNumber: "TYPH-MY-2023-X11",
      foodHandlerCertNumber: "SLPM-KKM-2023-6621",
      trainingProvider: "Akademi Kebersihan Makanan Selangor",
      trainingDate: "2023-01-04",
      notes: "NON-COMPLIANCE: Temporary reassigned away from food contact until jab updated",
    },
    {
      id: "stf-006",
      employeeCode: "NX-SRV-01",
      fullName: "Lim Mei Ling",
      icNumber: "990730-10-5022",
      role: "Senior Service Crew",
      outletId: "out-01",
      outletName: "Nexus Signature Pavilion (KL)",
      isFoodHandler: true,
      typhoidInjectionDate: "2024-07-01",
      typhoidExpiryDate: "2027-07-01", // Valid
      typhoidClinicName: "BP Healthcare Bangsar",
      typhoidBatchNumber: "TYPH-MY-2024-H22",
      foodHandlerCertNumber: "SLPM-KKM-2024-3401",
      trainingProvider: "Pusat Latihan Makanan KKM Petaling Jaya",
      trainingDate: "2024-06-25",
      notes: "FOH drink and food delivery runner",
    },
    {
      id: "stf-007",
      employeeCode: "NX-SRV-02",
      fullName: "Nurul Farhana binti Othman",
      icNumber: "020915-03-5188",
      role: "Junior Service Crew",
      outletId: "out-01",
      outletName: "Nexus Signature Pavilion (KL)",
      isFoodHandler: true,
      typhoidInjectionDate: "2024-09-10",
      typhoidExpiryDate: "2027-09-10", // Valid
      typhoidClinicName: "Klinik Kesihatan Ampang",
      typhoidBatchNumber: "TYPH-MY-2024-P90",
      foodHandlerCertNumber: "", // MISSING TRAINING
      trainingProvider: "",
      trainingDate: "",
      notes: "Newly onboarded; registered for upcoming SLPM session this Friday",
    },
    {
      id: "stf-008",
      employeeCode: "NX-MGT-01",
      fullName: "Raymond Chia Chee Keong",
      icNumber: "880315-14-5501",
      role: "Outlet Manager",
      outletId: "out-01",
      outletName: "Nexus Signature Pavilion (KL)",
      isFoodHandler: false, // Management / Cash handling only
      typhoidInjectionDate: "2024-02-01",
      typhoidExpiryDate: "2027-02-01",
      typhoidClinicName: "Qualitas Health KL",
      foodHandlerCertNumber: "SLPM-KKM-2020-5512",
      trainingProvider: "Pusat Latihan Pengendali Makanan Hikmah",
      trainingDate: "2020-01-15",
      notes: "Administrative manager; does not prepare or handle unpackaged food",
    },
  ];
}
