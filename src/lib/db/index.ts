/**
 * Database client foundation for Nexus FnB BMS
 * Ready for Neon Serverless Postgres integration (TSK-ARCH-02)
 */

export interface DatabaseConfig {
  connectionString?: string;
  maxConnections?: number;
  ssl?: boolean;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected: boolean = false;

  private constructor() {
    // Lazily initialized with Neon Postgres pool/client in TSK-ARCH-02
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async getHealth(): Promise<{ status: "connected" | "disconnected"; latencyMs: number }> {
    const start = Date.now();
    // Verification ping stub
    return {
      status: "connected",
      latencyMs: Date.now() - start,
    };
  }
}

export const db = DatabaseService.getInstance();
