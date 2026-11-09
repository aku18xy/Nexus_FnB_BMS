import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export * from "./schema";
export { schema };

/**
 * Fallback connection string for local development / build verification
 * when live DATABASE_URL is not yet provisioned.
 */
const DEFAULT_FALLBACK_URL =
  "postgresql://postgres:postgres@ep-nexus-fnb-local.ap-southeast-1.neon.tech/nexus_fnb?sslmode=require";

/**
 * Resolves the active PostgreSQL connection string from environment variables.
 */
export function getConnectionString(): string {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    DEFAULT_FALLBACK_URL
  );
}

// ============================================================================
// 1. Direct Serverless HTTP Client (Optimized for Vercel Fluid Compute / Serverless)
// ============================================================================

let cachedHttpClient: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Creates or retrieves a typed Drizzle database client using Neon Serverless HTTP driver.
 * Recommended for Next.js App Router Server Components, Server Actions, and Route Handlers.
 */
export function getDb(connectionString?: string): NeonHttpDatabase<typeof schema> {
  const url = connectionString || getConnectionString();
  if (!cachedHttpClient || connectionString) {
    const sql = neon(url);
    const client = drizzleHttp(sql, { schema });
    if (!connectionString) {
      cachedHttpClient = client;
    }
    return client;
  }
  return cachedHttpClient;
}

/**
 * Default serverless HTTP database client.
 */
export const db = getDb();

// ============================================================================
// 2. WebSocket Pooled Connection Client (Optimized for Interactive Sessions / Transactions)
// ============================================================================

let cachedPool: Pool | null = null;
let cachedPoolDb: NeonDatabase<typeof schema> | null = null;

/**
 * Creates or retrieves a pooled Drizzle database client using Neon WebSocket Pool.
 * Recommended for heavy multi-statement ACID transactions or background workers.
 */
export function getPoolDb(connectionString?: string): NeonDatabase<typeof schema> {
  const url = connectionString || getConnectionString();
  if (!cachedPoolDb || connectionString) {
    const pool = new Pool({ connectionString: url });
    const client = drizzlePool(pool, { schema });
    if (!connectionString) {
      cachedPool = pool;
      cachedPoolDb = client;
    }
    return client;
  }
  return cachedPoolDb;
}

/**
 * Retrieves the underlying Neon WebSocket Pool instance.
 */
export function getPool(): Pool {
  if (!cachedPool) {
    cachedPool = new Pool({ connectionString: getConnectionString() });
  }
  return cachedPool;
}

/**
 * Diagnostic health check utility to verify database connectivity.
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const url = getConnectionString();
    if (!url || url === DEFAULT_FALLBACK_URL) {
      return {
        connected: false,
        latencyMs: 0,
        error: "DATABASE_URL not configured (using local fallback)",
      };
    }
    const sql = neon(url);
    await sql`SELECT 1`;
    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
