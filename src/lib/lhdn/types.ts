/**
 * LHDN MyInvois e-Invoicing Domain Types
 * Jurisdiction: Malaysia (LHDN / IRBM MyInvois v1.0)
 */

export type LhdnEnvironment = "sandbox" | "production";

export type LhdnIdType = "NRIC" | "BRN" | "PASSPORT" | "ARMY";

export type LhdnValidationStatus =
  | "VALID"
  | "INVALID"
  | "PENDING"
  | "CANCELLED"
  | "REJECTED";

export type LhdnTinClassification =
  | "COMPANY"
  | "INDIVIDUAL"
  | "GENERAL_PUBLIC"
  | "INVALID";

export type LhdnInvoiceTypeCode =
  | "01" // Standard Invoice
  | "02" // Credit Note
  | "03" // Debit Note
  | "04"; // Refund Note

export interface LhdnAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: "MYS" | string;
}

export interface LhdnBuyerDetails {
  tin: string; // Tax Identification Number, e.g. "C1234567890", "IG1234567890", or "EI00000000010"
  idType: LhdnIdType;
  idValue: string; // e.g. NRIC "901201145678" or BRN "202401001234"
  name: string;
  sstRegistrationNo?: string;
  email?: string;
  phone?: string;
  address?: LhdnAddress;
}

export interface LhdnSupplierDetails {
  tin: string;
  idType: LhdnIdType;
  idValue: string;
  name: string;
  sstRegistrationNo?: string;
  email?: string;
  phone?: string;
  address?: LhdnAddress;
}

export interface LhdnInvoiceLineItem {
  id?: string;
  classificationCode: string; // e.g. "001" for F&B Food & Beverage
  description: string;
  unitPrice: number;
  quantity: number;
  discountAmount?: number;
  taxType: string; // e.g. "06" for Service Tax
  taxRate: number; // e.g. 0.06
  taxAmount: number;
  subtotal: number;
  totalPayable: number;
}

export interface LhdnDocumentHash {
  hex: string;
  base64: string;
}

export interface LhdnInvoiceDocument {
  invoiceNumber: string;
  issueDateTime: string; // ISO 8601 string, e.g. 2026-11-09T15:30:00Z
  invoiceTypeCode: LhdnInvoiceTypeCode;
  currencyCode: "MYR";
  supplier: LhdnSupplierDetails;
  buyer: LhdnBuyerDetails;
  lineItems: LhdnInvoiceLineItem[];
  subtotalGross: number;
  totalDiscount: number;
  serviceChargeAmount: number;
  taxableBase: number;
  sstAmount: number;
  packagingFee?: number;
  roundingAdjustment: number;
  totalPayable: number;
  documentHash?: LhdnDocumentHash;
}

export interface LhdnValidationError {
  code: string;
  message: string;
  target?: string;
}

export interface LhdnSubmissionResult {
  success: boolean;
  uuid?: string;
  submissionUid?: string;
  validationStatus: LhdnValidationStatus;
  qrCodeUrl?: string;
  documentHash?: LhdnDocumentHash;
  acceptedAt?: string;
  errorMessage?: string;
  validationErrors?: LhdnValidationError[];
}

export interface LhdnAuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number; // Epoch timestamp ms
  scope: string;
}

export interface LhdnClientConfig {
  clientId?: string;
  clientSecret?: string;
  environment?: LhdnEnvironment;
  mockMode?: boolean;
  timeoutMs?: number;
  tokenRefreshBufferSec?: number;
}

export interface LhdnDocumentDetails {
  uuid: string;
  submissionUid: string;
  status: LhdnValidationStatus;
  dateTimeIssued: string;
  dateTimeValidated?: string;
  buyerTin: string;
  supplierTin: string;
  totalPayable: number;
  qrCodeUrl: string;
}
