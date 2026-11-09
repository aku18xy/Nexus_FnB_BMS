/**
 * Nexus FnB BMS - JAKIM Halal Certification Tracker & Expiry Escalation Engine
 * Malaysia Edition (TSK-HAL-01, SSOT §3.4, §6.2)
 *
 * Implements automated multi-tier escalation triggers (60 days, 30 days, expired),
 * recognition of domestic & foreign Islamic certifying bodies, and registry auditing.
 */

import type {
  HalalCertificationRecord,
  HalalFilterOptions,
  HalalRegistrySummary,
  HalalStatusEvaluation,
} from "./types";

/**
 * Normalizes a date string or Date object to midnight UTC timestamp
 */
function toUtcDayTimestamp(dateInput: string | Date): number {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Evaluates Halal certification status against the statutory escalation rules:
 * - > 60 days: VALID (Emerald / success badge)
 * - 31 to 60 days: EXPIRING_SOON_60D (Amber / warning badge - 60d notification tier)
 * - 1 to 30 days: EXPIRING_URGENT_30D (Rose / danger badge - 30d urgent renewal tier)
 * - <= 0 days: EXPIRED (Rose / danger badge - audit breach flag, stop PO approvals)
 * - isHalalCertified = false or missing expiry: NOT_CERTIFIED
 */
export function evaluateHalalStatus(
  expiryDateStr?: string,
  isHalal = true,
  referenceDate = new Date()
): HalalStatusEvaluation {
  if (!isHalal || !expiryDateStr) {
    return {
      status: "NOT_CERTIFIED",
      daysRemaining: 0,
      badgeVariant: "default",
      label: "Non-Certified",
      isAuditBreach: false,
      requiresAction: false,
      escalationTier: "NONE",
    };
  }

  const todayUtc = toUtcDayTimestamp(referenceDate);
  const expiryUtc = toUtcDayTimestamp(expiryDateStr);

  const diffMs = expiryUtc - todayUtc;
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      status: "EXPIRED",
      daysRemaining,
      badgeVariant: "danger",
      label: daysRemaining === 0 ? "Expires Today" : `Expired (${Math.abs(daysRemaining)}d ago)`,
      isAuditBreach: true,
      requiresAction: true,
      escalationTier: "CRITICAL_EXPIRED",
    };
  }

  if (daysRemaining <= 30) {
    return {
      status: "EXPIRING_URGENT_30D",
      daysRemaining,
      badgeVariant: "danger",
      label: `Urgent (${daysRemaining}d left)`,
      isAuditBreach: false,
      requiresAction: true,
      escalationTier: "URGENT_30D",
    };
  }

  if (daysRemaining <= 60) {
    return {
      status: "EXPIRING_SOON_60D",
      daysRemaining,
      badgeVariant: "warning",
      label: `Expiring Soon (${daysRemaining}d)`,
      isAuditBreach: false,
      requiresAction: true,
      escalationTier: "NOTIFY_60D",
    };
  }

  return {
    status: "VALID",
    daysRemaining,
    badgeVariant: "success",
    label: "Valid",
    isAuditBreach: false,
    requiresAction: false,
    escalationTier: "NONE",
  };
}

/**
 * Aggregates summary statistics for a collection of Halal certification records
 */
export function computeHalalSummary(
  records: HalalCertificationRecord[],
  referenceDate = new Date()
): HalalRegistrySummary {
  let validCount = 0;
  let expiring60dCount = 0;
  let expiring30dCount = 0;
  let expiredCount = 0;
  let notCertifiedCount = 0;

  for (const record of records) {
    const evaluation = evaluateHalalStatus(
      record.expiryDate,
      record.isHalalCertified,
      referenceDate
    );

    switch (evaluation.status) {
      case "VALID":
        validCount++;
        break;
      case "EXPIRING_SOON_60D":
        expiring60dCount++;
        break;
      case "EXPIRING_URGENT_30D":
        expiring30dCount++;
        break;
      case "EXPIRED":
        expiredCount++;
        break;
      case "NOT_CERTIFIED":
        notCertifiedCount++;
        break;
    }
  }

  const totalCount = records.length;
  const certifiedCount = totalCount - notCertifiedCount;
  const activeValid = validCount + expiring60dCount;
  const compliancePercentage =
    certifiedCount > 0 ? Math.round((activeValid / certifiedCount) * 10000) / 100 : 0;

  return {
    totalCount,
    validCount,
    expiring60dCount,
    expiring30dCount,
    expiredCount,
    notCertifiedCount,
    compliancePercentage,
  };
}

