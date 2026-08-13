import "@/lib/server-only";

import { getSql } from "@/lib/db";
import {
  createArtistInputSchema,
  createLabelAccountInputSchema,
  createReleaseInputSchema,
  normalizeLabelSlug,
  updateReleaseInputSchema,
  type LabelMemberRole,
  type LabelAccountType,
  type LabelReleaseStage,
  type LabelReleaseType,
  type LabelSourceStatus,
} from "@/lib/label-command-domain";
import { ensureLabelCommandSchema } from "@/lib/label-command-schema";
import type { UserAccount } from "@/lib/user-accounts";

export type LabelWorkspace = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  role: LabelMemberRole;
  createdAt: string;
  updatedAt: string;
};

export type LabelAccount = {
  userId: string;
  accountType: LabelAccountType;
  displayName: string;
};

export type LabelArtist = {
  id: string;
  workspaceId: string;
  name: string;
  genre: string;
  status: string;
  sourceStatus: LabelSourceStatus;
  createdAt: string;
  updatedAt: string;
};

export type LabelRelease = {
  id: string;
  workspaceId: string;
  artistId: string | null;
  artistName: string | null;
  title: string;
  releaseType: LabelReleaseType;
  stage: LabelReleaseStage;
  targetDate: string | null;
  explicit: boolean;
  notes: string;
  sourceStatus: LabelSourceStatus;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  role?: LabelMemberRole | null;
};

type ArtistRow = {
  id: string;
  workspace_id: string;
  name: string;
  genre: string;
  status: string;
  source_status: LabelSourceStatus;
  created_at: string;
  updated_at: string;
};

type AccountRow = {
  user_id: string;
  account_type: LabelAccountType;
  display_name: string;
};

type ReleaseRow = {
  id: string;
  workspace_id: string;
  artist_id: string | null;
  artist_name: string | null;
  title: string;
  release_type: LabelReleaseType;
  stage: LabelReleaseStage;
  target_date: string | null;
  explicit: boolean;
  notes: string;
  source_status: LabelSourceStatus;
  created_at: string;
  updated_at: string;
};

