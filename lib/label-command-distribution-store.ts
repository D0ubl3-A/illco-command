import "@/lib/server-only";

import { getSql } from "@/lib/db";
import { ensureLabelDistributionSchema } from "@/lib/label-command-distribution-schema";
import { requireWorkspaceAccess } from "@/lib/label-command-store";

export type DistributionSeverity = "blocker" | "warning" | "info";
export type ContentIdEligibility = "eligible" | "ineligible" | "review_required";

export type RightsInput = {
  masterOwnershipConfirmed: boolean;
  compositionRightsConfirmed: boolean;
  samplesCleared: boolean;
  featuredArtistClearances: boolean;
  coverSong: boolean;
  coverLicenseStatus: "not_applicable" | "required" | "cleared" | "blocked";
  contentIdEligibility: ContentIdEligibility;
  territoryRights: string[];
};

type ReleaseRow = {
  id: string;
  workspace_id: string;
  artist_id: string | null;
  title: string;
  stage: string;
  target_date: string | null;
  updated_at: string;
};

type RightsRow = {
  id: string;
  workspace_id: string;
  release_id: string;
  master_ownership_confirmed: boolean;
  composition_rights_confirmed: boolean;
  samples_cleared: boolean;
  featured_artist_clearances: boolean;
  cover_song: boolean;
  cover_license_status: RightsInput["coverLicenseStatus"];
  content_id_eligibility: ContentIdEligibility;
  territory_rights: string[];
  declared_at: string | null;
  updated_at: string;
};

async function getRelease(workspaceId: string, releaseId: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id,
      workspace_id::text AS workspace_id,
      artist_id::text AS artist_id,
      title,
      stage,
      target_date::text AS target_date,
      updated_at::text AS updated_at
    FROM illco_label_releases
    WHERE id = ${releaseId}::uuid
      AND workspace_id = ${workspaceId}::uuid
      AND archived_at IS NULL
    LIMIT 1
  `) as ReleaseRow[];
  if (!rows[0]) throw new Error("Release not found in this label workspace.");
  return rows[0];
}

function mapRights(row: RightsRow | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    releaseId: row.release_id,
    masterOwnershipConfirmed: Boolean(row.master_ownership_confirmed),
    compositionRightsConfirmed: Boolean(row.composition_rights_confirmed),
    samplesCleared: Boolean(row.samples_cleared),
    featuredArtistClearances: Boolean(row.featured_artist_clearances),
    coverSong: Boolean(row.cover_song),
    coverLicenseStatus: row.cover_license_status,
    contentIdEligibility: row.content_id_eligibility,
    territoryRights: Array.isArray(row.territory_rights) ? row.territory_rights : [],
    declaredAt: row.declared_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertReleaseRights(userId: string, workspaceId: string, releaseId: string, input: RightsInput) {
  await ensureLabelDistributionSchema();
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager"]);
  await getRelease(workspaceId, releaseId);
  const sql = getSql();
  const territories = [...new Set(input.territoryRights.map((value) => value.trim()).filter(Boolean))];

  const existing = (await sql`
    SELECT id::text AS id
    FROM illco_label_release_rights
    WHERE workspace_id = ${workspaceId}::uuid AND release_id = ${releaseId}::uuid
    LIMIT 1
  `) as Array<{ id: string }>;

  if (existing[0]) {
    await sql`
      UPDATE illco_label_release_rights
      SET master_ownership_confirmed = ${input.masterOwnershipConfirmed},
          composition_rights_confirmed = ${input.compositionRightsConfirmed},
          samples_cleared = ${input.samplesCleared},
          featured_artist_clearances = ${input.featuredArtistClearances},
          cover_song = ${input.coverSong},
          cover_license_status = ${input.coverLicenseStatus},
          content_id_eligibility = ${input.contentIdEligibility},
          territory_rights = ${JSON.stringify(territories)}::jsonb,
          declaration_by = ${userId}::uuid,
          declared_at = NOW(),
          updated_at = NOW()
      WHERE id = ${existing[0].id}::uuid
    `;
  } else {
    await sql`
      INSERT INTO illco_label_release_rights (
        workspace_id, release_id, master_ownership_confirmed, composition_rights_confirmed,
        samples_cleared, featured_artist_clearances, cover_song, cover_license_status,
        content_id_eligibility, territory_rights, declaration_by, declared_at
      ) VALUES (
        ${workspaceId}::uuid, ${releaseId}::uuid, ${input.masterOwnershipConfirmed},
        ${input.compositionRightsConfirmed}, ${input.samplesCleared}, ${input.featuredArtistClearances},
        ${input.coverSong}, ${input.coverLicenseStatus}, ${input.contentIdEligibility},
        ${JSON.stringify(territories)}::jsonb, ${userId}::uuid, NOW()
      )
    `;
  }

  await sql`
    INSERT INTO illco_label_distribution_events (workspace_id, release_id, event_type, payload, actor_user_id)
    VALUES (${workspaceId}::uuid, ${releaseId}::uuid, 'rights.declared', ${JSON.stringify({ ...input, territoryRights: territories })}::jsonb, ${userId}::uuid)
  `;
  return getReleaseRights(userId, workspaceId, releaseId);
}

export async function getReleaseRights(userId: string, workspaceId: string, releaseId: string) {
  await ensureLabelDistributionSchema();
  await requireWorkspaceAccess(userId, workspaceId);
  await getRelease(workspaceId, releaseId);
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id, workspace_id::text AS workspace_id, release_id::text AS release_id,
      master_ownership_confirmed, composition_rights_confirmed, samples_cleared,
      featured_artist_clearances, cover_song, cover_license_status, content_id_eligibility,
      territory_rights, declared_at::text AS declared_at, updated_at::text AS updated_at
    FROM illco_label_release_rights
    WHERE workspace_id = ${workspaceId}::uuid AND release_id = ${releaseId}::uuid
    LIMIT 1
  `) as RightsRow[];
  return mapRights(rows[0]);
}

