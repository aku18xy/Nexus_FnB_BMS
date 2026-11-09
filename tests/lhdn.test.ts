import test from "node:test";
import assert from "node:assert/strict";
import {
  LhdnMyInvoisClient,
  validateTinFormat,
  classifyBuyerTin,
  generateLhdnQrUrl,
  TIN_REGEX,
} from "@/lib/lhdn/myinvois-client";
import {
  canonicalizeJson,
  computeSha256,
  hashInvoiceDocument,
} from "@/lib/lhdn/hashing";
import { LhdnInvoiceDocument } from "@/lib/lhdn/types";

test("LHDN TIN Validation - Company TIN format (^C\\d{10}$)", () => {
  assert.equal(validateTinFormat("C1234567890"), true);
  assert.equal(validateTinFormat("C2589012340"), true);
  assert.equal(validateTinFormat("c1234567890"), true); // Case insensitive
  assert.equal(classifyBuyerTin("C1234567890"), "COMPANY");

  // Invalid company TINs
  assert.equal(validateTinFormat("C123456789"), false); // 9 digits
  assert.equal(validateTinFormat("C12345678901"), false); // 11 digits
  assert.equal(validateTinFormat("CA123456789"), false); // Letters in digits
});

test("LHDN TIN Validation - Individual TIN format (^IG\\d{10}$)", () => {
  assert.equal(validateTinFormat("IG1234567890"), true);
  assert.equal(validateTinFormat("IG9876543210"), true);
  assert.equal(validateTinFormat("ig9876543210"), true); // Case insensitive
  assert.equal(classifyBuyerTin("IG1234567890"), "INDIVIDUAL");

  // Invalid individual TINs
  assert.equal(validateTinFormat("IG123"), false);
  assert.equal(validateTinFormat("I1234567890"), false);
});

test("LHDN TIN Validation - General Public retail code (EI00000000010)", () => {
  assert.equal(validateTinFormat("EI00000000010"), true);
  assert.equal(classifyBuyerTin("EI00000000010"), "GENERAL_PUBLIC");

  // Invalid general public codes
  assert.equal(validateTinFormat("EI00000000011"), false);
});

test("LHDN TIN Validation - Adversarial malformed inputs", () => {
  assert.equal(validateTinFormat(""), false);
  assert.equal(validateTinFormat("   "), false);
  assert.equal(validateTinFormat("NOT_A_TIN"), false);
  assert.equal(validateTinFormat("DROP TABLE orders;"), false);
  assert.equal(classifyBuyerTin(""), "INVALID");
  assert.equal(classifyBuyerTin("MALFORMED"), "INVALID");
});

test("LHDN QR Code URL Generation - Sandbox vs Production", () => {
  const uuid = "8a7f-4c12-98e3-0d5b7a123456";
  const prodUrl = generateLhdnQrUrl(uuid, "production");
  const sandboxUrl = generateLhdnQrUrl(uuid, "sandbox");

  assert.equal(prodUrl, `https://myinvois.hasil.gov.my/verify/${uuid}`);
  assert.equal(sandboxUrl, `https://preprod.myinvois.hasil.gov.my/verify/${uuid}`);
});

test("SHA-256 Document Hashing - Known reference digest for 'hello world'", () => {
  const result = computeSha256("hello world");
  assert.equal(
    result.hex,
    "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
  );
  assert.equal(result.hex.length, 64);
  assert.equal(result.base64.length, 44);
});

test("Canonical JSON Serialization - Lexicographical key ordering determinism", () => {
  const obj1 = { z: 1, a: 2, m: { y: 10, b: 20 } };
  const obj2 = { a: 2, m: { b: 20, y: 10 }, z: 1 };

  const canon1 = canonicalizeJson(obj1);
  const canon2 = canonicalizeJson(obj2);

  assert.equal(canon1, '{"a":2,"m":{"b":20,"y":10},"z":1}');
  assert.equal(canon1, canon2);

  const hash1 = hashInvoiceDocument(obj1);
  const hash2 = hashInvoiceDocument(obj2);

  assert.equal(hash1.hex, hash2.hex);
  assert.equal(hash1.base64, hash2.base64);
});