function toWorkspace(row: WorkspaceRow, userId: string): LabelWorkspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    role: row.role || (row.owner_user_id === userId ? "owner" : "viewer"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getLabelAccount(userId: string): Promise<LabelAccount | null> {
  await ensureLabelCommandSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT user_id::text AS user_id, account_type, display_name
    FROM illco_label_accounts
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `) as AccountRow[];
  const row = rows[0];
  return row ? { userId: row.user_id, accountType: row.account_type, displayName: row.display_name } : null;
}

export async function createLabelAccount(user: UserAccount, rawInput: unknown) {
  await ensureLabelCommandSchema();
  const input = createLabelAccountInputSchema.parse(rawInput);
  const existing = await getLabelAccount(user.id);
  if (existing) throw new Error("This account has already completed Label Command onboarding.");

  const sql = getSql();
  const workspaceName = input.accountType === "label_owner" ? input.labelName : `${input.artistName} Music`;
  const slug = `${normalizeLabelSlug(workspaceName)}-${user.id.replace(/-/g, "").slice(0, 6)}`.slice(0, 68);
  const priorWorkspaceRows = (await sql`
    SELECT id::text AS id, owner_user_id::text AS owner_user_id, name, slug, timezone,
      created_at::text AS created_at, updated_at::text AS updated_at
    FROM illco_label_workspaces
    WHERE owner_user_id = ${user.id}::uuid
    ORDER BY created_at ASC
    LIMIT 1
  `) as WorkspaceRow[];
  const createdWorkspaceRows = priorWorkspaceRows[0] ? [] : (await sql`
      INSERT INTO illco_label_workspaces (owner_user_id, name, slug)
      VALUES (${user.id}::uuid, ${workspaceName}, ${slug})
      RETURNING id::text AS id, owner_user_id::text AS owner_user_id, name, slug, timezone,
        created_at::text AS created_at, updated_at::text AS updated_at
    `) as WorkspaceRow[];
  const workspace = priorWorkspaceRows[0] || createdWorkspaceRows[0];
  if (!workspace?.id) throw new Error("Label workspace creation failed.");

  const role: LabelMemberRole = input.accountType === "label_owner" ? "owner" : "artist";
  const membershipRows = (await sql`
    UPDATE illco_label_memberships
    SET role = ${role}, status = 'active', accepted_at = COALESCE(accepted_at, NOW()), updated_at = NOW()
    WHERE workspace_id = ${workspace.id}::uuid AND user_id = ${user.id}::uuid
    RETURNING id::text AS id
  `) as Array<{ id: string }>;
  if (!membershipRows[0]) {
    await sql`
      INSERT INTO illco_label_memberships (workspace_id, user_id, role, status, accepted_at)
      VALUES (${workspace.id}::uuid, ${user.id}::uuid, ${role}, 'active', NOW())
    `;
  }
  await sql`
    INSERT INTO illco_label_accounts (user_id, account_type, display_name)
    VALUES (${user.id}::uuid, ${input.accountType}, ${input.displayName})
  `;

  if (input.accountType === "artist") {
    await sql`
      INSERT INTO illco_label_artists (workspace_id, user_id, name, genre, status, source_status, created_by)
      VALUES (${workspace.id}::uuid, ${user.id}::uuid, ${input.artistName}, ${input.genre}, 'active', 'manual', ${user.id}::uuid)
    `;
  }

  await audit({
    workspaceId: workspace.id,
    userId: user.id,
    action: "account.onboarded",
    entityType: "workspace",
    entityId: workspace.id,
    afterState: { accountType: input.accountType, role, name: workspace.name },
  });

  return {
    account: { userId: user.id, accountType: input.accountType, displayName: input.displayName },
    workspace: toWorkspace({ ...workspace, role }, user.id),
  };
}

function toArtist(row: ArtistRow): LabelArtist {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    genre: row.genre,
    status: row.status,
    sourceStatus: row.source_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRelease(row: ReleaseRow): LabelRelease {
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

async function audit(input: {
  workspaceId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeState?: unknown;
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
      before_state,
      after_state
    )
    VALUES (
      ${input.workspaceId}::uuid,
      ${input.userId}::uuid,
      ${input.action},
      ${input.entityType},
      ${input.entityId || null}::uuid,
      ${input.beforeState ? JSON.stringify(input.beforeState) : null}::jsonb,
      ${input.afterState ? JSON.stringify(input.afterState) : null}::jsonb
    )
  `;
}

export async function getOrCreateLabelWorkspace(user: UserAccount): Promise<LabelWorkspace> {
  await ensureLabelCommandSchema();
  const sql = getSql();

  const existing = (await sql`
    SELECT
      w.id::text AS id,
      w.owner_user_id::text AS owner_user_id,
      w.name,
      w.slug,
      w.timezone,
      w.created_at::text AS created_at,
      w.updated_at::text AS updated_at,
      m.role
    FROM illco_label_workspaces w
    LEFT JOIN illco_label_memberships m
      ON m.workspace_id = w.id
     AND m.user_id = ${user.id}::uuid
     AND m.status = 'active'
    WHERE w.owner_user_id = ${user.id}::uuid
       OR m.user_id = ${user.id}::uuid
    ORDER BY CASE WHEN w.owner_user_id = ${user.id}::uuid THEN 0 ELSE 1 END, w.created_at ASC
    LIMIT 1
  `) as WorkspaceRow[];

  if (existing[0]) {
    return toWorkspace(existing[0], user.id);
  }

  const baseName = user.company?.trim() || `${user.name.trim() || "My"} Label`;
  const baseSlug = normalizeLabelSlug(baseName);
  const suffix = user.id.replace(/-/g, "").slice(0, 6);
  const slug = `${baseSlug}-${suffix}`.slice(0, 68);

  const rows = (await sql`
    INSERT INTO illco_label_workspaces (owner_user_id, name, slug)
    VALUES (${user.id}::uuid, ${baseName}, ${slug})
    RETURNING
      id::text AS id,
      owner_user_id::text AS owner_user_id,
      name,
      slug,
      timezone,
      created_at::text AS created_at,
      updated_at::text AS updated_at
  `) as WorkspaceRow[];

  const workspace = rows[0];
  if (!workspace?.id) {
    throw new Error("Label workspace creation failed.");
  }

  await sql`
    INSERT INTO illco_label_memberships (workspace_id, user_id, role, status, accepted_at)
    VALUES (${workspace.id}::uuid, ${user.id}::uuid, 'owner', 'active', NOW())
  `;

  await audit({
    workspaceId: workspace.id,
    userId: user.id,
    action: "workspace.created",
    entityType: "workspace",
    entityId: workspace.id,
    afterState: { name: workspace.name, slug: workspace.slug },
  });

  return toWorkspace({ ...workspace, role: "owner" }, user.id);
}

export async function requireWorkspaceAccess(userId: string, workspaceId: string, allowedRoles?: LabelMemberRole[]) {
  await ensureLabelCommandSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      w.id::text AS id,
      w.owner_user_id::text AS owner_user_id,
      w.name,
      w.slug,
      w.timezone,
      w.created_at::text AS created_at,
      w.updated_at::text AS updated_at,
      m.role
    FROM illco_label_workspaces w
    LEFT JOIN illco_label_memberships m
      ON m.workspace_id = w.id
     AND m.user_id = ${userId}::uuid
     AND m.status = 'active'
    WHERE w.id = ${workspaceId}::uuid
      AND (w.owner_user_id = ${userId}::uuid OR m.user_id = ${userId}::uuid)
    LIMIT 1
  `) as WorkspaceRow[];

  const row = rows[0];
  if (!row) {
    throw new Error("Label workspace not found or access denied.");
  }

  const workspace = toWorkspace(row, userId);
  if (allowedRoles && !allowedRoles.includes(workspace.role)) {
    throw new Error("Your label role cannot perform that action.");
  }

  return workspace;
}

export async function listLabelArtists(userId: string, workspaceId: string) {
  const workspace = await requireWorkspaceAccess(userId, workspaceId);
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id,
      workspace_id::text AS workspace_id,
      name,
      genre,
      status,
      source_status,
      created_at::text AS created_at,
      updated_at::text AS updated_at
    FROM illco_label_artists
    WHERE workspace_id = ${workspaceId}::uuid
      AND archived_at IS NULL
      AND (${workspace.role} <> 'artist' OR user_id = ${userId}::uuid)
    ORDER BY name ASC
  `) as ArtistRow[];
  return rows.map(toArtist);
}

