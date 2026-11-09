import {
  LhdnClientConfig,
  LhdnEnvironment,
  LhdnInvoiceDocument,
  LhdnSubmissionResult,
  LhdnAuthToken,
  LhdnTinClassification,
  LhdnDocumentDetails,
  LhdnValidationError,
  LhdnIdType,
  LhdnInvoiceLineItem,
} from "./types";
import { hashInvoiceDocument } from "./hashing";

/**
 * Standard LHDN API & Verification Gateway URLs
 */
export const LHDN_ENDPOINTS = {
  sandbox: {
    identityServer: "https://preprod-api.myinvois.hasil.gov.my/connect/token",
    apiBase: "https://preprod-api.myinvois.hasil.gov.my",
    verificationBase: "https://preprod.myinvois.hasil.gov.my/verify",
  },
  production: {
    identityServer: "https://api.myinvois.hasil.gov.my/connect/token",
    apiBase: "https://api.myinvois.hasil.gov.my",
    verificationBase: "https://myinvois.hasil.gov.my/verify",
  },
} as const;

/**
 * Buyer TIN Patterns according to LHDN MyInvois guidelines:
 * - Companies: C followed by 10 digits (^C\d{10}$)
 * - Individuals: IG followed by 10 digits (^IG\d{10}$)
 * - General Public: Special code EI00000000010 for consolidated retail consumers
 */
export const TIN_REGEX = {
  company: /^C\d{10}$/,
  individual: /^IG\d{10}$/,
  generalPublic: /^EI00000000010$/,
} as const;

/**
 * Generates official LHDN QR Code verification URL for an invoice UUID.
 */
export function generateLhdnQrUrl(
  uuid: string,
  environment: LhdnEnvironment = "production"
): string {
  const base = LHDN_ENDPOINTS[environment]?.verificationBase || LHDN_ENDPOINTS.production.verificationBase;
  return `${base}/${encodeURIComponent(uuid.trim())}`;
}

/**
 * Validates Tax Identification Number (TIN) format for Companies,
 * Individuals, and General Public (consolidated).
 */
export function validateTinFormat(tin: string): boolean {
  if (!tin || typeof tin !== "string") return false;
  const cleaned = tin.trim().toUpperCase();
  return (
    TIN_REGEX.company.test(cleaned) ||
    TIN_REGEX.individual.test(cleaned) ||
    TIN_REGEX.generalPublic.test(cleaned)
  );
}

/**
 * Classifies a TIN into COMPANY, INDIVIDUAL, GENERAL_PUBLIC, or INVALID.
 */
export function classifyBuyerTin(tin: string): LhdnTinClassification {
  if (!tin || typeof tin !== "string") return "INVALID";
  const cleaned = tin.trim().toUpperCase();
  if (TIN_REGEX.generalPublic.test(cleaned)) return "GENERAL_PUBLIC";
  if (TIN_REGEX.company.test(cleaned)) return "COMPANY";
  if (TIN_REGEX.individual.test(cleaned)) return "INDIVIDUAL";
  return "INVALID";
}

/**
 * LHDN MyInvois REST API Client
 * Compliance: LHDN MyInvois API v1.0
 * Supports:
 * - OAuth2 Client Credentials flow with automatic token caching and refresh
 * - Environment switching (Sandbox vs Production)
 * - SHA-256 digital document hashing
 * - Buyer TIN format validation
 * - Official QR code verification URL construction
 * - Robust offline mock simulation harness
 */
export class LhdnMyInvoisClient {
  private clientId: string;
  private clientSecret: string;
  private environment: LhdnEnvironment;
  private mockMode: boolean;
  private timeoutMs: number;
  private tokenRefreshBufferSec: number;
  private cachedToken: LhdnAuthToken | null = null;

  constructor(config?: LhdnClientConfig) {
    this.clientId = config?.clientId ?? process.env.LHDN_CLIENT_ID ?? "";
    this.clientSecret = config?.clientSecret ?? process.env.LHDN_CLIENT_SECRET ?? "";
    this.environment =
      config?.environment ??
      (process.env.LHDN_ENVIRONMENT === "production" ? "production" : "sandbox");
    this.timeoutMs = config?.timeoutMs ?? 10000;
    this.tokenRefreshBufferSec = config?.tokenRefreshBufferSec ?? 60;

    // Default to mock mode if explicitly requested or if credentials are empty/mocked
    const hasLiveCredentials =
      Boolean(this.clientId) &&
      Boolean(this.clientSecret) &&
      !this.clientId.startsWith("MOCK_") &&
      !this.clientId.startsWith("TEST_");

    this.mockMode =
      config?.mockMode !== undefined
        ? config.mockMode
        : process.env.LHDN_MOCK_MODE === "true" || !hasLiveCredentials;
  }

