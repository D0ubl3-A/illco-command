import "@/lib/server-only";

import { ensureAccountSchema } from "@/lib/account-schema";
import { getDatabaseUrl, getSql, hasDatabase, hasDsqlDatabase } from "@/lib/db";

let labelSchemaReady: Promise<void> | null = null;

export async function ensureLabelCommandSchema() {
  if (!hasDatabase()) {
    throw new Error("A database is required for saved Label Command records.");
  }

  if (!labelSchemaReady) {
    labelSchemaReady = createLabelCommandSchema();
  }

  try {
    await labelSchemaReady;
  } catch (error) {
    labelSchemaReady = null;
    throw error;
  }
}

async function createLabelCommandSchema() {
  await ensureAccountSchema();

  const sql = getSql();
  const usingDsql = !getDatabaseUrl() && hasDsqlDatabase();

  if (!usingDsql) {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id UUID NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      user_id UUID,
      invited_email TEXT,
      role TEXT NOT NULL DEFAULT 'viewer',
      status TEXT NOT NULL DEFAULT 'active',
      invited_by UUID,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_artists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      name TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      source_status TEXT NOT NULL DEFAULT 'manual',
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_releases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      artist_id UUID,
      title TEXT NOT NULL,
      release_type TEXT NOT NULL DEFAULT 'single',
      stage TEXT NOT NULL DEFAULT 'draft',
      target_date DATE,
      explicit BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT NOT NULL DEFAULT '',
      source_status TEXT NOT NULL DEFAULT 'manual',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_tracks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      release_id UUID,
      artist_id UUID,
      title TEXT NOT NULL,
      duration_seconds INTEGER,
      audio_url TEXT,
      source_status TEXT NOT NULL DEFAULT 'manual',
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      actor_user_id UUID,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id UUID,
      before_state JSONB,
      after_state JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  if (usingDsql) {
    await sql`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS idx_illco_label_workspaces_owner_slug ON illco_label_workspaces (owner_user_id, slug)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_label_memberships_user ON illco_label_memberships (user_id, status)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_label_artists_workspace ON illco_label_artists (workspace_id, created_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_label_releases_workspace ON illco_label_releases (workspace_id, updated_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_label_tracks_workspace ON illco_label_tracks (workspace_id, created_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_label_audit_workspace ON illco_label_audit_events (workspace_id, created_at)`;
  } else {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_label_workspaces_owner_slug ON illco_label_workspaces (owner_user_id, slug)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_label_memberships_user ON illco_label_memberships (user_id, status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_label_artists_workspace ON illco_label_artists (workspace_id, created_at DESC) WHERE archived_at IS NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_label_releases_workspace ON illco_label_releases (workspace_id, updated_at DESC) WHERE archived_at IS NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_label_tracks_workspace ON illco_label_tracks (workspace_id, created_at DESC) WHERE archived_at IS NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_label_audit_workspace ON illco_label_audit_events (workspace_id, created_at DESC)`;
  }
}