export async function createLabelArtist(userId: string, workspaceId: string, rawInput: unknown) {
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager"]);
  const input = createArtistInputSchema.parse(rawInput);
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_label_artists (workspace_id, name, genre, status, source_status, created_by)
    VALUES (${workspaceId}::uuid, ${input.name}, ${input.genre}, ${input.status}, 'manual', ${userId}::uuid)
    RETURNING
      id::text AS id,
      workspace_id::text AS workspace_id,
      name,
      genre,
      status,
      source_status,
      created_at::text AS created_at,
      updated_at::text AS updated_at
  `) as ArtistRow[];

  const artist = rows[0];
  if (!artist?.id) {
    throw new Error("Artist creation failed.");
  }

  const result = toArtist(artist);
  await audit({
    workspaceId,
    userId,
    action: "artist.created",
    entityType: "artist",
    entityId: result.id,
    afterState: result,
  });
  return result;
}

export async function listLabelReleases(userId: string, workspaceId: string) {
  const workspace = await requireWorkspaceAccess(userId, workspaceId);
  const sql = getSql();
  const rows = (await sql`
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
    WHERE r.workspace_id = ${workspaceId}::uuid
      AND r.archived_at IS NULL
      AND (${workspace.role} <> 'artist' OR a.user_id = ${userId}::uuid)
    ORDER BY COALESCE(r.target_date, DATE '9999-12-31') ASC, r.updated_at DESC
  `) as ReleaseRow[];
  return rows.map(toRelease);
}

async function assertArtistBelongsToWorkspace(workspaceId: string, artistId: string | null) {
  if (!artistId) return;
  const sql = getSql();
  const rows = (await sql`
    SELECT id::text AS id
    FROM illco_label_artists
    WHERE id = ${artistId}::uuid
      AND workspace_id = ${workspaceId}::uuid
      AND archived_at IS NULL
    LIMIT 1
  `) as Array<{ id: string }>;
  if (!rows[0]) {
    throw new Error("Selected artist does not belong to this label workspace.");
  }
}

async function requireArtistIdentity(userId: string, workspaceId: string, role: LabelMemberRole, artistId: string | null) {
  if (role !== "artist") return artistId;
  const sql = getSql();
  const rows = (await sql`
    SELECT id::text AS id
    FROM illco_label_artists
    WHERE workspace_id = ${workspaceId}::uuid
      AND user_id = ${userId}::uuid
      AND archived_at IS NULL
    LIMIT 1
  `) as Array<{ id: string }>;
  const ownArtistId = rows[0]?.id;
  if (!ownArtistId) throw new Error("Your artist account is not linked to an artist profile.");
  if (artistId && artistId !== ownArtistId) throw new Error("Artist accounts can only manage their own catalog.");
  return ownArtistId;
}

export async function createLabelRelease(userId: string, workspaceId: string, rawInput: unknown) {
  const workspace = await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager", "artist"]);
  const input = createReleaseInputSchema.parse(rawInput);
  const artistId = await requireArtistIdentity(userId, workspaceId, workspace.role, input.artistId);
  await assertArtistBelongsToWorkspace(workspaceId, artistId);

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_label_releases (
      workspace_id,
      artist_id,
      title,
      release_type,
      stage,
      target_date,
      explicit,
      notes,
      source_status,
      created_by
    )
    VALUES (
      ${workspaceId}::uuid,
      ${artistId}::uuid,
      ${input.title},
      ${input.releaseType},
      ${input.stage},
      ${input.targetDate},
      ${input.explicit},
      ${input.notes},
      'manual',
      ${userId}::uuid
    )
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
  `) as ReleaseRow[];

  const release = rows[0];
  if (!release?.id) {
    throw new Error("Release creation failed.");
  }

  const result = toRelease(release);
  await audit({
    workspaceId,
    userId,
    action: "release.created",
    entityType: "release",
    entityId: result.id,
    afterState: result,
  });
  return result;
}

