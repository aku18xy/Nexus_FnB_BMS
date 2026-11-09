/**
 * Nexus FnB BMS - Staff Health & PBT Compliance Data Contracts
 * Malaysia Edition (TSK-HAL-02, SSOT §3.5)
 *
 * Enforces KKM Food Hygiene Regulations 2009 & Municipal Council (PBT: DBKL, MBPJ, MBSJ)
 * statutory health requirements (3-year Typhoid injection & SLPM training records).
 */

export type TyphoidComplianceStatus = "VALID" | "EXPIRING_WARNING" | "EXPIRED";

export type TrainingComplianceStatus = "CERTIFIED" | "PENDING_TRAINING" | "MISSING";

export type CouncilReadinessRating = "PBT_AUDIT_READY" | "ACTION_REQUIRED" | "CRITICAL_RISK";

export interface StaffHealthRecord {
  id: string;
  employeeCode: string;
  fullName: string;
  icNumber: string; // Malaysian NRIC (YYMMDD-SS-NNNN) or Passport
  role: string; // e.g. "Head Chef", "Sous Chef", "Line Cook", "Barista", "Kitchen Helper", "Service Crew"
  outletId: string;
  outletName: string;
  isFoodHandler: boolean; // Direct contact with food/beverages
  typhoidInjectionDate: string; // YYYY-MM-DD
  typhoidExpiryDate: string; // YYYY-MM-DD (calculated 3 years from injection)
  typhoidClinicName?: string; // Clinic / Hospital where injection administered
  typhoidBatchNumber?: string; // Vaccine batch number
  foodHandlerCertNumber: string; // KKM SLPM certificate serial number
  trainingProvider: string; // Accredited Sekolah Latihan Pengendali Makanan (SLPM)
  trainingDate: string; // YYYY-MM-DD
  medicalCertificateUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffComplianceEvaluation {
  staffId: string;
  fullName: string;
  daysUntilTyphoidExpiry: number;
  typhoidStatus: TyphoidComplianceStatus;
  typhoidBadgeVariant: "success" | "warning" | "danger";
  typhoidLabel: string;
  trainingStatus: TrainingComplianceStatus;
  trainingBadgeVariant: "success" | "warning" | "danger";
  trainingLabel: string;
  isAuditReady: boolean; // 100% valid typhoid + valid SLPM training
  compoundRisk: "LOW" | "MEDIUM" | "HIGH";
}

export interface CouncilInspectionSummary {
  totalStaff: number;
  totalFoodHandlers: number;
  fullyCompliantCount: number;
  typhoidValidCount: number;
  typhoidExpiringSoonCount: number;
  typhoidExpiredCount: number;
  trainingCertifiedCount: number;
  trainingMissingCount: number;
  readinessScore: number; // % of food handlers fully compliant
  readinessRating: CouncilReadinessRating;
  grade: "A" | "B" | "C";
  estimatedFineRiskMYR: number; // Potential KKM/PBT compound risk (RM 1,000 per non-compliant staff)
}

export interface StaffHealthFilterOptions {
  searchQuery?: string;
  outletId?: "ALL" | string;
  typhoidStatus?: "ALL" | TyphoidComplianceStatus;
  trainingStatus?: "ALL" | TrainingComplianceStatus;
  role?: "ALL" | string;
}
