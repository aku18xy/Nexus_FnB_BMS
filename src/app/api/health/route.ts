import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbHealth = await db.getHealth();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "nexus-fnb-bms",
    jurisdiction: "Malaysia (LHDN / SST / BNM)",
    version: "0.1.0",
    database: dbHealth,
    environment: process.env.NODE_ENV || "development",
  });
}
