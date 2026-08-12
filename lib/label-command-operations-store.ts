import "@/lib/server-only";

import { getSql } from "@/lib/db";
import { ensureLabelCommandSchema } from "@/lib/label-command-schema";
import { requireWorkspaceAccess } from "@/lib/label-command-store";

export type LabelIntegration = {
  id: string;
  provider: string;
  status: string;
  externalAccountId: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

export type LabelDistributor = {
  id: string;
  name: string;
  status: string;
  territories: string[];
  sourceStatus: string;
};

export type LabelSale = {
  id: string;
  releaseId: string | null;
  trackId: string | null;
  artistId: string | null;
  distributorId: string | null;
  store: string;
  territory: string;
  saleDate: string;
  units: number;
  streams: number;
  grossAmount: number;
  currency: string;
  sourceStatus: string;
};

export type LabelRoyalty = {
  id: string;
  releaseId: string | null;
  trackId: string | null;
  artistId: string | null;
  payeeName: string;
  periodStart: string | null;
  periodEnd: string | null;
  amount: number;
  currency: string;
  status: string;
  payoutDate: string | null;
  sourceStatus: string;
};

type IntegrationRow = {
  id: string;
  provider: string;
  status: string;
  external_account_id: string | null;
  last_sync_at: string | null;
  last_error: string | null;
};

type DistributorRow = {
  id: string;
  name: string;
  status: string;
  territories: string[] | string | null;
  source_status: string;
};

type SaleRow = {
  id: string;
  release_id: string | null;
  track_id: string | null;
  artist_id: string | null;
  distributor_id: string | null;
  store: string;
  territory: string;
  sale_date: string;
  units: string | number;
  streams: string | number;
  gross_amount: string | number;
  currency: string;
  source_status: string;
};

type RoyaltyRow = {
  id: string;
  release_id: string | null;
  track_id: string | null;
  artist_id: string | null;
  payee_name: string;
  period_start: string | null;
  period_end: string | null;
  amount: string | number;
  currency: string;
  status: string;
  payout_date: string | null;
  source_status: string;
};

function normalizeJsonArray(value: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function audit(input: {
  workspaceId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  afterState?: unknown;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO illco_label_audit_events (
      workspace_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      after_state
    )
    VALUES (
      ${input.workspaceId}::uuid,
      ${input.userId}::uuid,
      ${input.action},
      ${input.entityType},
      ${input.entityId || null}::uuid,
      ${input.afterState ? JSON.stringify(input.afterState) : null}::jsonb
    )
  `;
}

export async function listLabelIntegrations(userId: string, workspaceId: string): Promise<LabelIntegration[]> {
  await ensureLabelCommandSchema();
  await requireWorkspaceAccess(userId, workspaceId);
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id,
      provider,
      status,
      external_account_id,
      last_sync_at::text AS last_sync_at,
      last_error
    FROM illco_label_integrations
    WHERE workspace_id = ${workspaceId}::uuid
    ORDER BY provider ASC
  `) as IntegrationRow[];

  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    status: row.status,
    externalAccountId: row.external_account_id,
    lastSyncAt: row.last_sync_at,
    lastError: row.last_error,
  }));
}

export async function listLabelDistributors(userId: string, workspaceId: string): Promise<LabelDistributor[]> {
  await ensureLabelCommandSchema();
  await requireWorkspaceAccess(userId, workspaceId);
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id,
      name,
      status,
      territories,
      source_status
    FROM illco_label_distributors
    WHERE workspace_id = ${workspaceId}::uuid
      AND archived_at IS NULL
    ORDER BY name ASC
  `) as DistributorRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    territories: normalizeJsonArray(row.territories),
    sourceStatus: row.source_status,
  }));
}

export async function createLabelDistributor(
  userId: string,
  workspaceId: string,
  input: { name: string; status: string; territories: string[] },
): Promise<LabelDistributor> {
  await ensureLabelCommandSchema();
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager"]);
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_label_distributors (
      workspace_id, name, status, territories, source_status, created_by
    ) VALUES (
      ${workspaceId}::uuid,
      ${input.name},
      ${input.status},
      ${JSON.stringify(input.territories)}::jsonb,
      'manual',
      ${userId}::uuid
    )
    RETURNING
      id::text AS id,
      name,
      status,
      territories,
      source_status
  `) as DistributorRow[];
  const row = rows[0];
  if (!row) throw new Error("Distributor creation failed.");
  const distributor = {
    id: row.id,
    name: row.name,
    status: row.status,
    territories: normalizeJsonArray(row.territories),
    sourceStatus: row.source_status,
  };
  await audit({ workspaceId, userId, action: "distributor.created", entityType: "distributor", entityId: row.id, afterState: distributor });
  return distributor;
}

