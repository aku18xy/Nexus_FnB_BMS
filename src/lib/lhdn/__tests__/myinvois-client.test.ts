import { describe, it, assert } from "./test-harness";
import {
  LhdnMyInvoisClient,
  validateTinFormat,
  classifyBuyerTin,
  generateLhdnQrUrl,
} from "../myinvois-client";
import {
  canonicalizeJson,
  computeSha256,
  hashInvoiceDocument,
} from "../hashing";
import { LhdnInvoiceDocument } from "../types";

describe("TSK-LHDN-01: LHDN MyInvois REST API Client & Signature Gateway", () => {
  const getClient = () =>
    new LhdnMyInvoisClient({
      mockMode: true,
      environment: "sandbox",
    });

  describe("TIN Validation & Classification", () => {
    it("validates Malaysian Company TINs (^C\\d{10}$)", () => {
      assert.equal(validateTinFormat("C1234567890"), true);
      assert.equal(validateTinFormat("c1234567890"), true); // Case-insensitive
      assert.equal(validateTinFormat("  C9876543210  "), true); // Trims whitespace
      assert.equal(classifyBuyerTin("C1234567890"), "COMPANY");
    });

    it("validates Malaysian Individual TINs (^IG\\d{10}$)", () => {
      assert.equal(validateTinFormat("IG1234567890"), true);
      assert.equal(validateTinFormat("ig9876543210"), true);
      assert.equal(classifyBuyerTin("IG1234567890"), "INDIVIDUAL");
    });

    it("validates General Public B2C consolidated TIN (EI00000000010)", () => {
      assert.equal(validateTinFormat("EI00000000010"), true);
      assert.equal(validateTinFormat("ei00000000010"), true);
      assert.equal(classifyBuyerTin("EI00000000010"), "GENERAL_PUBLIC");
    });

    it("rejects malformed, short, or invalid TIN strings", () => {
      assert.equal(validateTinFormat(""), false);
      assert.equal(validateTinFormat("INVALID"), false);
      assert.equal(validateTinFormat("12345"), false);
      assert.equal(validateTinFormat("C12345"), false); // Only 5 digits
      assert.equal(validateTinFormat("IG123456789"), false); // Only 9 digits
      assert.equal(validateTinFormat("C12345678901"), false); // 11 digits
      assert.equal(classifyBuyerTin("XYZ123"), "INVALID");
    });
  });

  describe("QR Code Verification URL Generator", () => {
    it("generates official production verification URL", () => {
      const uuid = "LHDN-1700000000-XYZ123";
      const url = generateLhdnQrUrl(uuid, "production");
      assert.equal(url, "https://myinvois.hasil.gov.my/verify/LHDN-1700000000-XYZ123");
    });

    it("generates official sandbox verification URL", () => {
      const uuid = "LHDN-1700000000-XYZ123";
      const url = generateLhdnQrUrl(uuid, "sandbox");
      assert.equal(url, "https://preprod.myinvois.hasil.gov.my/verify/LHDN-1700000000-XYZ123");
    });

    it("client instance generates URL matching its configured environment", () => {
      const client = getClient();
      client.setEnvironment("sandbox");
      assert.match(client.getVerificationUrl("DOC-001"), /^https:\/\/preprod\.myinvois\.hasil\.gov\.my\/verify\/DOC-001/);

      client.setEnvironment("production");
      assert.match(client.getVerificationUrl("DOC-001"), /^https:\/\/myinvois\.hasil\.gov\.my\/verify\/DOC-001/);
    });
  });

  describe("SHA-256 Digital Document Hashing & Canonicalization", () => {
    it("produces deterministic 64-char hex and 44-char base64 hashes", () => {
      const hash = computeSha256("test-canonical-content");
      assert.equal(hash.hex.length, 64);
      assert.equal(hash.base64.length, 44);
      assert.match(hash.hex, /^[0-9a-f]{64}$/);
    });

    it("guarantees canonical JSON key sorting across nested objects", () => {
      const obj1 = { z: 1, a: 2, m: { y: "bar", x: "foo" } };
      const obj2 = { a: 2, m: { x: "foo", y: "bar" }, z: 1 };

      const c1 = canonicalizeJson(obj1);
      const c2 = canonicalizeJson(obj2);

      assert.equal(c1, c2);
      assert.equal(c1, '{"a":2,"m":{"x":"foo","y":"bar"},"z":1}');
    });

    it("hashInvoiceDocument ignores any pre-existing documentHash field", () => {
      const doc = {
        invoiceNumber: "INV-001",
        totalPayable: 100,
        documentHash: { hex: "dummy", base64: "dummy" },
      };
      const cleanDoc = {
        invoiceNumber: "INV-001",
        totalPayable: 100,
      };

      const h1 = hashInvoiceDocument(doc);
      const h2 = hashInvoiceDocument(cleanDoc);

      assert.equal(h1.hex, h2.hex);
      assert.equal(h1.base64, h2.base64);
    });
  });

  describe("OAuth2 Token Management & Caching", () => {
    it("returns valid bearer token and caches it in memory", async () => {
      const client = getClient();
      const token1 = await client.getAccessToken();
      assert.ok(token1);
      assert.match(token1, /^mock_jwt_/);

      const token2 = await client.getAccessToken();
      assert.equal(token1, token2); // Cached token reused
    });

    it("clears cached token when environment changes", async () => {
      const client = getClient();
      const token1 = await client.getAccessToken();
      client.setEnvironment("production");
      const token2 = await client.getAccessToken();
      assert.notEqual(token1, token2);
    });
  });

  describe("e-Invoice Document Submission & Mock Simulation Harness", () => {
    const validDoc: LhdnInvoiceDocument = {
      invoiceNumber: "FSR-20261109-0042",
      issueDateTime: "2026-11-09T15:30:00.000Z",
      invoiceTypeCode: "01",
      currencyCode: "MYR",
      supplier: {
        tin: "C1234567890",
        idType: "BRN",
        idValue: "202401001234",
        name: "NEXUS FNB SDN BHD",
      },
      buyer: {
        tin: "C9876543210",
        idType: "BRN",
        idValue: "202401999999",
        name: "CORPORATE CLIENT SDN BHD",
      },
      lineItems: [
        {
          classificationCode: "001",
          description: "Wagyu Beef Burger Set",
          unitPrice: 50.0,
          quantity: 2,
          taxType: "06",
          taxRate: 0.06,
          taxAmount: 6.6,
          subtotal: 100.0,
          totalPayable: 116.6,
        },
      ],
      subtotalGross: 100.0,
      totalDiscount: 0.0,
      serviceChargeAmount: 10.0,
      taxableBase: 110.0,
      sstAmount: 6.6,
      roundingAdjustment: 0.0,
      totalPayable: 116.6,
    };

    it("submits valid document and returns VALID status with digital hash and QR link", async () => {
      const client = getClient();
      const result = await client.submitInvoice(validDoc);

      assert.equal(result.success, true);
      assert.equal(result.validationStatus, "VALID");
      assert.ok(result.uuid);
      assert.ok(result.submissionUid);
      assert.ok(result.qrCodeUrl);
      assert.match(result.qrCodeUrl, /^https:\/\/preprod\.myinvois\.hasil\.gov\.my\/verify\/LHDN-/);
      assert.ok(result.documentHash);
      assert.equal(result.documentHash.hex.length, 64);
      assert.equal(result.documentHash.base64.length, 44);
    });

    it("rejects document with invalid buyer TIN", async () => {
      const client = getClient();
      const invalidDoc = {
        ...validDoc,
        buyer: {
          ...validDoc.buyer,
          tin: "MALFORMED_TIN",
        },
      };

      const result = await client.submitInvoice(invalidDoc);
      assert.equal(result.success, false);
      assert.equal(result.validationStatus, "INVALID");
      assert.ok(result.validationErrors && result.validationErrors.length > 0);
      assert.equal(result.validationErrors[0].code, "CF_BUYER_TIN_INVALID");
    });

    it("rejects document with empty line items", async () => {
      const client = getClient();
      const emptyDoc = {
        ...validDoc,
        lineItems: [],
      };

      const result = await client.submitInvoice(emptyDoc);
      assert.equal(result.success, false);
      assert.equal(result.validationStatus, "INVALID");
      assert.equal(result.validationErrors?.[0].code, "CF_LINE_ITEMS_EMPTY");
    });

    it("supports backwards-compatible submitB2BInvoice method", async () => {
      const client = getClient();
      const result = await client.submitB2BInvoice({
        invoiceNumber: "B2B-101",
        buyerTin: "C1234567890",
        totalGrossMYR: 116.6,
      });

      assert.equal(result.success, true);
      assert.equal(result.validationStatus, "VALID");
      assert.ok(result.uuid);
      assert.ok(result.qrCodeUrl);
    });

    it("supports monthly consolidated B2C batch submission with General Public TIN", async () => {
      const client = getClient();
      const result = await client.submitMonthlyConsolidatedBatch(
        "2026-10",
        "FSR-BANGSAR",
        1420,
        156720.5
      );

      assert.equal(result.success, true);
      assert.equal(result.validationStatus, "PENDING");
      assert.match(result.submissionUid || "", /^BATCH-2026-10-FSR-/);
      assert.ok(result.documentHash);
    });

    it("retrieves document details by UUID", async () => {
      const client = getClient();
      const details = await client.getDocumentDetails("LHDN-TEST-12345");
      assert.equal(details.uuid, "LHDN-TEST-12345");
      assert.equal(details.status, "VALID");
      assert.ok(details.qrCodeUrl);
    });
  });
});
