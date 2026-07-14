import "@/lib/server-only";

import { listBrainEvents, listBrainItems, listBrainLinks, seedBrain } from "@/lib/brain-store";
import type { BrainBrief, BrainItem, BrainSnapshot } from "@/lib/brain-types";

const DAY_MS = 86_400_000;

function isOpen(item: BrainItem) {
  return !["done", "archived"].includes(item.status);
}

function focusScore(item: BrainItem, now: number) {
  if (!isOpen(item)) return -1000;
  let score = 0;
  if (item.pinned) score += 14;
  if (item.status === "blocked") score += 12;
  if (item.status === "next") score += 9;
  if (item.priority === "critical") score += 11;
  if (item.priority === "high") score += 6;
  if (item.nextAction) score += 3;
  if (item.dueAt) {
    const due = Date.parse(item.dueAt);
    if (Number.isFinite(due) && due < now) score += 14;
    else if (Number.isFinite(due) && due - now <= 7 * DAY_MS) score += 8;
  }
  score += Math.max(0, (100 - item.progress) / 25);
  return score;
}

function buildBrief(items: BrainItem[]): BrainBrief {
  const now = Date.now();
  const openItems = items.filter(isOpen);
  const overdue = openItems.filter((item) => item.dueAt && Date.parse(item.dueAt) < now);
  const dueSoon = openItems.filter((item) => {
    if (!item.dueAt) return false;
    const due = Date.parse(item.dueAt);
    return due >= now && due - now <= 7 * DAY_MS;
  });
  const stale = openItems.filter((item) => Date.parse(item.updatedAt) < now - 14 * DAY_MS);
  const recentlyUpdated = [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 8);
  const completed = items.filter((item) => item.status === "done").length;

  return {
    focusIds: [...openItems].sort((a, b) => focusScore(b, now) - focusScore(a, now)).slice(0, 8).map((item) => item.id),
    overdueIds: overdue.map((item) => item.id),
    dueSoonIds: dueSoon.map((item) => item.id),
    staleIds: stale.map((item) => item.id),
    recentlyUpdatedIds: recentlyUpdated.map((item) => item.id),
    completionRate: items.length ? Math.round((completed / items.length) * 100) : 0,
  };
}

export function assembleBrainSnapshot(
  items: BrainItem[],
  links: BrainSnapshot["links"] = [],
  events: BrainSnapshot["events"] = [],
): BrainSnapshot {
  const brief = buildBrief(items);
  const sourceMap = new Map<string, number>();
  for (const item of items) sourceMap.set(item.source, (sourceMap.get(item.source) || 0) + 1);

  const connectedIds = new Set(links.flatMap((link) => [link.fromItemId, link.toItemId]));
  const openCount = items.filter(isOpen).length;
  const blocked = items.filter((item) => item.status === "blocked").length;
  const connectionCoverage = items.length ? connectedIds.size / items.length : 0;
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        82 +
          brief.completionRate * 0.12 +
          connectionCoverage * 12 -
          blocked * 3 -
          brief.overdueIds.length * 5 -
          Math.min(12, brief.staleIds.length) * 1.2,
      ),
    ),
  );

  return {
    items,
    links,
    events,
    brief,
    total: items.length,
    active: items.filter((item) => item.status === "active").length,
    next: items.filter((item) => item.status === "next").length,
    blocked,
    done: items.filter((item) => item.status === "done").length,
    overdue: brief.overdueIds.length,
    dueSoon: brief.dueSoonIds.length,
    stale: brief.staleIds.length,
    areas: new Set(items.map((item) => item.area)).size,
    connectedItems: connectedIds.size,
    healthScore: openCount ? healthScore : 100,
    sources: [
      { name: "GitHub", state: "connected", detail: "Repository inventory and source links are available", itemCount: sourceMap.get("GitHub") || 0 },
      { name: "Google Drive", state: "connected", detail: "Business, product, SEO, build, and media knowledge", itemCount: sourceMap.get("Google Drive") || 0 },
      {
        name: "ChatGPT memory",
        state: "seeded",
        detail: "Projects, brands, routines, products, and operating decisions",
        itemCount: [...sourceMap.entries()].filter(([name]) => /chatgpt|project history|memory/i.test(name)).reduce((sum, [, count]) => sum + count, 0),
      },
      {
        name: "Private import",
        state: "ready",
        detail: "Private JSON records remain scoped to the authenticated admin",
        itemCount: sourceMap.get("Private memory import") || 0,
      },
    ],
  };
}

export async function getSafeBrainSnapshot(ownerEmail: string): Promise<BrainSnapshot> {
  let items = await listBrainItems(ownerEmail);
  if (!items.length) {
    await seedBrain(ownerEmail);
    items = await listBrainItems(ownerEmail);
  }

  const [links, events] = await Promise.all([listBrainLinks(ownerEmail), listBrainEvents(ownerEmail, 100)]);
  return assembleBrainSnapshot(items, links, events);
}