async function replaceSystemQc(workspaceId: string, releaseId: string, findings: Array<{ code: string; severity: DistributionSeverity; field: string; message: string }>) {
  const sql = getSql();
  await sql`
    DELETE FROM illco_label_release_qc
    WHERE workspace_id = ${workspaceId}::uuid AND release_id = ${releaseId}::uuid AND source = 'system'
  `;
  for (const finding of findings) {
    await sql`
      INSERT INTO illco_label_release_qc (workspace_id, release_id, code, severity, field, message, source)
      VALUES (${workspaceId}::uuid, ${releaseId}::uuid, ${finding.code}, ${finding.severity}, ${finding.field}, ${finding.message}, 'system')
    `;
  }
}

export async function runReleaseQc(userId: string, workspaceId: string, releaseId: string) {
  await ensureLabelDistributionSchema();
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager", "artist"]);
  const release = await getRelease(workspaceId, releaseId);
  const rights = await getReleaseRights(userId, workspaceId, releaseId);
  const findings: Array<{ code: string; severity: DistributionSeverity; field: string; message: string }> = [];

  if (!release.title.trim()) findings.push({ code: "release.title_missing", severity: "blocker", field: "title", message: "Release title is required." });
  if (!release.artist_id) findings.push({ code: "release.artist_missing", severity: "blocker", field: "artistId", message: "A primary artist is required before distribution." });
  if (!release.target_date) findings.push({ code: "release.date_missing", severity: "blocker", field: "targetDate", message: "A target release date is required before distribution." });
  if (!rights) {
    findings.push({ code: "rights.declaration_missing", severity: "blocker", field: "rights", message: "Rights declaration is required before distribution." });
  } else {
    if (!rights.masterOwnershipConfirmed) findings.push({ code: "rights.master_unconfirmed", severity: "blocker", field: "masterOwnershipConfirmed", message: "Master recording rights must be confirmed." });
    if (!rights.compositionRightsConfirmed) findings.push({ code: "rights.composition_unconfirmed", severity: "blocker", field: "compositionRightsConfirmed", message: "Composition rights must be confirmed." });
    if (!rights.samplesCleared) findings.push({ code: "rights.samples_unconfirmed", severity: "blocker", field: "samplesCleared", message: "Sample clearance must be confirmed, including confirmation that no uncleared samples are present." });
    if (!rights.featuredArtistClearances) findings.push({ code: "rights.features_unconfirmed", severity: "blocker", field: "featuredArtistClearances", message: "Featured-artist clearance must be confirmed, including confirmation that none are required." });
    if (rights.coverSong && rights.coverLicenseStatus !== "cleared") findings.push({ code: "rights.cover_not_cleared", severity: "blocker", field: "coverLicenseStatus", message: "Cover-song licensing must be cleared before distribution." });
    if (!rights.territoryRights.length) findings.push({ code: "rights.territories_missing", severity: "blocker", field: "territoryRights", message: "At least one authorized distribution territory is required." });
    if (rights.contentIdEligibility === "review_required") findings.push({ code: "content_id.review", severity: "warning", field: "contentIdEligibility", message: "YouTube Content ID eligibility still requires review. This does not block music-store delivery." });
  }

  await replaceSystemQc(workspaceId, releaseId, findings);
  const blockers = findings.filter((finding) => finding.severity === "blocker").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  const sql = getSql();
  await sql`
    INSERT INTO illco_label_distribution_events (workspace_id, release_id, event_type, payload, actor_user_id)
    VALUES (${workspaceId}::uuid, ${releaseId}::uuid, 'qc.completed', ${JSON.stringify({ blockers, warnings, findings: findings.length })}::jsonb, ${userId}::uuid)
  `;
  return { passed: blockers === 0, blockers, warnings, findings };
}