/**
 * Filters Halal records based on user search term, status tier, and certifying body
 */
export function filterHalalRecords(
  records: HalalCertificationRecord[],
  filters: HalalFilterOptions,
  referenceDate = new Date()
): HalalCertificationRecord[] {
  const query = filters.searchQuery ? filters.searchQuery.toLowerCase().trim() : "";
  const targetStatus = filters.status || "ALL";
  const targetBody = filters.certifyingBody || "ALL";
  const targetCategory = filters.category || "ALL";

  return records.filter((rec) => {
    // Search filter across ingredient, SKU, supplier, cert number
    if (query) {
      const matchSearch =
        rec.ingredientName.toLowerCase().includes(query) ||
        rec.ingredientSku.toLowerCase().includes(query) ||
        rec.supplierName.toLowerCase().includes(query) ||
        rec.certNumber.toLowerCase().includes(query) ||
        rec.certifyingBody.toLowerCase().includes(query);

      if (!matchSearch) return false;
    }

    // Certifying Body filter
    if (targetBody !== "ALL" && rec.certifyingBody !== targetBody) {
      return false;
    }

    // Category filter
    if (targetCategory !== "ALL" && rec.category !== targetCategory) {
      return false;
    }

    // Status filter
    if (targetStatus !== "ALL") {
      const evaluation = evaluateHalalStatus(
        rec.expiryDate,
        rec.isHalalCertified,
        referenceDate
      );
      if (evaluation.status !== targetStatus) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Standard pre-seeded Malaysian F&B Halal raw ingredients catalog for demo & testing.
 * Includes realistic Malaysian and JAKIM-recognized Foreign Halal bodies.
 */
export function getSampleHalalRecords(): HalalCertificationRecord[] {
  const now = new Date();
  const formatOffsetDate = (days: number): string => {
    const d = new Date(now.getTime() + days * 86400000);
    return d.toISOString().split("T")[0];
  };

  return [
    {
      id: "hal-001",
      ingredientSku: "ING-CHK-01",
      ingredientName: "Ayamas Premium Whole Fresh Chicken",
      category: "Poultry & Meat",
      supplierName: "Ayamas Shoppe Sdn Bhd",
      supplierContact: "+603-5633-8888",
      certifyingBody: "JAKIM",
      certNumber: "JAKIM.MS1500:2009-1002-04/2024",
      issueDate: "2024-04-15",
      expiryDate: formatOffsetDate(240), // Valid (>60d)
      isHalalCertified: true,
      notes: "Direct poultry contract for FSR kitchen dishes",
    },
    {
      id: "hal-002",
      ingredientSku: "ING-MK-01",
      ingredientName: "Farm Fresh Pasteurized Pure Fresh Milk",
      category: "Dairy & Beverage",
      supplierName: "Farm Fresh Milk Sdn Bhd",
      supplierContact: "+607-883-2000",
      certifyingBody: "JAKIM",
      certNumber: "JAKIM.MS1500:2009-1088-08/2024",
      issueDate: "2024-08-01",
      expiryDate: formatOffsetDate(180), // Valid (>60d)
      isHalalCertified: true,
      notes: "Barista specialty milk for espresso and teh tarik",
    },
    {
      id: "hal-003",
      ingredientSku: "ING-FLR-01",
      ingredientName: "Cap Sauh All-Purpose Wheat Flour",
      category: "Grains & Baking",
      supplierName: "FFM Berhad",
      supplierContact: "+603-3168-7111",
      certifyingBody: "JAKIM",
      certNumber: "JAKIM.MS1500:2009-1055-11/2023",
      issueDate: "2023-11-20",
      expiryDate: formatOffsetDate(45), // EXPIRING_SOON_60D (31-60d)
      isHalalCertified: true,
      notes: "60-day notification sent to procurement officer for renewal",
    },
    {
      id: "hal-004",
      ingredientSku: "ING-OIL-01",
      ingredientName: "Saji Triple Refined Palm Cooking Oil",
      category: "Oils & Fats",
      supplierName: "Delima Oil Products Sdn Bhd (FGV)",
      supplierContact: "+603-2789-0000",
      certifyingBody: "JAKIM",
      certNumber: "JAKIM.MS1500:2009-1011-02/2024",
      issueDate: "2024-02-10",
      expiryDate: formatOffsetDate(19), // EXPIRING_URGENT_30D (1-30d)
      isHalalCertified: true,
      notes: "URGENT: Renewal audit scheduled with JAIS / JAKIM",
    },
    {
      id: "hal-005",
      ingredientSku: "ING-EGG-01",
      ingredientName: "QL Deli Fresh Grade A Omega Eggs",
      category: "Poultry & Meat",
      supplierName: "QL Foods Sdn Bhd",
      supplierContact: "+603-7801-2288",
      certifyingBody: "JAKIM",
      certNumber: "JAKIM.MS1500:2009-1042-05/2024",
      issueDate: "2024-05-12",
      expiryDate: formatOffsetDate(120), // Valid (>60d)
      isHalalCertified: true,
      notes: "Grade A washed eggs for breakfast and noodles",
    },
    {
      id: "hal-006",
      ingredientSku: "ING-TEA-01",
      ingredientName: "ChaTraMue Number-One Brand Thai Tea",
      category: "Beverage Ingredients",
      supplierName: "Siam Tea Import & Export Co",
      supplierContact: "+66-2-276-8888",
      certifyingBody: "CICOT",
      certNumber: "CICOT.HL.93A001-08-2023",
      issueDate: "2023-08-15",
      expiryDate: formatOffsetDate(-12), // EXPIRED
      isHalalCertified: true,
      notes: "EXPIRED: Purchase order generation suspended until new cert submitted",
    },
    {
      id: "hal-007",
      ingredientSku: "ING-BTR-01",
      ingredientName: "Anchor Pure Salted Creamery Butter",
      category: "Dairy & Baking",
      supplierName: "Fonterra Brands (M) Sdn Bhd",
      supplierContact: "+603-5885-3000",
      certifyingBody: "IFANCA",
      certNumber: "IFANCA-HALAL-NZ-77042",
      issueDate: "2024-01-10",
      expiryDate: formatOffsetDate(300), // Valid
      isHalalCertified: true,
      notes: "JAKIM Recognized Foreign Halal Certification Body (NZ/USA)",
    },
    {
      id: "hal-008",
      ingredientSku: "ING-SYR-01",
      ingredientName: "Sunquick Tropical Mango Fruit Concentrate",
      category: "Beverage Ingredients",
      supplierName: "Barkath Co-Ro Manufacturing",
      supplierContact: "+604-390-7111",
      certifyingBody: "MUIS",
      certNumber: "MUIS-HALAL-SG-2024-9912",
      issueDate: "2024-03-01",
      expiryDate: formatOffsetDate(28), // EXPIRING_URGENT_30D
      isHalalCertified: true,
      notes: "MUIS Singapore recognized certificate; awaiting updated certificate copy",
    },
    {
      id: "hal-009",
      ingredientSku: "ING-NOS-01",
      ingredientName: "Indomie Goreng Specialty Seasoning Mix",
      category: "Seasoning & Spices",
      supplierName: "PT Indofood Sukses Makmur Tbk",
      supplierContact: "+62-21-522-8822",
      certifyingBody: "BPJPH",
      certNumber: "BPJPH-ID0041000012345",
      issueDate: "2024-06-20",
      expiryDate: formatOffsetDate(210), // Valid
      isHalalCertified: true,
      notes: "BPJPH Indonesia recognized by JAKIM under bilateral treaty",
    },
  ];
}