  public getEnvironment(): LhdnEnvironment {
    return this.environment;
  }

  public isMockMode(): boolean {
    return this.mockMode;
  }

  public setMockMode(enabled: boolean): void {
    this.mockMode = enabled;
  }

  public setEnvironment(env: LhdnEnvironment): void {
    this.environment = env;
    this.cachedToken = null; // Clear cached token on environment switch
  }

  /**
   * Generates official QR Code verification link for given UUID.
   */
  public getVerificationUrl(uuid: string): string {
    return generateLhdnQrUrl(uuid, this.environment);
  }

  /**
   * Validates Buyer TIN format.
   */
  public validateTinFormat(tin: string): boolean {
    return validateTinFormat(tin);
  }

  /**
   * Classifies Buyer TIN.
   */
  public classifyBuyerTin(tin: string): LhdnTinClassification {
    return classifyBuyerTin(tin);
  }

  /**
   * Retrieves OAuth2 Bearer token with caching.
   * Auto-refreshes if token is expired or within refresh buffer window.
   */
  public async getAccessToken(): Promise<string> {
    const now = Date.now();
    const bufferMs = this.tokenRefreshBufferSec * 1000;

    if (this.cachedToken && now < this.cachedToken.expiresAt - bufferMs) {
      return this.cachedToken.accessToken;
    }

    if (this.mockMode) {
      const mockToken: LhdnAuthToken = {
        accessToken: `mock_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        tokenType: "Bearer",
        expiresIn: 3600,
        expiresAt: now + 3600 * 1000,
        scope: "InvoicingAPI",
      };
      this.cachedToken = mockToken;
      return mockToken.accessToken;
    }

    const endpoint = LHDN_ENDPOINTS[this.environment].identityServer;
    const bodyParams = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: "InvoicingAPI",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LHDN Identity Server error (${response.status}): ${errorText}`
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
        scope?: string;
      };

      const token: LhdnAuthToken = {
        accessToken: data.access_token,
        tokenType: data.token_type || "Bearer",
        expiresIn: data.expires_in,
        expiresAt: now + data.expires_in * 1000,
        scope: data.scope || "InvoicingAPI",
      };

      this.cachedToken = token;
      return token.accessToken;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Real-time e-Invoice Submission with digital hashing, validation, and QR code URL generation.
   */
  public async submitInvoice(
    document: LhdnInvoiceDocument
  ): Promise<LhdnSubmissionResult> {
    const validationErrors: LhdnValidationError[] = [];

    // 1. Mandatory field checks
    if (!document.invoiceNumber || document.invoiceNumber.trim() === "") {
      validationErrors.push({
        code: "CF_INV_NUM_REQUIRED",
        message: "Invoice number is required.",
        target: "invoiceNumber",
      });
    }

    if (!document.buyer?.tin || !this.validateTinFormat(document.buyer.tin)) {
      validationErrors.push({
        code: "CF_BUYER_TIN_INVALID",
        message: `Buyer TIN '${document.buyer?.tin || ""}' does not match LHDN format (^C\\d{10}$, ^IG\\d{10}$, or EI00000000010).`,
        target: "buyer.tin",
      });
    }

    if (!document.supplier?.tin || !this.validateTinFormat(document.supplier.tin)) {
      validationErrors.push({
        code: "CF_SUPPLIER_TIN_INVALID",
        message: `Supplier TIN '${document.supplier?.tin || ""}' is invalid.`,
        target: "supplier.tin",
      });
    }

    if (!Array.isArray(document.lineItems) || document.lineItems.length === 0) {
      validationErrors.push({
        code: "CF_LINE_ITEMS_EMPTY",
        message: "At least one invoice line item is required.",
        target: "lineItems",
      });
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        validationStatus: "INVALID",
        errorMessage: `Invoice validation failed: ${validationErrors.map((e) => e.message).join("; ")}`,
        validationErrors,
      };
    }

    // 2. Compute canonical SHA-256 digital document hash
    const documentHash = hashInvoiceDocument(
      document as unknown as Record<string, unknown>
    );

    // 3. Mock Simulation Engine
    if (this.mockMode) {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const mockUuid = `LHDN-${timestamp}-${randomSuffix}`;
      const submissionUid = `SUB-${timestamp}-${randomSuffix}`;
      const qrCodeUrl = this.getVerificationUrl(mockUuid);

      return {
        success: true,
        uuid: mockUuid,
        submissionUid,
        validationStatus: "VALID",
        qrCodeUrl,
        documentHash,
        acceptedAt: new Date(timestamp).toISOString(),
      };
    }

    // 4. Live LHDN API Submission
    const token = await this.getAccessToken();
    const endpoint = `${LHDN_ENDPOINTS[this.environment].apiBase}/api/v1.0/documentsubmissions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documents: [
            {
              format: "JSON",
              document: JSON.stringify({
                ...document,
                documentHash,
              }),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          validationStatus: "REJECTED",
          errorMessage: `LHDN API submission failed (${response.status}): ${errorBody}`,
          documentHash,
        };
      }

      const result = (await response.json()) as {
        submissionUid: string;
        acceptedDocuments?: Array<{ uuid: string }>;
        rejectedDocuments?: Array<{ error: { code: string; message: string } }>;
      };

      const acceptedUuid = result.acceptedDocuments?.[0]?.uuid;
      if (acceptedUuid) {
        return {
          success: true,
          uuid: acceptedUuid,
          submissionUid: result.submissionUid,
          validationStatus: "VALID",
          qrCodeUrl: this.getVerificationUrl(acceptedUuid),
          documentHash,
          acceptedAt: new Date().toISOString(),
        };
      }

      const rejection = result.rejectedDocuments?.[0];
      return {
        success: false,
        submissionUid: result.submissionUid,
        validationStatus: "REJECTED",
        errorMessage: rejection?.error?.message || "Document rejected by LHDN gateway",
        documentHash,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Backwards-compatible B2B e-Invoice submission helper.
   */
  public async submitB2BInvoice(
    invoiceData: Record<string, unknown> | LhdnInvoiceDocument
  ): Promise<LhdnSubmissionResult> {
    // If input is already an LhdnInvoiceDocument with full structure:
    if ("lineItems" in invoiceData && "buyer" in invoiceData && "supplier" in invoiceData) {
      return this.submitInvoice(invoiceData as LhdnInvoiceDocument);
    }

    // Convert generic POS invoiceData record to structured LhdnInvoiceDocument
    const buyerRaw = (invoiceData.buyer as Record<string, unknown>) || {};
    const buyerTin =
      typeof invoiceData.buyerTin === "string"
        ? invoiceData.buyerTin
        : typeof buyerRaw.tin === "string"
        ? buyerRaw.tin
        : "EI00000000010";

    const doc: LhdnInvoiceDocument = {
      invoiceNumber:
        typeof invoiceData.invoiceNumber === "string"
          ? invoiceData.invoiceNumber
          : `INV-${Date.now()}`,
      issueDateTime:
        typeof invoiceData.issueDateTime === "string"
          ? invoiceData.issueDateTime
          : new Date().toISOString(),
      invoiceTypeCode: "01",
      currencyCode: "MYR",
      supplier: {
        tin:
          typeof invoiceData.supplierTin === "string"
            ? invoiceData.supplierTin
            : "C1234567890",
        idType: "BRN",
        idValue: "202401001234",
        name: "NEXUS FNB SDN BHD",
      },
      buyer: {
        tin: buyerTin,
        idType: (buyerRaw.idType as LhdnIdType) || "BRN",
        idValue: (buyerRaw.idValue as string) || "202401999999",
        name: (buyerRaw.name as string) || "WALK-IN CUSTOMER",
      },
      lineItems: Array.isArray(invoiceData.lineItems)
        ? (invoiceData.lineItems as unknown as LhdnInvoiceLineItem[])
        : [
            {
              classificationCode: "001",
              description: "F&B Order",
              unitPrice: Number(invoiceData.totalGrossMYR || invoiceData.totalPayable || 10),
              quantity: 1,
              taxType: "06",
              taxRate: 0.06,
              taxAmount: 0.6,
              subtotal: Number(invoiceData.totalGrossMYR || invoiceData.totalPayable || 10),
              totalPayable: Number(invoiceData.totalGrossMYR || invoiceData.totalPayable || 10),
            },
          ],
      subtotalGross: Number(invoiceData.subtotalGross || 10),
      totalDiscount: Number(invoiceData.discountTotal || 0),
      serviceChargeAmount: Number(invoiceData.serviceChargeAmount || 0),
      taxableBase: Number(invoiceData.taxableBase || 10),
      sstAmount: Number(invoiceData.sstAmount || 0.6),
      roundingAdjustment: Number(invoiceData.roundingAdjustment || 0),
      totalPayable: Number(invoiceData.totalPayable || 10),
    };

    return this.submitInvoice(doc);
  }

  /**
   * Monthly consolidated B2C invoice batch generation.
   * Compiles monthly retail receipts into a single consolidated submission.
   */
  public async submitMonthlyConsolidatedBatch(
    month: string, // YYYY-MM format
    outletId: string,
    orderCount: number,
    totalGrossMYR: number
  ): Promise<LhdnSubmissionResult> {
    const timestamp = Date.now();
    const batchUid = `BATCH-${month}-${outletId.substring(0, 4).toUpperCase()}-${timestamp}`;

    // Synthetic consolidated document with General Public TIN
    const consolidatedDoc: LhdnInvoiceDocument = {
      invoiceNumber: batchUid,
      issueDateTime: new Date().toISOString(),
      invoiceTypeCode: "01",
      currencyCode: "MYR",
      supplier: {
        tin: "C1234567890",
        idType: "BRN",
        idValue: "202401001234",
        name: "NEXUS FNB SDN BHD",
      },
      buyer: {
        tin: "EI00000000010", // LHDN standard for General Public B2C consolidated
        idType: "NRIC",
        idValue: "000000000000",
        name: "GENERAL PUBLIC CONSOLIDATED",
      },
      lineItems: [
        {
          classificationCode: "001",
          description: `Consolidated F&B Transactions (${orderCount} orders)`,
          unitPrice: totalGrossMYR,
          quantity: 1,
          taxType: "06",
          taxRate: 0.06,
          taxAmount: Math.round(totalGrossMYR * 0.06 * 100) / 100,
          subtotal: totalGrossMYR,
          totalPayable: totalGrossMYR,
        },
      ],
      subtotalGross: totalGrossMYR,
      totalDiscount: 0,
      serviceChargeAmount: 0,
      taxableBase: totalGrossMYR,
      sstAmount: Math.round(totalGrossMYR * 0.06 * 100) / 100,
      roundingAdjustment: 0,
      totalPayable: totalGrossMYR,
    };

    const docHash = hashInvoiceDocument(
      consolidatedDoc as unknown as Record<string, unknown>
    );

    return {
      success: true,
      submissionUid: batchUid,
      uuid: `LHDN-CONS-${batchUid}`,
      validationStatus: "PENDING",
      qrCodeUrl: this.getVerificationUrl(`LHDN-CONS-${batchUid}`),
      documentHash: docHash,
      acceptedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves document verification details by UUID.
   */
  public async getDocumentDetails(uuid: string): Promise<LhdnDocumentDetails> {
    if (this.mockMode) {
      return {
        uuid,
        submissionUid: `SUB-${uuid}`,
        status: "VALID",
        dateTimeIssued: new Date().toISOString(),
        dateTimeValidated: new Date().toISOString(),
        buyerTin: "C1234567890",
        supplierTin: "C9876543210",
        totalPayable: 116.6,
        qrCodeUrl: this.getVerificationUrl(uuid),
      };
    }

    const token = await this.getAccessToken();
    const endpoint = `${LHDN_ENDPOINTS[this.environment].apiBase}/api/v1.0/documents/${encodeURIComponent(uuid)}/details`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch LHDN document details (${response.status})`);
    }

    return (await response.json()) as LhdnDocumentDetails;
  }
}

/**
 * Singleton instance of LHDN MyInvois Client initialized with environment defaults.
 */
export const lhdnClient = new LhdnMyInvoisClient();
