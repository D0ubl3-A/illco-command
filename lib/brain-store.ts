import "@/lib/server-only";

import { createHash, randomUUID } from "node:crypto";

import { publicBrainSeed } from "@/lib/brain-seed";
import {
  brainKinds,
  brainPriorities,
  brainRelationTypes,
  brainStatuses,
  type BrainCommandResult,
  type BrainEvent,
  type BrainImportItem,
  type BrainItem,
  type BrainKind,
  type BrainLink,
  type BrainPriority,
  type BrainRelationType,
  type BrainStatus,
} from "@/lib/brain-types";
import { getDatabaseUrl, getSql, hasDatabase, hasDsqlDatabase } from "@/lib/db";

let brainSchemaReady: Promise<void> | null = null;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeText(value: unknown, fallback = "") {
  return String(value ?? fallback).replace(/\s+/g, " ").trim();
}

function normalizeTags(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,|]/) : [];
  return [...new Set(raw.map((tag) => normalizeText(tag).toLowerCase()).filter(Boolean))].slice(0, 30);
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function validKind(value: unknown): BrainKind {
  const normalized = normalizeText(value).toLowerCase();
  return brainKinds.includes(normalized as BrainKind) ? (normalized as BrainKind) : "memory";
}

function validStatus(value: unknown): BrainStatus {
  const normalized = normalizeText(value).toLowerCase();
  return brainStatuses.includes(normalized as BrainStatus) ? (normalized as BrainStatus) : "active";
}

function validPriority(value: unknown): BrainPriority {
  const normalized = normalizeText(value).toLowerCase();
  return brainPriorities.includes(normalized as BrainPriority) ? (normalized as BrainPriority) : "medium";
}

function validRelationType(value: unknown): BrainRelationType {
  const normalized = normalizeText(value).toLowerCase();
  return brainRelationTypes.includes(normalized as BrainRelationType) ? (normalized as BrainRelationType) : "related_to";
}

