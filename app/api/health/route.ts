import { NextResponse } from "next/server";

import { getSql, hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATABASE_TIMEOUT_MS = 5_000;

async function checkDatabase() {
  if (!hasDatabase()) {
    return { status: "missing" as const, latencyMs: null };
  }

  const startedAt = Date.now();

  try {
    const sql = getSql();
    await Promise.race([
      sql`select 1 as ok`,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Database health check timed out.")), DATABASE_TIMEOUT_MS);
      }),
    ]);

    return { status: "ok" as const, latencyMs: Date.now() - startedAt };
  } catch {
    return { status: "unavailable" as const, latencyMs: Date.now() - startedAt };
  }
}

export async function GET() {
  const database = await checkDatabase();
  const adminAccessConfigured = Boolean(process.env.ADMIN_API_KEY?.trim());
  const healthy = database.status === "ok" && adminAccessConfigured;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "illco-command",
      timestamp: new Date().toISOString(),
      checks: {
        database,
        adminAccess: { status: adminAccessConfigured ? "ok" : "missing" },
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