export async function listLabelSales(userId: string, workspaceId: string): Promise<LabelSale[]> {
  await ensureLabelCommandSchema();
  await requireWorkspaceAccess(userId, workspaceId);
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id,
      release_id::text AS release_id,
      track_id::text AS track_id,
      artist_id::text AS artist_id,
      distributor_id::text AS distributor_id,
      store,
      territory,
      sale_date::text AS sale_date,
      units,
      streams,
      gross_amount,
      currency,
      source_status
    FROM illco_label_sales
    WHERE workspace_id = ${workspaceId}::uuid
    ORDER BY sale_date DESC, created_at DESC
    LIMIT 5000
  `) as SaleRow[];

  return rows.map((row) => ({
    id: row.id,
    releaseId: row.release_id,
    trackId: row.track_id,
    artistId: row.artist_id,
    distributorId: row.distributor_id,
    store: row.store,
    territory: row.territory,
    saleDate: row.sale_date,
    units: Number(row.units),
    streams: Number(row.streams),
    grossAmount: Number(row.gross_amount),
    currency: row.currency,
    sourceStatus: row.source_status,
  }));
}

export async function createLabelSale(
  userId: string,
  workspaceId: string,
  input: {
    releaseId?: string | null;
    trackId?: string | null;
    artistId?: string | null;
    distributorId?: string | null;
    store: string;
    territory?: string;
    saleDate: string;
    units?: number;
    streams?: number;
    grossAmount: number;
    currency?: string;
  },
): Promise<LabelSale> {
  await ensureLabelCommandSchema();
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager", "accountant"]);
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_label_sales (
      workspace_id, release_id, track_id, artist_id, distributor_id,
      store, territory, sale_date, units, streams, gross_amount, currency,
      source_status, created_by
    ) VALUES (
      ${workspaceId}::uuid,
      ${input.releaseId || null}::uuid,
      ${input.trackId || null}::uuid,
      ${input.artistId || null}::uuid,
      ${input.distributorId || null}::uuid,
      ${input.store},
      ${input.territory || ""},
      ${input.saleDate}::date,
      ${input.units || 0},
      ${input.streams || 0},
      ${input.grossAmount},
      ${input.currency || "USD"},
      'manual',
      ${userId}::uuid
    )
    RETURNING
      id::text AS id,
      release_id::text AS release_id,
      track_id::text AS track_id,
      artist_id::text AS artist_id,
      distributor_id::text AS distributor_id,
      store,
      territory,
      sale_date::text AS sale_date,
      units,
      streams,
      gross_amount,
      currency,
      source_status
  `) as SaleRow[];
  const row = rows[0];
  if (!row) throw new Error("Sales record creation failed.");
  const sale = {
    id: row.id,
    releaseId: row.release_id,
    trackId: row.track_id,
    artistId: row.artist_id,
    distributorId: row.distributor_id,
    store: row.store,
    territory: row.territory,
    saleDate: row.sale_date,
    units: Number(row.units),
    streams: Number(row.streams),
    grossAmount: Number(row.gross_amount),
    currency: row.currency,
    sourceStatus: row.source_status,
  };
  await audit({ workspaceId, userId, action: "sale.created", entityType: "sale", entityId: row.id, afterState: sale });
  return sale;
}

