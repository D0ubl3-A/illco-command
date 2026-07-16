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
        setTimeout(() => reject(new Error("Label Command database health check timed out.")), DATABASE_TIMEOUT_MS);
      }),
    ]);

    return { status: "ok" as const, latencyMs: Date.now() - startedAt };
  } catch {
    return { status: "unavailable" as const, latencyMs: Date.now() - startedAt };
  }
}

function configured(...values: Array<string | undefined>) {
  return values.every((value) => Boolean(value?.trim()));
}

export async function GET() {
  const database = await checkDatabase();
  const checks = {
    database,
    authentication: {
      status: configured(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET) ? "ok" : "missing",
    },
    billing: {
      status: configured(process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET) ? "ok" : "missing",
    },
    ai: {
      status: process.env.GROQ_API_KEY?.trim() || process.env.CODEX_API_KEY?.trim() ? "ok" : "missing",
    },
    mediaStorage: {
      status: process.env.LABEL_MEDIA_STORAGE_URL?.trim() ? "ok" : "missing",
    },
    analytics: {
      status: process.env.LABEL_ANALYTICS_PROVIDER?.trim() ? "ok" : "missing",
    },
  } as const;

  const ready = Object.values(checks).every((check) => check.status === "ok");

  return NextResponse.json(
    {
      service: "illco-label-command",
      status: ready ? "ready" : "setup-required",
      ready,
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
