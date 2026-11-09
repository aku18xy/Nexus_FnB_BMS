import { createHash } from "crypto";
import { LhdnDocumentHash } from "./types";

/**
 * Serializes an object or value into canonical JSON format.
 * Properties are sorted lexicographically at every nested level,
 * ensuring deterministic SHA-256 digital document hashing.
 * Ignores any pre-existing `documentHash` property to prevent recursive hashing.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalizeJson(item));
    return `[${items.join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs: string[] = [];

  for (const key of sortedKeys) {
    const val = obj[key];
    // Exclude existing documentHash or undefined properties during hash computation
    if (key === "documentHash" || val === undefined) {
      continue;
    }
    pairs.push(`${JSON.stringify(key)}:${canonicalizeJson(val)}`);
  }

  return `{${pairs.join(",")}}`;
}

/**
 * Computes the SHA-256 digest of a string or Buffer, returning both
 * 64-character hexadecimal and 44-character Base64 representations.
 */
export function computeSha256(content: string | Buffer): LhdnDocumentHash {
  const hex = createHash("sha256").update(content).digest("hex");
  const base64 = createHash("sha256").update(content).digest("base64");
  return { hex, base64 };
}

/**
 * Hashes an LHDN e-invoice document using canonical JSON serialization and SHA-256.
 */
export function hashInvoiceDocument(
  document: Record<string, unknown>
): LhdnDocumentHash {
  const canonical = canonicalizeJson(document);
  return computeSha256(canonical);
}