export async function listLabelRoyalties(userId: string, workspaceId: string): Promise<LabelRoyalty[]> {
  await ensureLabelCommandSchema();
  await requireWorkspaceAccess(userId, workspaceId);
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id,
      release_id::text AS release_id,
      track_id::text AS track_id,
      artist_id::text AS artist_id,
      payee_name,
      period_start::text AS period_start,
      period_end::text AS period_end,
      amount,
      currency,
      status,
      payout_date::text AS payout_date,
      source_status
    FROM illco_label_royalties
    WHERE workspace_id = ${workspaceId}::uuid
    ORDER BY period_end DESC NULLS LAST, created_at DESC
    LIMIT 5000
  `) as RoyaltyRow[];

  return rows.map((row) => ({
    id: row.id,
    releaseId: row.release_id,
    trackId: row.track_id,
    artistId: row.artist_id,
    payeeName: row.payee_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    payoutDate: row.payout_date,
    sourceStatus: row.source_status,
  }));
}

export async function createLabelRoyalty(
  userId: string,
  workspaceId: string,
  input: {
    releaseId?: string | null;
    trackId?: string | null;
    artistId?: string | null;
    payeeName: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    amount: number;
    currency?: string;
    status?: string;
    payoutDate?: string | null;
  },
): Promise<LabelRoyalty> {
  await ensureLabelCommandSchema();
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager", "accountant"]);
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_label_royalties (
      workspace_id, release_id, track_id, artist_id, payee_name,
      period_start, period_end, amount, currency, status, payout_date,
      source_status, created_by
    ) VALUES (
      ${workspaceId}::uuid,
      ${input.releaseId || null}::uuid,
      ${input.trackId || null}::uuid,
      ${input.artistId || null}::uuid,
      ${input.payeeName},
      ${input.periodStart || null}::date,
      ${input.periodEnd || null}::date,
      ${input.amount},
      ${input.currency || "USD"},
      ${input.status || "pending"},
      ${input.payoutDate || null}::date,
      'manual',
      ${userId}::uuid
    )
    RETURNING
      id::text AS id,
      release_id::text AS release_id,
      track_id::text AS track_id,
      artist_id::text AS artist_id,
      payee_name,
      period_start::text AS period_start,
      period_end::text AS period_end,
      amount,
      currency,
      status,
      payout_date::text AS payout_date,
      source_status
  `) as RoyaltyRow[];
  const row = rows[0];
  if (!row) throw new Error("Royalty record creation failed.");
  const royalty = {
    id: row.id,
    releaseId: row.release_id,
    trackId: row.track_id,
    artistId: row.artist_id,
    payeeName: row.payee_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    payoutDate: row.payout_date,
    sourceStatus: row.source_status,
  };
  await audit({ workspaceId, userId, action: "royalty.created", entityType: "royalty", entityId: row.id, afterState: royalty });
  return royalty;
}

export async function getLabelOperationsSnapshot(userId: string, workspaceId: string) {
  const [integrations, distributors, sales, royalties] = await Promise.all([
    listLabelIntegrations(userId, workspaceId),
    listLabelDistributors(userId, workspaceId),
    listLabelSales(userId, workspaceId),
    listLabelRoyalties(userId, workspaceId),
  ]);

  const totalRevenue = sales.reduce((sum, item) => sum + item.grossAmount, 0);
  const totalUnits = sales.reduce((sum, item) => sum + item.units, 0);
  const totalStreams = sales.reduce((sum, item) => sum + item.streams, 0);
  const totalRoyalties = royalties.reduce((sum, item) => sum + item.amount, 0);
  const paidRoyalties = royalties.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);

  return {
    integrations,
    distributors,
    sales,
    royalties,
    totals: {
      revenue: Math.round(totalRevenue * 100) / 100,
      units: totalUnits,
      streams: totalStreams,
      royalties: Math.round(totalRoyalties * 100) / 100,
      paidRoyalties: Math.round(paidRoyalties * 100) / 100,
      unpaidRoyalties: Math.round((totalRoyalties - paidRoyalties) * 100) / 100,
    },
  };
}