test("Canonical JSON Serialization - Excludes existing documentHash property", () => {
  const docWithHash = {
    invoiceNumber: "INV-001",
    totalPayable: 100,
    documentHash: { hex: "12345", base64: "67890" },
  };
  const docWithoutHash = {
    invoiceNumber: "INV-001",
    totalPayable: 100,
  };

  const hash1 = hashInvoiceDocument(docWithHash);
  const hash2 = hashInvoiceDocument(docWithoutHash);

  assert.equal(hash1.hex, hash2.hex);
});

test("LHDN Client Mock Simulation - Successful B2B e-Invoice submission", async () => {
  const client = new LhdnMyInvoisClient({ mockMode: true, environment: "sandbox" });

  const invoice: LhdnInvoiceDocument = {
    invoiceNumber: "INV-2026-001",
    issueDateTime: "2026-11-09T15:00:00Z",
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
      name: "MALAYSIA CORP BHD",
    },
    lineItems: [
      {
        classificationCode: "001",
        description: "Nasi Lemak Ayam Berempah",
        unitPrice: 18.0,
        quantity: 2,
        taxType: "06",
        taxRate: 0.06,
        taxAmount: 2.16,
        subtotal: 36.0,
        totalPayable: 38.16,
      },
    ],
    subtotalGross: 36.0,
    totalDiscount: 0.0,
    serviceChargeAmount: 3.6,
    taxableBase: 39.6,
    sstAmount: 2.38,
    roundingAdjustment: 0.02,
    totalPayable: 42.0,
  };

  const result = await client.submitInvoice(invoice);

  assert.equal(result.success, true);
  assert.equal(result.validationStatus, "VALID");
  assert.ok(result.uuid?.startsWith("LHDN-"));
  assert.ok(result.qrCodeUrl?.includes(result.uuid!));
  assert.equal(result.documentHash?.hex.length, 64);
  assert.equal(result.documentHash?.base64.length, 44);
});

test("LHDN Client Mock Simulation - Rejects invalid buyer TIN", async () => {
  const client = new LhdnMyInvoisClient({ mockMode: true });

  const invalidInvoice: LhdnInvoiceDocument = {
    invoiceNumber: "INV-ERR-001",
    issueDateTime: "2026-11-09T15:00:00Z",
    invoiceTypeCode: "01",
    currencyCode: "MYR",
    supplier: {
      tin: "C1234567890",
      idType: "BRN",
      idValue: "202401001234",
      name: "NEXUS FNB SDN BHD",
    },
    buyer: {
      tin: "INVALID_TIN_123", // Malformed
      idType: "BRN",
      idValue: "202401999999",
      name: "BAD TIN CORP",
    },
    lineItems: [
      {
        classificationCode: "001",
        description: "Item 1",
        unitPrice: 10.0,
        quantity: 1,
        taxType: "06",
        taxRate: 0.06,
        taxAmount: 0.6,
        subtotal: 10.0,
        totalPayable: 10.6,
      },
    ],
    subtotalGross: 10.0,
    totalDiscount: 0.0,
    serviceChargeAmount: 0.0,
    taxableBase: 10.0,
    sstAmount: 0.6,
    roundingAdjustment: 0.0,
    totalPayable: 10.6,
  };

  const result = await client.submitInvoice(invalidInvoice);

  assert.equal(result.success, false);
  assert.equal(result.validationStatus, "INVALID");
  assert.ok(result.errorMessage?.includes("Buyer TIN"));
  assert.ok(result.validationErrors?.some((e) => e.code === "CF_BUYER_TIN_INVALID"));
});

test("LHDN Client Mock Simulation - Monthly consolidated B2C batch", async () => {
  const client = new LhdnMyInvoisClient({ mockMode: true });

  const result = await client.submitMonthlyConsolidatedBatch(
    "2026-10",
    "out-pavilion",
    1450,
    85420.5
  );

  assert.equal(result.success, true);
  assert.equal(result.validationStatus, "PENDING");
  assert.ok(result.submissionUid?.startsWith("BATCH-2026-10-OUT-"));
  assert.ok(result.qrCodeUrl?.includes("verify"));
});

test("LHDN Client - Mock Access Token retrieval", async () => {
  const client = new LhdnMyInvoisClient({ mockMode: true });
  const token1 = await client.getAccessToken();
  const token2 = await client.getAccessToken();

  assert.ok(token1.startsWith("mock_jwt_"));
  // Cached token returned on subsequent calls
  assert.equal(token1, token2);
});
