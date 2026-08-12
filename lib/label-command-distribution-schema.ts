import "@/lib/server-only";

import { getDatabaseUrl, getSql, hasDsqlDatabase } from "@/lib/db";
import { ensureLabelCommandSchema } from "@/lib/label-command-schema";

let distributionSchemaReady: Promise<void> | null = null;

export async function ensureLabelDistributionSchema() {
  await ensureLabelCommandSchema();
  if (!distributionSchemaReady) distributionSchemaReady = createDistributionSchema();
  try {
    await distributionSchemaReady;
  } catch (error) {
    distributionSchemaReady = null;
    throw error;
  }
}

async function createDistributionSchema() {
  const sql = getSql();
  const usingDsql = !getDatabaseUrl() && hasDsqlDatabase();

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_release_rights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      release_id UUID NOT NULL,
      master_ownership_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      composition_rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      samples_cleared BOOLEAN NOT NULL DEFAULT FALSE,
      featured_artist_clearances BOOLEAN NOT NULL DEFAULT FALSE,
      cover_song BOOLEAN NOT NULL DEFAULT FALSE,
      cover_license_status TEXT NOT NULL DEFAULT 'not_applicable',
      content_id_eligibility TEXT NOT NULL DEFAULT 'review_required',
      territory_rights JSONB NOT NULL DEFAULT '[]'::jsonb,
      declaration_by UUID NOT NULL,
      declared_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_release_qc (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      release_id UUID NOT NULL,
      code TEXT NOT NULL,
      severity TEXT NOT NULL,
      field TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      source TEXT NOT NULL DEFAULT 'system',
      resolved_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_distribution_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      release_id UUID NOT NULL,
      provider TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      idempotency_key TEXT NOT NULL,
      provider_job_id TEXT,
      destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
      last_error TEXT,
      requested_by UUID NOT NULL,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      delivered_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_delivery_destinations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      release_id UUID NOT NULL,
      destination TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'queued',
      external_release_id TEXT,
      store_url TEXT,
      last_error TEXT,
      submitted_at TIMESTAMPTZ,
      acknowledged_at TIMESTAMPTZ,
      live_at TIMESTAMPTZ,
      removed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_label_distribution_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      release_id UUID NOT NULL,
      job_id UUID,
      destination_id UUID,
      event_type TEXT NOT NULL,
      provider_event_id TEXT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      actor_user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  if (usingDsql) {
    await sql`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS idx_illco_label_rights_release ON illco_label_release_rights (workspace_id, release_id)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_label_qc_release ON illco_label_release_qc (workspace_id, release_id, created_at)`;
    await sql`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS idx_illco_label_distribution_idempotency ON illco_label_distribution_jobs (idempotency_key)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_label_distribution_release ON illco_label_distribution_jobs (workspace_id, release_id, requested_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_label_destination_release ON illco_label_delivery_destinations (workspace_id, release_id, destination)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_label_distribution_events_release ON illco_label_distribution_events (workspace_id, release_id, created_at)`;
  } else {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_label_rights_release ON illco_label_release_rights (workspace_id, release_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_label_qc_release ON illco_label_release_qc (workspace_id, release_id, created_at DESC)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_label_distribution_idempotency ON illco_label_distribution_jobs (idempotency_key)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_label_distribution_release ON illco_label_distribution_jobs (workspace_id, release_id, requested_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_label_destination_release ON illco_label_delivery_destinations (workspace_id, release_id, destination)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_label_distribution_events_release ON illco_label_distribution_events (workspace_id, release_id, created_at DESC)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_label_provider_event ON illco_label_distribution_events (provider_event_id) WHERE provider_event_id IS NOT NULL`;
  }
}
