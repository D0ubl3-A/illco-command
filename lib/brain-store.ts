import "@/lib/server-only";

import { createHash, randomUUID } from "node:crypto";

import { publicBrainSeed } from "@/lib/brain-seed";
import {
  brainKinds,
  brainPriorities,
  brainStatuses,
  type BrainImportItem,
  type BrainItem,
  type BrainKind,
  type BrainPriority,
  type BrainSnapshot,
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
  return [...new Set(raw.map((tag) => normalizeText(tag).toLowerCase()).filter(Boolean))].slice(0, 20);
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

function deterministicId(ownerEmail: string, externalId: string) {
  return `brain_${createHash("sha256").update(`${normalizeEmail(ownerEmail)}:${externalId}`).digest("hex").slice(0, 28)}`;
}

export async function ensureBrainSchema() {
  if (!hasDatabase()) {
    throw new Error("A database is required for persistent Brain OS storage.");
  }

  if (!brainSchemaReady) {
    brainSchemaReady = createBrainSchema();
  }

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
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      source TEXT NOT NULL DEFAULT 'manual',
      source_url TEXT,
      due_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  if (usingDsql) {
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_brain_owner ON illco_brain_items (owner_email)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_brain_status ON illco_brain_items (owner_email, status)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_brain_area ON illco_brain_items (owner_email, area)`;
  } else {
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_owner ON illco_brain_items (LOWER(owner_email))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_status ON illco_brain_items (LOWER(owner_email), status, updated_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_brain_area ON illco_brain_items (LOWER(owner_email), area)`;
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
  tags: unknown;
  source: string;
  source_url: string | null;
  due_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
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
    tags: normalizeTags(parseJsonValue<unknown[]>(row.tags, [])),
    source: row.source,
    sourceUrl: row.source_url,
    dueAt: row.due_at,
    metadata: parseJsonValue<Record<string, unknown>>(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  const tagsJson = JSON.stringify(normalizeTags(input.tags));
  const source = normalizeText(input.source, "manual") || "manual";
  const sourceUrl = normalizeText(input.sourceUrl) || null;
  const dueAt = normalizeText(input.dueAt) || null;
  const metadataJson = JSON.stringify(input.metadata && typeof input.metadata === "object" ? input.metadata : {});

  await sql`
    INSERT INTO illco_brain_items (
      id,
      owner_email,
      kind,
      area,
      title,
      summary,
      status,
      priority,
      tags,
      source,
      source_url,
      due_at,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      ${id},
      ${normalizedOwner},
      ${kind},
      ${area},
      ${title},
      ${summary},
      ${status},
      ${priority},
      ${tagsJson}::jsonb,
      ${source},
      ${sourceUrl},
      ${dueAt},
      ${metadataJson}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      kind = EXCLUDED.kind,
      area = EXCLUDED.area,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      status = EXCLUDED.status,
      priority = EXCLUDED.priority,
      tags = EXCLUDED.tags,
      source = EXCLUDED.source,
      source_url = EXCLUDED.source_url,
      due_at = EXCLUDED.due_at,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    WHERE LOWER(illco_brain_items.owner_email) = LOWER(EXCLUDED.owner_email)
  `;
}

export async function seedBrain(ownerEmail: string) {
  await ensureBrainSchema();
  for (const item of publicBrainSeed) {
    await upsertBrainItem(ownerEmail, item, { deterministic: true });
  }
}

export async function listBrainItems(ownerEmail: string) {
  await ensureBrainSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      owner_email,
      kind,
      area,
      title,
      summary,
      status,
      priority,
      tags,
      source,
      source_url,
      due_at::text AS due_at,
      metadata,
      created_at::text AS created_at,
      updated_at::text AS updated_at
    FROM illco_brain_items
    WHERE LOWER(owner_email) = LOWER(${normalizeEmail(ownerEmail)})
    ORDER BY
      CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      CASE status WHEN 'next' THEN 1 WHEN 'blocked' THEN 2 WHEN 'active' THEN 3 WHEN 'waiting' THEN 4 WHEN 'done' THEN 5 ELSE 6 END,
      updated_at DESC
  `) as BrainRow[];

  return rows.map(rowToItem);
}

export async function getBrainSnapshot(ownerEmail: string): Promise<BrainSnapshot> {
  await seedBrain(ownerEmail);
  const items = await listBrainItems(ownerEmail);
  const sourceMap = new Map<string, number>();
  for (const item of items) sourceMap.set(item.source, (sourceMap.get(item.source) || 0) + 1);

  const sources = [
    {
      name: "GitHub",
      state: "connected" as const,
      detail: "51 repositories inventoried in the initial connected scan",
      itemCount: 51,
    },
    {
      name: "Google Drive",
      state: "connected" as const,
      detail: "Business, product, SEO, build, and media files sampled",
      itemCount: 25,
    },
    {
      name: "ChatGPT memory",
      state: "seeded" as const,
      detail: "Projects, brands, routines, products, and decisions loaded",
      itemCount: [...sourceMap.entries()].filter(([name]) => /chatgpt|project history|memory/i.test(name)).reduce((sum, [, count]) => sum + count, 0),
    },
    {
      name: "Private import",
      state: "ready" as const,
      detail: "JSON imports are stored privately under the signed-in admin account",
      itemCount: sourceMap.get("Private memory import") || 0,
    },
  ];

  return {
    items,
    total: items.length,
    active: items.filter((item) => item.status === "active").length,
    next: items.filter((item) => item.status === "next").length,
    blocked: items.filter((item) => item.status === "blocked").length,
    done: items.filter((item) => item.status === "done").length,
    areas: new Set(items.map((item) => item.area)).size,
    sources,
  };
}

export async function createBrainItem(ownerEmail: string, input: BrainImportItem) {
  await ensureBrainSchema();
  if (!normalizeText(input.title)) throw new Error("A title is required.");
  await upsertBrainItem(ownerEmail, { ...input, id: randomUUID(), source: input.source || "manual" });
}

export async function updateBrainItemStatus(ownerEmail: string, itemId: string, status: BrainStatus) {
  await ensureBrainSchema();
  const sql = getSql();
  await sql`
    UPDATE illco_brain_items
    SET status = ${validStatus(status)}, updated_at = NOW()
    WHERE id = ${normalizeText(itemId)} AND LOWER(owner_email) = LOWER(${normalizeEmail(ownerEmail)})
  `;
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
      {
        ...item,
        source: normalizeText(item.source, "Private memory import") || "Private memory import",
      },
      { deterministic: Boolean(item.id) },
    );
    imported += 1;
  }
  return imported;
}