function clampProgress(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function clampStrength(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 3;
  return Math.max(1, Math.min(5, Math.round(numeric)));
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(normalizeText(value).toLowerCase());
}

function deterministicId(ownerEmail: string, externalId: string) {
  return `brain_${createHash("sha256").update(`${normalizeEmail(ownerEmail)}:${externalId}`).digest("hex").slice(0, 28)}`;
}

export async function ensureBrainSchema() {
  if (!hasDatabase()) {
    throw new Error("A database is required for persistent Brain OS storage.");
  }

  if (!brainSchemaReady) brainSchemaReady = createBrainSchema();

  try {
    await brainSchemaReady;
  } catch (error) {
    brainSchemaReady = null;
    throw error;
  }
}

async function createBrainSchema() {
  const sql = getSql();
  const usingDsql = !getDatabaseUrl() && hasDsqlDatabase();

  await sql`
    CREATE TABLE IF NOT EXISTS illco_brain_items (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      kind TEXT NOT NULL,
      area TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      priority TEXT NOT NULL DEFAULT 'medium',
      progress INTEGER NOT NULL DEFAULT 0,
      next_action TEXT NOT NULL DEFAULT '',
      pinned BOOLEAN NOT NULL DEFAULT FALSE,
      review_at TIMESTAMPTZ,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      source TEXT NOT NULL DEFAULT 'manual',
      source_url TEXT,
      due_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE illco_brain_items ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE illco_brain_items ADD COLUMN IF NOT EXISTS next_action TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE illco_brain_items ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE illco_brain_items ADD COLUMN IF NOT EXISTS review_at TIMESTAMPTZ`;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_brain_links (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      from_item_id TEXT NOT NULL,
      to_item_id TEXT NOT NULL,
      relation_type TEXT NOT NULL DEFAULT 'related_to',
      note TEXT NOT NULL DEFAULT '',
      strength INTEGER NOT NULL DEFAULT 3,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_brain_events (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      item_id TEXT,
      event_type TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  if (usingDsql) {
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_brain_owner ON illco_brain_items (owner_email)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_brain_status ON illco_brain_items (owner_email, status)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_brain_area ON illco_brain_items (owner_email, area)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_brain_links_owner ON illco_brain_links (owner_email)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_brain_events_owner ON illco_brain_events (owner_email, created_at)`;
  } else {
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_owner ON illco_brain_items (LOWER(owner_email))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_status ON illco_brain_items (LOWER(owner_email), status, updated_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_area ON illco_brain_items (LOWER(owner_email), area)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_due ON illco_brain_items (LOWER(owner_email), due_at) WHERE due_at IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_links_owner ON illco_brain_links (LOWER(owner_email), created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_links_from ON illco_brain_links (from_item_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_links_to ON illco_brain_links (to_item_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_events_owner ON illco_brain_events (LOWER(owner_email), created_at DESC)`;
  }
}

type BrainRow = {
  id: string;
  owner_email: string;
  kind: string;
  area: string;
  title: string;
  summary: string;
  status: string;
  priority: string;
  progress: number | string | null;
  next_action: string | null;
  pinned: boolean | string | number | null;
  review_at: string | null;
  tags: unknown;
  source: string;
  source_url: string | null;
  due_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type BrainLinkRow = {
  id: string;
  owner_email: string;
  from_item_id: string;
  to_item_id: string;
  relation_type: string;
  note: string;
  strength: number | string;
  created_at: string;
};

type BrainEventRow = {
  id: string;
  owner_email: string;
  item_id: string | null;
  event_type: string;
  detail: string;
  metadata: unknown;
  created_at: string;
};

function rowToItem(row: BrainRow): BrainItem {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    kind: validKind(row.kind),
    area: row.area,
    title: row.title,
    summary: row.summary,
    status: validStatus(row.status),
    priority: validPriority(row.priority),
    progress: clampProgress(row.progress),
    nextAction: row.next_action || "",
    pinned: normalizeBoolean(row.pinned),
    reviewAt: row.review_at,
    tags: normalizeTags(parseJsonValue<unknown[]>(row.tags, [])),
    source: row.source,
    sourceUrl: row.source_url,
    dueAt: row.due_at,
    metadata: parseJsonValue<Record<string, unknown>>(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToLink(row: BrainLinkRow): BrainLink {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    fromItemId: row.from_item_id,
    toItemId: row.to_item_id,
    relationType: validRelationType(row.relation_type),
    note: row.note || "",
    strength: clampStrength(row.strength),
    createdAt: row.created_at,
  };
}

function rowToEvent(row: BrainEventRow): BrainEvent {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    itemId: row.item_id,
    eventType: row.event_type,
    detail: row.detail,
    metadata: parseJsonValue<Record<string, unknown>>(row.metadata, {}),
    createdAt: row.created_at,
  };
}

async function upsertBrainItem(ownerEmail: string, input: BrainImportItem, options?: { deterministic?: boolean }) {
  const sql = getSql();
  const normalizedOwner = normalizeEmail(ownerEmail);
  const externalId = normalizeText(input.id) || `${normalizeText(input.kind)}:${normalizeText(input.area)}:${normalizeText(input.title)}`;
  const id = options?.deterministic ? deterministicId(normalizedOwner, externalId) : normalizeText(input.id) || randomUUID();
  const kind = validKind(input.kind);
  const area = normalizeText(input.area, "General") || "General";
  const title = normalizeText(input.title, "Untitled memory") || "Untitled memory";
  const summary = normalizeText(input.summary);
  const status = validStatus(input.status);
  const priority = validPriority(input.priority);
  const progress = clampProgress(input.progress);
  const nextAction = normalizeText(input.nextAction);
  const pinned = normalizeBoolean(input.pinned);
  const reviewAt = normalizeText(input.reviewAt) || null;
  const tagsJson = JSON.stringify(normalizeTags(input.tags));
  const source = normalizeText(input.source, "manual") || "manual";
  const sourceUrl = normalizeText(input.sourceUrl) || null;
  const dueAt = normalizeText(input.dueAt) || null;
  const metadataJson = JSON.stringify(input.metadata && typeof input.metadata === "object" ? input.metadata : {});

  await sql`
    INSERT INTO illco_brain_items (
      id, owner_email, kind, area, title, summary, status, priority, progress,
      next_action, pinned, review_at, tags, source, source_url, due_at, metadata,
      created_at, updated_at
    ) VALUES (
      ${id}, ${normalizedOwner}, ${kind}, ${area}, ${title}, ${summary}, ${status}, ${priority}, ${progress},
      ${nextAction}, ${pinned}, ${reviewAt}, ${tagsJson}::jsonb, ${source}, ${sourceUrl}, ${dueAt}, ${metadataJson}::jsonb,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      kind = EXCLUDED.kind,
      area = EXCLUDED.area,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      status = EXCLUDED.status,
      priority = EXCLUDED.priority,
      progress = EXCLUDED.progress,
      next_action = EXCLUDED.next_action,
      pinned = EXCLUDED.pinned,
      review_at = EXCLUDED.review_at,
      tags = EXCLUDED.tags,
      source = EXCLUDED.source,
      source_url = EXCLUDED.source_url,
      due_at = EXCLUDED.due_at,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    WHERE LOWER(illco_brain_items.owner_email) = LOWER(EXCLUDED.owner_email)
  `;

  return id;
}

export async function logBrainEvent(
  ownerEmail: string,
  input: { itemId?: string | null; eventType: string; detail: string; metadata?: Record<string, unknown> },
) {
  await ensureBrainSchema();
  const sql = getSql();
  const metadataJson = JSON.stringify(input.metadata || {});
  await sql`
    INSERT INTO illco_brain_events (id, owner_email, item_id, event_type, detail, metadata, created_at)
    VALUES (${randomUUID()}, ${normalizeEmail(ownerEmail)}, ${input.itemId || null}, ${normalizeText(input.eventType)}, ${normalizeText(input.detail)}, ${metadataJson}::jsonb, NOW())
  `;
}

export async function seedBrain(ownerEmail: string) {
  await ensureBrainSchema();
  for (const item of publicBrainSeed) await upsertBrainItem(ownerEmail, item, { deterministic: true });
}

export async function listBrainItems(ownerEmail: string) {
  await ensureBrainSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id, owner_email, kind, area, title, summary, status, priority, progress,
      next_action, pinned, review_at::text AS review_at, tags, source, source_url,
      due_at::text AS due_at, metadata, created_at::text AS created_at, updated_at::text AS updated_at
    FROM illco_brain_items
    WHERE LOWER(owner_email) = LOWER(${normalizeEmail(ownerEmail)})
    ORDER BY
      pinned DESC,
      CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      CASE status WHEN 'next' THEN 1 WHEN 'blocked' THEN 2 WHEN 'active' THEN 3 WHEN 'waiting' THEN 4 WHEN 'done' THEN 5 ELSE 6 END,
      updated_at DESC
  `) as BrainRow[];
  return rows.map(rowToItem);
}

export async function getBrainItem(ownerEmail: string, itemId: string) {
  const items = await listBrainItems(ownerEmail);
  return items.find((item) => item.id === itemId) || null;
}

export async function listBrainLinks(ownerEmail: string) {
  await ensureBrainSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, owner_email, from_item_id, to_item_id, relation_type, note, strength, created_at::text AS created_at
    FROM illco_brain_links
    WHERE LOWER(owner_email) = LOWER(${normalizeEmail(ownerEmail)})
    ORDER BY strength DESC, created_at DESC
  `) as BrainLinkRow[];
  return rows.map(rowToLink);
}

export async function listBrainEvents(ownerEmail: string, limit = 80) {
  await ensureBrainSchema();
  const sql = getSql();
  const safeLimit = Math.max(1, Math.min(200, Math.round(limit)));
  const rows = (await sql`
    SELECT id, owner_email, item_id, event_type, detail, metadata, created_at::text AS created_at
    FROM illco_brain_events
    WHERE LOWER(owner_email) = LOWER(${normalizeEmail(ownerEmail)})
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `) as BrainEventRow[];
  return rows.map(rowToEvent);
}

export async function createBrainItem(ownerEmail: string, input: BrainImportItem) {
  await ensureBrainSchema();
  if (!normalizeText(input.title)) throw new Error("A title is required.");
  const id = await upsertBrainItem(ownerEmail, { ...input, id: randomUUID(), source: input.source || "manual" });
  await logBrainEvent(ownerEmail, { itemId: id, eventType: "created", detail: `Created ${normalizeText(input.title)}.` });
  return id;
}

export async function updateBrainItem(ownerEmail: string, itemId: string, input: BrainImportItem) {
  await ensureBrainSchema();
  const existing = await getBrainItem(ownerEmail, itemId);
  if (!existing) throw new Error("Brain memory not found.");
  await upsertBrainItem(ownerEmail, {
    id: existing.id,
    kind: input.kind ?? existing.kind,
    area: input.area ?? existing.area,
    title: input.title ?? existing.title,
    summary: input.summary ?? existing.summary,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    progress: input.progress ?? existing.progress,
    nextAction: input.nextAction ?? existing.nextAction,
    pinned: input.pinned ?? existing.pinned,
    reviewAt: input.reviewAt ?? existing.reviewAt,
    tags: input.tags ?? existing.tags,
    source: input.source ?? existing.source,
    sourceUrl: input.sourceUrl ?? existing.sourceUrl,
    dueAt: input.dueAt ?? existing.dueAt,
    metadata: input.metadata ?? existing.metadata,
  });
  await logBrainEvent(ownerEmail, { itemId, eventType: "updated", detail: `Updated ${existing.title}.` });
}

export async function updateBrainItemStatus(ownerEmail: string, itemId: string, status: BrainStatus) {
  await ensureBrainSchema();
  const item = await getBrainItem(ownerEmail, itemId);
  if (!item) throw new Error("Brain memory not found.");
  const nextStatus = validStatus(status);
  const progress = nextStatus === "done" ? 100 : item.progress;
  const sql = getSql();
  await sql`
    UPDATE illco_brain_items
    SET status = ${nextStatus}, progress = ${progress}, updated_at = NOW()
    WHERE id = ${normalizeText(itemId)} AND LOWER(owner_email) = LOWER(${normalizeEmail(ownerEmail)})
  `;
  await logBrainEvent(ownerEmail, { itemId, eventType: "status", detail: `${item.title} moved from ${item.status} to ${nextStatus}.` });
}

export async function setBrainItemPinned(ownerEmail: string, itemId: string, pinned: boolean) {
  await ensureBrainSchema();
  const item = await getBrainItem(ownerEmail, itemId);
  if (!item) throw new Error("Brain memory not found.");
  const sql = getSql();
  await sql`
    UPDATE illco_brain_items
    SET pinned = ${Boolean(pinned)}, updated_at = NOW()
    WHERE id = ${itemId} AND LOWER(owner_email) = LOWER(${normalizeEmail(ownerEmail)})
  `;
  await logBrainEvent(ownerEmail, { itemId, eventType: pinned ? "pinned" : "unpinned", detail: `${pinned ? "Pinned" : "Unpinned"} ${item.title}.` });
}

export async function createBrainLink(
  ownerEmail: string,
  input: { fromItemId: string; toItemId: string; relationType?: BrainRelationType; note?: string; strength?: number },
) {
  await ensureBrainSchema();
  const fromItemId = normalizeText(input.fromItemId);
  const toItemId = normalizeText(input.toItemId);
  if (!fromItemId || !toItemId || fromItemId === toItemId) throw new Error("Choose two different memories to connect.");
  const items = await listBrainItems(ownerEmail);
  const from = items.find((item) => item.id === fromItemId);
  const to = items.find((item) => item.id === toItemId);
  if (!from || !to) throw new Error("One or both memories could not be found.");
  const relationType = validRelationType(input.relationType);
  const id = deterministicId(ownerEmail, `link:${fromItemId}:${relationType}:${toItemId}`);
  const sql = getSql();
  await sql`
    INSERT INTO illco_brain_links (id, owner_email, from_item_id, to_item_id, relation_type, note, strength, created_at)
    VALUES (${id}, ${normalizeEmail(ownerEmail)}, ${fromItemId}, ${toItemId}, ${relationType}, ${normalizeText(input.note)}, ${clampStrength(input.strength)}, NOW())
    ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note, strength = EXCLUDED.strength
    WHERE LOWER(illco_brain_links.owner_email) = LOWER(EXCLUDED.owner_email)
  `;
  await logBrainEvent(ownerEmail, {
    itemId: fromItemId,
    eventType: "linked",
    detail: `${from.title} ${relationType.replaceAll("_", " ")} ${to.title}.`,
    metadata: { toItemId, relationType },
  });
  return id;
}

export async function importBrainItems(ownerEmail: string, input: unknown) {
  await ensureBrainSchema();
  const parsed = Array.isArray(input) ? input : input && typeof input === "object" && Array.isArray((input as { items?: unknown }).items) ? (input as { items: unknown[] }).items : null;
  if (!parsed) throw new Error("Import must be a JSON array or an object with an items array.");
  if (parsed.length > 500) throw new Error("Import is limited to 500 items per run.");

  let imported = 0;
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as BrainImportItem;
    if (!normalizeText(item.title)) continue;
    await upsertBrainItem(
      ownerEmail,
      { ...item, source: normalizeText(item.source, "Private memory import") || "Private memory import" },
      { deterministic: Boolean(item.id) },
    );
    imported += 1;
  }
  await logBrainEvent(ownerEmail, { eventType: "import", detail: `Imported ${imported} Brain OS records.` });
  return imported;
}

function scoreFocus(item: BrainItem, now: number) {
  if (["done", "archived"].includes(item.status)) return -1000;
  let score = 0;
  if (item.pinned) score += 12;
  if (item.status === "blocked") score += 10;
  if (item.status === "next") score += 8;
  if (item.priority === "critical") score += 10;
  if (item.priority === "high") score += 5;
  if (item.nextAction) score += 3;
  if (item.dueAt) {
    const due = Date.parse(item.dueAt);
    if (Number.isFinite(due) && due < now) score += 12;
    else if (Number.isFinite(due) && due - now < 7 * 86_400_000) score += 7;
  }
  score += Math.max(0, (100 - item.progress) / 25);
  return score;
}

function resolveItem(items: BrainItem[], query: string) {
  const normalized = normalizeText(query).toLowerCase();
  if (!normalized) return null;
  return (
    items.find((item) => item.id.toLowerCase() === normalized) ||
    items.find((item) => item.title.toLowerCase() === normalized) ||
    items.find((item) => item.title.toLowerCase().includes(normalized)) ||
    null
  );
}

function parseCommandOptions(value: string) {
  const segments = value.split("|").map((segment) => segment.trim()).filter(Boolean);
  const title = segments.shift() || "";
  const options = new Map<string, string>();
  for (const segment of segments) {
    const [key, ...rest] = segment.split("=");
    if (key && rest.length) options.set(key.trim().toLowerCase(), rest.join("=").trim());
  }
  return { title, options };
}

export async function executeBrainCommand(ownerEmail: string, rawCommand: string): Promise<BrainCommandResult> {
  await ensureBrainSchema();
  const command = normalizeText(rawCommand);
  const normalized = command.toLowerCase().replace(/^\//, "");
  const items = await listBrainItems(ownerEmail);
  const now = Date.now();

  if (!normalized || normalized === "help") {
    return {
      command,
      mutation: "none",
      itemIds: [],
      message: "Commands: focus, blocked, overdue, stale, find: words, create task: title | area=Area | priority=high | due=YYYY-MM-DD, done: title, pin: title, unpin: title, link: first -> second | relation=depends_on.",
    };
  }

  if (["focus", "today", "brief"].includes(normalized)) {
    const focus = [...items].sort((a, b) => scoreFocus(b, now) - scoreFocus(a, now)).slice(0, 7);
    return { command, mutation: "none", itemIds: focus.map((item) => item.id), message: `Your top ${focus.length} focus items are surfaced below.` };
  }

  if (normalized === "blocked") {
    const matches = items.filter((item) => item.status === "blocked");
    return { command, mutation: "none", itemIds: matches.map((item) => item.id), message: `${matches.length} blocked item${matches.length === 1 ? "" : "s"} found.` };
  }

  if (normalized === "overdue") {
    const matches = items.filter((item) => item.dueAt && Date.parse(item.dueAt) < now && !["done", "archived"].includes(item.status));
    return { command, mutation: "none", itemIds: matches.map((item) => item.id), message: `${matches.length} overdue item${matches.length === 1 ? "" : "s"} found.` };
  }

  if (normalized === "stale" || normalized === "review") {
    const staleBefore = now - 14 * 86_400_000;
    const matches = items.filter((item) => Date.parse(item.updatedAt) < staleBefore && !["done", "archived"].includes(item.status));
    return { command, mutation: "none", itemIds: matches.map((item) => item.id), message: `${matches.length} open item${matches.length === 1 ? "" : "s"} need review.` };
  }

  if (normalized.startsWith("find:") || normalized.startsWith("search:")) {
    const query = command.slice(command.indexOf(":") + 1).trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches = items.filter((item) => {
      const haystack = [item.title, item.summary, item.area, item.kind, item.status, item.priority, item.nextAction, ...item.tags].join(" ").toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
    return { command, mutation: "none", itemIds: matches.map((item) => item.id), message: `${matches.length} matching memories found for “${query}”.` };
  }

  if (normalized.startsWith("create task:") || normalized.startsWith("new task:")) {
    const value = command.slice(command.indexOf(":") + 1).trim();
    const { title, options } = parseCommandOptions(value);
    if (!title) throw new Error("Add a task title after the colon.");
    const id = await createBrainItem(ownerEmail, {
      kind: "task",
      title,
      area: options.get("area") || "Second Brain",
      priority: validPriority(options.get("priority")),
      status: "next",
      dueAt: options.get("due") || null,
      nextAction: options.get("next") || "",
      tags: options.get("tags") || "",
      source: "Brain command",
    });
    return { command, mutation: "created", itemIds: [id], message: `Created task: ${title}.` };
  }

  if (normalized.startsWith("done:") || normalized.startsWith("complete:")) {
    const query = command.slice(command.indexOf(":") + 1).trim();
    const item = resolveItem(items, query);
    if (!item) throw new Error(`No memory matched “${query}”.`);
    await updateBrainItemStatus(ownerEmail, item.id, "done");
    return { command, mutation: "updated", itemIds: [item.id], message: `Marked ${item.title} done.` };
  }

  if (normalized.startsWith("pin:") || normalized.startsWith("unpin:")) {
    const shouldPin = normalized.startsWith("pin:");
    const query = command.slice(command.indexOf(":") + 1).trim();
    const item = resolveItem(items, query);
    if (!item) throw new Error(`No memory matched “${query}”.`);
    await setBrainItemPinned(ownerEmail, item.id, shouldPin);
    return { command, mutation: "updated", itemIds: [item.id], message: `${shouldPin ? "Pinned" : "Unpinned"} ${item.title}.` };
  }

  if (normalized.startsWith("link:")) {
    const value = command.slice(command.indexOf(":") + 1).trim();
    const { title: pair, options } = parseCommandOptions(value);
    const [fromQuery, toQuery] = pair.split("->").map((part) => part.trim());
    const from = resolveItem(items, fromQuery || "");
    const to = resolveItem(items, toQuery || "");
    if (!from || !to) throw new Error("Use: link: first memory -> second memory | relation=depends_on");
    await createBrainLink(ownerEmail, {
      fromItemId: from.id,
      toItemId: to.id,
      relationType: validRelationType(options.get("relation")),
      note: options.get("note") || "",
      strength: Number(options.get("strength") || 3),
    });
    return { command, mutation: "created", itemIds: [from.id, to.id], message: `Connected ${from.title} to ${to.title}.` };
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const matches = items.filter((item) => {
    const haystack = [item.title, item.summary, item.area, item.kind, item.status, item.priority, item.nextAction, ...item.tags].join(" ").toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
  return { command, mutation: "none", itemIds: matches.map((item) => item.id), message: `${matches.length} matching memories found.` };
}
