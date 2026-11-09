/**
 * Nexus FnB BMS - Halal Certification & Supply Traceability Data Contracts
 * Malaysia Edition (TSK-HAL-01, SSOT §3.4, §6.2)
 */

export type HalalCertBody =
  | "JAKIM" // Malaysia (Jabatan Kemajuan Islam Malaysia)
  | "JAIS" // Selangor (Jabatan Agama Islam Selangor)
  | "JAWI" // Wilayah Persekutuan (Jabatan Agama Islam Wilayah Persekutuan)
  | "MUIS" // Singapore (Majlis Ugama Islam Singapura - JAKIM Recognized FHCB)
  | "CICOT" // Thailand (The Central Islamic Council of Thailand - JAKIM Recognized FHCB)
  | "BPJPH" // Indonesia (Badan Penyelenggara Jaminan Produk Halal - JAKIM Recognized FHCB)
  | "MUI" // Indonesia (Majelis Ulama Indonesia)
  | "IFANCA" // USA (Islamic Food and Nutrition Council of America - JAKIM Recognized FHCB)
  | "HMC" // UK (Halal Monitoring Committee - JAKIM Recognized FHCB)
  | "HFA" // UK (Halal Food Authority)
  | "AFIC" // Australia (Australian Federation of Islamic Councils)
  | "OTHER";

export type HalalEscalationStatus =
  | "VALID"
  | "EXPIRING_SOON_60D"
  | "EXPIRING_URGENT_30D"
  | "EXPIRED"
  | "NOT_CERTIFIED";

export interface HalalCertificationRecord {
  id: string;
  ingredientSku: string;
  ingredientName: string;
  category: string;
  supplierName: string;
  supplierContact?: string;
  certifyingBody: HalalCertBody | string;
  certNumber: string;
  issueDate?: string; // ISO date YYYY-MM-DD
  expiryDate: string; // ISO date YYYY-MM-DD
  isHalalCertified: boolean;
  documentUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HalalStatusEvaluation {
  status: HalalEscalationStatus;
  daysRemaining: number;
  badgeVariant: "success" | "warning" | "danger" | "default";
  label: string;
  isAuditBreach: boolean;
  requiresAction: boolean;
  escalationTier: "NONE" | "NOTIFY_60D" | "URGENT_30D" | "CRITICAL_EXPIRED";
}

export interface HalalRegistrySummary {
  totalCount: number;
  validCount: number;
  expiring60dCount: number;
  expiring30dCount: number;
  expiredCount: number;
  notCertifiedCount: number;
  compliancePercentage: number; // (validCount + expiring60dCount) / totalCertified * 100
}

export interface HalalFilterOptions {
  searchQuery?: string;
  status?: "ALL" | HalalEscalationStatus;
  certifyingBody?: "ALL" | string;
  category?: "ALL" | string;
}
