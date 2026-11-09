export type OutletType = "FSR" | "QSR";

export interface OutletSettings {
  serviceChargeRate: number; // e.g., 0.10 for FSR, 0.00 for QSR
  sstRate: number; // e.g., 0.06 (6% SST)
  cashRoundingEnabled: boolean; // Bank Negara Malaysia 5-sen cash rounding
  defaultTakeawayFee: number; // packaging fee in RM, e.g., 0.30 or 0.50
  currencyCode: string; // 'MYR'
  timezone: string; // 'Asia/Kuala_Lumpur'
}

export interface Outlet {
  id: string;
  name: string;
  code: string;
  type: OutletType;
  registrationNumber: string; // SSM Business Registration Number (BRN)
  tinNumber: string; // LHDN Tax Identification Number (TIN)
  sstRegistrationNumber?: string; // JKDM SST Registration No
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  halalCertNumber?: string;
  halalCertExpiry?: string;
  settings: OutletSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