export async function submitReleaseDistribution(userId: string, workspaceId: string, releaseId: string, provider: string, destinations: string[]) {
  await ensureLabelDistributionSchema();
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager"]);
  const release = await getRelease(workspaceId, releaseId);
  if (!["approved", "scheduled", "delivered", "processing"].includes(release.stage)) {
    throw new Error("Release must be approved before distribution can be submitted.");
  }
  const normalizedDestinations = [...new Set(destinations.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
  if (!normalizedDestinations.length) throw new Error("Select at least one distribution destination.");

  const qc = await runReleaseQc(userId, workspaceId, releaseId);
  if (!qc.passed) throw new Error(`Distribution blocked by ${qc.blockers} QC blocker${qc.blockers === 1 ? "" : "s"}.`);

  const sql = getSql();
  const integration = (await sql`
    SELECT id::text AS id, status
    FROM illco_label_integrations
    WHERE workspace_id = ${workspaceId}::uuid AND lower(provider) = lower(${provider})
    LIMIT 1
  `) as Array<{ id: string; status: string }>;
  if (!integration[0] || integration[0].status !== "live") {
    throw new Error("DISTRIBUTION_PROVIDER_DISCONNECTED: Connect and verify the selected distribution provider before submitting a real release.");
  }

  const idempotencyKey = `${workspaceId}:${releaseId}:${provider.toLowerCase()}:${release.updated_at}:${normalizedDestinations.join(",")}`;
  const existing = (await sql`
    SELECT id::text AS id, state, provider, requested_at::text AS requested_at
    FROM illco_label_distribution_jobs
    WHERE idempotency_key = ${idempotencyKey}
    LIMIT 1
  `) as Array<{ id: string; state: string; provider: string; requested_at: string }>;
  if (existing[0]) return { ...existing[0], idempotent: true, destinations: normalizedDestinations };

  const jobs = (await sql`
    INSERT INTO illco_label_distribution_jobs (
      workspace_id, release_id, provider, state, idempotency_key, destinations, requested_by
    ) VALUES (
      ${workspaceId}::uuid, ${releaseId}::uuid, ${provider.trim()}, 'queued', ${idempotencyKey},
      ${JSON.stringify(normalizedDestinations)}::jsonb, ${userId}::uuid
    )
    RETURNING id::text AS id, state, provider, requested_at::text AS requested_at
  `) as Array<{ id: string; state: string; provider: string; requested_at: string }>;
  const job = jobs[0];
  if (!job) throw new Error("Distribution job creation failed.");

  for (const destination of normalizedDestinations) {
    await sql`
      INSERT INTO illco_label_delivery_destinations (job_id, workspace_id, release_id, destination, state)
      VALUES (${job.id}::uuid, ${workspaceId}::uuid, ${releaseId}::uuid, ${destination}, 'queued')
    `;
  }
  await sql`
    INSERT INTO illco_label_distribution_events (workspace_id, release_id, job_id, event_type, payload, actor_user_id)
    VALUES (${workspaceId}::uuid, ${releaseId}::uuid, ${job.id}::uuid, 'distribution.queued', ${JSON.stringify({ provider, destinations: normalizedDestinations })}::jsonb, ${userId}::uuid)
  `;
  return { ...job, idempotent: false, destinations: normalizedDestinations };
}

export async function requestReleaseTakedown(userId: string, workspaceId: string, releaseId: string, reason: string) {
  await ensureLabelDistributionSchema();
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager"]);
  await getRelease(workspaceId, releaseId);
  const sql = getSql();
  const jobs = (await sql`
    SELECT id::text AS id
    FROM illco_label_distribution_jobs
    WHERE workspace_id = ${workspaceId}::uuid AND release_id = ${releaseId}::uuid
    ORDER BY requested_at DESC
    LIMIT 1
  `) as Array<{ id: string }>;
  if (!jobs[0]) throw new Error("No distribution job exists for this release.");

  await sql`
    UPDATE illco_label_distribution_jobs SET state = 'takedown_pending', updated_at = NOW()
    WHERE id = ${jobs[0].id}::uuid
  `;
  await sql`
    UPDATE illco_label_delivery_destinations SET state = 'takedown_pending', updated_at = NOW()
    WHERE job_id = ${jobs[0].id}::uuid AND state <> 'taken_down'
  `;
  await sql`
    UPDATE illco_label_releases SET stage = 'takedown_requested', updated_at = NOW()
    WHERE id = ${releaseId}::uuid AND workspace_id = ${workspaceId}::uuid
  `;
  await sql`
    INSERT INTO illco_label_distribution_events (workspace_id, release_id, job_id, event_type, payload, actor_user_id)
    VALUES (${workspaceId}::uuid, ${releaseId}::uuid, ${jobs[0].id}::uuid, 'takedown.requested', ${JSON.stringify({ reason })}::jsonb, ${userId}::uuid)
  `;
  return { jobId: jobs[0].id, state: "takedown_pending" as const };
}

export async function getDistributionSnapshot(userId: string, workspaceId: string, releaseId?: string | null) {
  await ensureLabelDistributionSchema();
  await requireWorkspaceAccess(userId, workspaceId);
  const sql = getSql();
  const jobs = (await sql`
    SELECT id::text AS id, release_id::text AS release_id, provider, state, attempts,
           provider_job_id, destinations, last_error, requested_at::text AS requested_at,
           delivered_at::text AS delivered_at, updated_at::text AS updated_at
    FROM illco_label_distribution_jobs
    WHERE workspace_id = ${workspaceId}::uuid
      AND (${releaseId || null}::uuid IS NULL OR release_id = ${releaseId || null}::uuid)
    ORDER BY requested_at DESC
    LIMIT 200
  `) as unknown[];
  const deliveries = (await sql`
    SELECT id::text AS id, job_id::text AS job_id, release_id::text AS release_id,
           destination, state, external_release_id, store_url, last_error,
           submitted_at::text AS submitted_at, acknowledged_at::text AS acknowledged_at,
           live_at::text AS live_at, removed_at::text AS removed_at, updated_at::text AS updated_at
    FROM illco_label_delivery_destinations
    WHERE workspace_id = ${workspaceId}::uuid
      AND (${releaseId || null}::uuid IS NULL OR release_id = ${releaseId || null}::uuid)
    ORDER BY updated_at DESC
    LIMIT 500
  `) as unknown[];
  const qc = (await sql`
    SELECT id::text AS id, release_id::text AS release_id, code, severity, field, message, status, source,
           created_at::text AS created_at, updated_at::text AS updated_at
    FROM illco_label_release_qc
    WHERE workspace_id = ${workspaceId}::uuid
      AND (${releaseId || null}::uuid IS NULL OR release_id = ${releaseId || null}::uuid)
    ORDER BY created_at DESC
    LIMIT 500
  `) as unknown[];
  return { syncedAt: new Date().toISOString(), jobs, deliveries, qc };
}
