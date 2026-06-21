import { getDatabaseUrl, getSql, hasDatabase, hasDsqlDatabase } from "@/lib/db";

let schemaReady: Promise<void> | null = null;

export async function ensureAccountSchema() {
  if (!hasDatabase()) {
    throw new Error("A database is required for user accounts.");
  }

  if (!schemaReady) {
    schemaReady = createAccountSchema();
  }

  try {
    await schemaReady;
  } catch (error) {
    schemaReady = null;
    throw error;
  }
}

async function createAccountSchema() {
  const sql = getSql();
  const usingDsql = !getDatabaseUrl() && hasDsqlDatabase();
  if (!usingDsql) {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  }

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
  if (getDatabaseUrl() || !hasDsqlDatabase()) {
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
  if (usingDsql) {
    await sql`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS idx_illco_command_users_email_lower ON illco_command_users (email)`;
    await sql`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS idx_illco_command_users_google_subject ON illco_command_users (google_subject)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_command_users_created_at ON illco_command_users (created_at)`;
  } else {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_command_users_email_lower ON illco_command_users (LOWER(email))`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_command_users_google_subject ON illco_command_users (google_subject) WHERE google_subject IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_users_created_at ON illco_command_users (created_at DESC)`;
  }

  if (usingDsql) {
    await sql`
      CREATE TABLE IF NOT EXISTS illco_command_user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        session_token_hash TEXT NOT NULL UNIQUE,
        user_agent TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  } else {
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
  }
  if (usingDsql) {
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_command_user_sessions_user ON illco_command_user_sessions (user_id)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_command_user_sessions_expires ON illco_command_user_sessions (expires_at)`;
  } else {
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_user_sessions_user ON illco_command_user_sessions (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_user_sessions_expires ON illco_command_user_sessions (expires_at)`;
  }

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
  if (usingDsql) {
    await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS user_id UUID`;
  } else {
    await sql`ALTER TABLE illco_command_checkout_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES illco_command_users(id) ON DELETE SET NULL`;
  }
  if (usingDsql) {
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_command_checkout_sessions_user ON illco_command_checkout_sessions (user_id)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_command_checkout_sessions_email_lower ON illco_command_checkout_sessions (email)`;
  } else {
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_checkout_sessions_user ON illco_command_checkout_sessions (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_checkout_sessions_email_lower ON illco_command_checkout_sessions (LOWER(email))`;
  }

  if (usingDsql) {
    await sql`
      CREATE TABLE IF NOT EXISTS illco_command_user_action_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        token_type TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ,
        created_by TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  } else {
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
  }
  if (usingDsql) {
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_command_user_action_tokens_user ON illco_command_user_action_tokens (user_id, token_type, created_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_command_user_action_tokens_open ON illco_command_user_action_tokens (token_type, expires_at)`;
  } else {
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_user_action_tokens_user ON illco_command_user_action_tokens (user_id, token_type, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_command_user_action_tokens_open ON illco_command_user_action_tokens (token_type, expires_at) WHERE consumed_at IS NULL`;
  }
}
