import { NextResponse } from "next/server";

import {
  compactBigoText,
  ensureBigoGiftStrategySchema,
  normalizeBigoGiftRecords,
  summarizeBigoGiftRecords,
} from "@/lib/bigo-gift-strategy";
import { getSql, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-accounts";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign into ILLCO before contributing strategy records." }, { status: 401 });
  }

  let body: { consent?: boolean; records?: unknown; source?: string };
  try {
    body = (await request.json()) as { consent?: boolean; records?: unknown; source?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.consent) {
    return NextResponse.json({ ok: false, error: "Consent is required before records can be used for strategy." }, { status: 400 });
  }

  const records = normalizeBigoGiftRecords(body.records);
  if (!records.length) {
    return NextResponse.json({ ok: false, error: "No valid records were provided." }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, error: "Strategy storage is not configured for this deployment yet." }, { status: 503 });
  }

  await ensureBigoGiftStrategySchema();
  const sql = getSql();
  const strategySummary = summarizeBigoGiftRecords(records);
  const rows = (await sql`
    INSERT INTO illco_bigo_gift_strategy_contributions (
      user_id,
      user_email,
      source,
      record_count,
      records,
      strategy_summary
    )
    VALUES (
      ${user.id}::uuid,
      ${user.email},
      ${compactBigoText(body.source || "bigo-gift-history-extension")},
      ${records.length},
      ${JSON.stringify(records)}::jsonb,
      ${JSON.stringify(strategySummary)}::jsonb
    )
    RETURNING id::text AS id
  `) as Array<{ id: string }>;

  return NextResponse.json({
    ok: true,
    imported: records.length,
    contributionId: rows[0]?.id || null,
    poweredBy: "OpenAI Agent SDK",
    strategySummary,
  });
}