export async function updateLabelRelease(userId: string, workspaceId: string, releaseId: string, rawInput: unknown) {
  const workspace = await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager", "artist"]);
  const input = updateReleaseInputSchema.parse({ ...(rawInput as object), id: releaseId });
  const selectedArtistId = await requireArtistIdentity(userId, workspaceId, workspace.role, input.artistId ?? null);
  if (input.artistId !== undefined) {
    await assertArtistBelongsToWorkspace(workspaceId, input.artistId);
  }

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
  `) as ReleaseRow[];

  if (!beforeRows[0]) {
    throw new Error("Release not found.");
  }
  if (workspace.role === "artist" && beforeRows[0].artist_id !== selectedArtistId) {
    throw new Error("Artist accounts can only manage their own catalog.");
  }

  const before = toRelease(beforeRows[0]);
  const rows = (await sql`
    UPDATE illco_label_releases
    SET title = COALESCE(${input.title ?? null}, title),
        artist_id = CASE WHEN ${input.artistId !== undefined} THEN ${input.artistId ?? null}::uuid ELSE artist_id END,
        release_type = COALESCE(${input.releaseType ?? null}, release_type),
        stage = COALESCE(${input.stage ?? null}, stage),
        target_date = CASE WHEN ${input.targetDate !== undefined} THEN ${input.targetDate}::date ELSE target_date END,
        explicit = COALESCE(${input.explicit ?? null}, explicit),
        notes = COALESCE(${input.notes ?? null}, notes),
        updated_at = NOW()
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
  `) as ReleaseRow[];

  const release = rows[0];
  if (!release?.id) {
    throw new Error("Release update failed.");
  }

  const result = toRelease(release);
  await audit({
    workspaceId,
    userId,
    action: "release.updated",
    entityType: "release",
    entityId: releaseId,
    beforeState: before,
    afterState: result,
  });
  return result;
}

export async function archiveLabelRelease(userId: string, workspaceId: string, releaseId: string) {
  await requireWorkspaceAccess(userId, workspaceId, ["owner", "admin", "manager"]);
  const sql = getSql();
  const rows = (await sql`
    UPDATE illco_label_releases
    SET archived_at = NOW(), stage = 'archived', updated_at = NOW()
    WHERE id = ${releaseId}::uuid
      AND workspace_id = ${workspaceId}::uuid
      AND archived_at IS NULL
    RETURNING id::text AS id, title
  `) as Array<{ id: string; title: string }>;

  const release = rows[0];
  if (!release?.id) {
    throw new Error("Release not found.");
  }

  await audit({
    workspaceId,
    userId,
    action: "release.archived",
    entityType: "release",
    entityId: releaseId,
    afterState: { title: release.title, stage: "archived" },
  });
  return { id: release.id, archived: true };
}

export async function getLabelWorkspaceSnapshot(user: UserAccount) {
  const account = await getLabelAccount(user.id);
  if (!account) return null;
  const workspace = await getOrCreateLabelWorkspace(user);
  const [artists, releases] = await Promise.all([
    listLabelArtists(user.id, workspace.id),
    listLabelReleases(user.id, workspace.id),
  ]);

  return {
    account,
    workspace,
    artists,
    releases,
    counts: {
      artists: artists.length,
      releases: releases.length,
      releaseAttention: releases.filter((release) => ["needs_information", "rejected", "correction_required"].includes(release.stage)).length,
    },
  };
}
