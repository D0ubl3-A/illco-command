import "@/lib/server-only";

import { z } from "zod";

import { getSql } from "@/lib/db";
import { labelReleaseStages } from "@/lib/label-command-domain";
import { requireWorkspaceAccess, type LabelRelease } from "@/lib/label-command-store";

const stageSchema = z.enum(labelReleaseStages);

type ReleaseStageRow = {
  id: string;
  workspace_id: string;
  artist_id: string | null;
  artist_name: string | null;
  title: string;
  release_type: LabelRelease["releaseType"];
  stage: LabelRelease["stage"];
  target_date: string | null;
  explicit: boolean;
  notes: string;
  source_status: LabelRelease["sourceStatus"];
  created_at: string;
  updated_at: string;
};

function toRelease(row: ReleaseStageRow): LabelRelease {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    artistId: row.artist_id,
    artistName: row.artist_name,
    title: row.title,
    releaseType: row.release_type,
    stage: row.stage,
    targetDate: row.target_date,
    explicit: Boolean(row.explicit),
    notes: row.notes,
    sourceStatus: row.source_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateLabelReleaseStage(
  userId: string,
  workspaceId: string,
  releaseId: string,
  rawStage: unknown,
) {
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager", "artist"]);
  const stage = stageSchema.parse(rawStage);
  const sql = getSql();

  const beforeRows = (await sql`
    SELECT
      r.id::text AS id,
      r.workspace_id::text AS workspace_id,
      r.artist_id::text AS artist_id,
      a.name AS artist_name,
      r.title,
      r.release_type,
      r.stage,
      r.target_date::text AS target_date,
      r.explicit,
      r.notes,
      r.source_status,
      r.created_at::text AS created_at,
      r.updated_at::text AS updated_at
    FROM illco_label_releases r
    LEFT JOIN illco_label_artists a ON a.id = r.artist_id
    WHERE r.id = ${releaseId}::uuid
      AND r.workspace_id = ${workspaceId}::uuid
      AND r.archived_at IS NULL
    LIMIT 1
  `) as ReleaseStageRow[];

  const beforeRow = beforeRows[0];
  if (!beforeRow) {
    throw new Error("Release not found.");
  }

  const rows = (await sql`
    UPDATE illco_label_releases
    SET stage = ${stage}, updated_at = NOW()
    WHERE id = ${releaseId}::uuid
      AND workspace_id = ${workspaceId}::uuid
      AND archived_at IS NULL
    RETURNING
      id::text AS id,
      workspace_id::text AS workspace_id,
      artist_id::text AS artist_id,
      NULL::text AS artist_name,
      title,
      release_type,
      stage,
      target_date::text AS target_date,
      explicit,
      notes,
      source_status,
      created_at::text AS created_at,
      updated_at::text AS updated_at
  `) as ReleaseStageRow[];

  const updatedRow = rows[0];
  if (!updatedRow) {
    throw new Error("Release stage update failed.");
  }

  const before = toRelease(beforeRow);
  const after = toRelease({ ...updatedRow, artist_name: before.artistName });

  await sql`
    INSERT INTO illco_label_audit_events (
      workspace_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      before_state,
      after_state
    )
    VALUES (
      ${workspaceId}::uuid,
      ${userId}::uuid,
      'release.stage_updated',
      'release',
      ${releaseId}::uuid,
      ${JSON.stringify(before)}::jsonb,
      ${JSON.stringify(after)}::jsonb
    )
  `;

  return after;
}
