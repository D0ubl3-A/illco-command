import fs from "node:fs";
import path from "node:path";

import { getDatabaseUrl, getSql, hasDsqlDatabase } from "../lib/db";

loadLocalEnvFiles();

function loadLocalEnvFiles() {
  for (const fileName of [".env", ".env.local", ".env.development.local", ".env.production", ".env.production.local"]) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

async function main() {
  if (!getDatabaseUrl() && !hasDsqlDatabase()) {
    throw new Error(
      [
        "A database is required before account sign-in, lead capture, and saved purchases can be enabled.",
        "Use DATABASE_URL/POSTGRES_URL or the Vercel Aurora DSQL STORAGE_* variables, then rerun npm run db:setup.",
        "Vercel CLI: vercel env pull",
      ].join(" "),
    );
  }

  const sql = getSql();
  const usingDsql = !getDatabaseUrl() && hasDsqlDatabase();
  if (!usingDsql) {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      plan_id TEXT,
      message TEXT,
      source TEXT NOT NULL DEFAULT 'illco-command-funnel',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid()`;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS name TEXT`;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS company TEXT`;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS plan_id TEXT`;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS message TEXT`;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'illco-command-funnel'`;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE illco_command_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_leads ALTER COLUMN source SET DEFAULT 'illco-command-funnel'`;
  await sql`ALTER TABLE illco_command_leads ALTER COLUMN submitted_at SET DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_leads ALTER COLUMN raw_payload SET DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE illco_command_leads ALTER COLUMN created_at SET DEFAULT NOW()`;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_project_health (
      project_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      status_code INTEGER,
      title TEXT,
      error TEXT,
      checked_at TIMESTAMPTZ,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE illco_command_project_health ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'unknown'`;
  await sql`ALTER TABLE illco_command_project_health ADD COLUMN IF NOT EXISTS status_code INTEGER`;
  await sql`ALTER TABLE illco_command_project_health ADD COLUMN IF NOT EXISTS title TEXT`;
  await sql`ALTER TABLE illco_command_project_health ADD COLUMN IF NOT EXISTS error TEXT`;
  await sql`ALTER TABLE illco_command_project_health ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ`;
  await sql`ALTER TABLE illco_command_project_health ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE illco_command_project_health ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_project_health ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_project_health ALTER COLUMN status SET DEFAULT 'unknown'`;
  await sql`ALTER TABLE illco_command_project_health ALTER COLUMN raw_payload SET DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE illco_command_project_health ALTER COLUMN created_at SET DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_project_health ALTER COLUMN updated_at SET DEFAULT NOW()`;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_demo_videos (
      project_id TEXT PRIMARY KEY,
      youtube_video_id TEXT,
      youtube_url TEXT,
      embed_url TEXT,
      title TEXT,
      source TEXT NOT NULL,
      local_file_path TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `;
  await sql`ALTER TABLE illco_command_demo_videos ADD COLUMN IF NOT EXISTS youtube_video_id TEXT`;
  await sql`ALTER TABLE illco_command_demo_videos ADD COLUMN IF NOT EXISTS youtube_url TEXT`;
  await sql`ALTER TABLE illco_command_demo_videos ADD COLUMN IF NOT EXISTS embed_url TEXT`;
  await sql`ALTER TABLE illco_command_demo_videos ADD COLUMN IF NOT EXISTS title TEXT`;
  await sql`ALTER TABLE illco_command_demo_videos ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'`;
  await sql`ALTER TABLE illco_command_demo_videos ADD COLUMN IF NOT EXISTS local_file_path TEXT`;
  await sql`ALTER TABLE illco_command_demo_videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_demo_videos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_demo_videos ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE illco_command_demo_videos ALTER COLUMN source SET DEFAULT 'manual'`;
  await sql`ALTER TABLE illco_command_demo_videos ALTER COLUMN updated_at SET DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_demo_videos ALTER COLUMN created_at SET DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_demo_videos ALTER COLUMN raw_payload SET DEFAULT '{}'::jsonb`;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_checkout_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stripe_session_id TEXT NOT NULL UNIQUE,
      stripe_customer_id TEXT,
      plan_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      email TEXT,
      checkout_url TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      password_hash TEXT,
      google_subject TEXT,
      avatar_url TEXT,
      email_verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS name TEXT`;
  await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS company TEXT`;
  await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  if (!usingDsql) {
    await sql`ALTER TABLE illco_command_users ALTER COLUMN password_hash DROP NOT NULL`;
  }
  await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS google_subject TEXT`;
  await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
  await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`;
  if (usingDsql) {
    await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ`;
    await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`;
  } else {
    await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`ALTER TABLE illco_command_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES illco_command_users(id) ON DELETE CASCADE,
      session_token_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`;
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`;
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS plan_id TEXT`;
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS product_id TEXT`;
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS email TEXT`;
  if (usingDsql) {
    await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS user_id UUID`;
  } else {
    await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES illco_command_users(id) ON DELETE SET NULL`;
  }
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS checkout_url TEXT`;
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'created'`;
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_checkout_sessions ALTER COLUMN status SET DEFAULT 'created'`;
  await sql`ALTER TABLE illco_command_checkout_sessions ALTER COLUMN raw_payload SET DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE illco_command_checkout_sessions ALTER COLUMN created_at SET DEFAULT NOW()`;
  await sql`ALTER TABLE illco_command_checkout_sessions ALTER COLUMN updated_at SET DEFAULT NOW()`;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'illco_command_project_health_status_check'
          AND conrelid = 'illco_command_project_health'::regclass
      ) THEN
        ALTER TABLE illco_command_project_health
          ADD CONSTRAINT illco_command_project_health_status_check
          CHECK (status IN ('healthy', 'degraded', 'offline', 'unknown'));
      END IF;
    END
    $$;
  `;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'illco_command_demo_videos_source_check'
          AND conrelid = 'illco_command_demo_videos'::regclass
      ) THEN
        ALTER TABLE illco_command_demo_videos
          ADD CONSTRAINT illco_command_demo_videos_source_check
          CHECK (source IN ('youtube-search', 'uploaded', 'manual', 'recorded'));
      END IF;
    END
    $$;
  `;

  await sql\`
    CREATE TABLE IF NOT EXISTS illco_command_stripe_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      object_id TEXT,
      api_version TEXT,
      livemode BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'processing',
      attempt_count INTEGER NOT NULL DEFAULT 1,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_error TEXT,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processing_started_at TIMESTAMPTZ,
      processed_at TIMESTAMPTZ,
      next_attempt_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  \`;
  await sql\`
    CREATE TABLE IF NOT EXISTS illco_command_notification_outbox (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stripe_event_id TEXT REFERENCES illco_command_stripe_events(event_id) ON DELETE SET NULL,
      topic TEXT NOT NULL,
      dedupe_key TEXT NOT NULL UNIQUE,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      delivered_at TIMESTAMPTZ,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  \`;
  await sql\`CREATE INDEX IF NOT EXISTS idx_illco_command_stripe_events_status_retry ON illco_command_stripe_events (status, next_attempt_at)\`;
  await sql\`CREATE INDEX IF NOT EXISTS idx_illco_command_stripe_events_object ON illco_command_stripe_events (object_id)\`;
  await sql\`CREATE INDEX IF NOT EXISTS idx_illco_command_notification_outbox_pending ON illco_command_notification_outbox (status, available_at)\`;
  await sql\`CREATE INDEX IF NOT EXISTS idx_illco_command_notification_outbox_event ON illco_command_notification_outbox (stripe_event_id)\`;

  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_leads_email ON illco_command_leads (email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_leads_email_lower ON illco_command_leads (LOWER(email))`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_leads_created_at ON illco_command_leads (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_project_health_status ON illco_command_project_health (status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_project_health_checked_at ON illco_command_project_health (checked_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_demo_videos_updated_at ON illco_command_demo_videos (updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_demo_videos_source ON illco_command_demo_videos (source)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_command_checkout_sessions_stripe_session ON illco_command_checkout_sessions (stripe_session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_checkout_sessions_customer ON illco_command_checkout_sessions (stripe_customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_checkout_sessions_email ON illco_command_checkout_sessions (LOWER(email))`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_checkout_sessions_user ON illco_command_checkout_sessions (user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_checkout_sessions_created_at ON illco_command_checkout_sessions (created_at DESC)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_command_users_email_lower ON illco_command_users (LOWER(email))`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_command_users_google_subject ON illco_command_users (google_subject) WHERE google_subject IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_users_created_at ON illco_command_users (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_user_sessions_user ON illco_command_user_sessions (user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_user_sessions_expires ON illco_command_user_sessions (expires_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_user_action_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES illco_command_users(id) ON DELETE CASCADE,
      token_type TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_by TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_user_action_tokens_user ON illco_command_user_action_tokens (user_id, token_type, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_user_action_tokens_open ON illco_command_user_action_tokens (token_type, expires_at) WHERE consumed_at IS NULL`;

  console.log("ILLCO Command database schema is ready.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
