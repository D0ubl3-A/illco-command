import "@/lib/server-only";

import { createHash, randomBytes } from "node:crypto";

import { getDatabaseUrl, getSql, hasDsqlDatabase } from "@/lib/db";
import { findUserById, type UserAccount } from "@/lib/user-accounts";

export type GiftRecord = {
  text?: string;
  raw?: string;
  cells?: unknown[];
  fields?: unknown[];
  [key: string]: unknown;
};

export function compactBigoText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureBigoGiftStrategySchema() {
  const sql = getSql();
  const usingDsql = !getDatabaseUrl() && hasDsqlDatabase();

  await sql`
    CREATE TABLE IF NOT EXISTS illco_bigo_gift_strategy_contributions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      user_email TEXT NOT NULL,
      source TEXT NOT NULL,
      record_count INT NOT NULL,
      records JSONB NOT NULL DEFAULT '[]'::jsonb,
      strategy_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_bigo_extension_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    )
  `;

  if (usingDsql) {
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_bigo_strategy_user_created ON illco_bigo_gift_strategy_contributions (user_id, created_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_bigo_extension_tokens_user ON illco_bigo_extension_tokens (user_id, created_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_bigo_extension_tokens_expires ON illco_bigo_extension_tokens (expires_at)`;
  } else {
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_bigo_strategy_user_created ON illco_bigo_gift_strategy_contributions (user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_bigo_extension_tokens_user ON illco_bigo_extension_tokens (user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_bigo_extension_tokens_expires ON illco_bigo_extension_tokens (expires_at) WHERE revoked_at IS NULL`;
  }
}

export async function createBigoExtensionToken(user: UserAccount) {
  await ensureBigoGiftStrategySchema();
  const token = `illco_bigo_${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const sql = getSql();

  await sql`
    INSERT INTO illco_bigo_extension_tokens (user_id, token_hash, label, expires_at)
    VALUES (${user.id}::uuid, ${tokenHash(token)}, ${"BIGO Gift Strategy Chrome Extension"}, ${expiresAt})
  `;

  return { token, expiresAt };
}

export async function getUserFromBigoExtensionToken(authorization: string | null) {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim() || "";
  if (!token) return null;

  await ensureBigoGiftStrategySchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT user_id::text AS user_id
    FROM illco_bigo_extension_tokens
    WHERE token_hash = ${tokenHash(token)}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `) as Array<{ user_id: string }>;

  const userId = rows[0]?.user_id || "";
  if (!userId) return null;

  await sql`
    UPDATE illco_bigo_extension_tokens
    SET last_used_at = NOW()
    WHERE token_hash = ${tokenHash(token)}
  `;

  const row = await findUserById(userId);
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    company: row.company,
    avatarUrl: row.avatar_url,
    googleLinked: Boolean(row.google_subject),
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at,
  } satisfies UserAccount;
}

export function normalizeBigoGiftRecords(value: unknown): GiftRecord[] {
  if (!Array.isArray(value)) return [];

  const normalized: Array<GiftRecord | null> = value
    .slice(0, 5000)
    .map((record) => {
      if (typeof record === "string") return { text: compactBigoText(record) };
      if (!record || typeof record !== "object") return null;
      const raw = record as GiftRecord;
      const sourceCells = Array.isArray(raw.cells) ? raw.cells : Array.isArray(raw.fields) ? raw.fields : [];
      const cells = sourceCells.map(compactBigoText).filter(Boolean).slice(0, 20);
      const text = compactBigoText(raw.text || raw.raw || cells.join(" | "));
      if (!text) return null;
      return {
        ...raw,
        text,
        cells,
      };
    });

  return normalized.filter((record): record is GiftRecord => record !== null);
}

export function summarizeBigoGiftRecords(records: GiftRecord[]) {
  const texts = records.map((record) => compactBigoText(record.text || record.cells?.join(" | "))).filter(Boolean);
  const sample = texts.slice(0, 200).join(" ").toLowerCase();
  const possibleDiamondMentions = (sample.match(/\bdiamond|\bbeans|\bgift|\breceived/g) || []).length;
  const possibleDateMentions = (sample.match(/\b\d{1,2}[/-]\d{1,2}\b|\bjan|\bfeb|\bmar|\bapr|\bmay|\bjun|\bjul|\baug|\bsep|\boct|\bnov|\bdec/g) || []).length;

  return [
    `${records.length} visible BIGO records imported.`,
    `${possibleDiamondMentions} gift/value keyword mentions found in the first scan window.`,
    `${possibleDateMentions} date/time signals found for schedule strategy.`,
    "Agent workflow input is ready for supporter timing, repeat-gifter, and host training analysis.",
  ];
}
