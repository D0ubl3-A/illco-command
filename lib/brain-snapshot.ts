import "@/lib/server-only";

import { listBrainItems, seedBrain } from "@/lib/brain-store";
import type { BrainSnapshot } from "@/lib/brain-types";

export async function getSafeBrainSnapshot(ownerEmail: string): Promise<BrainSnapshot> {
  let items = await listBrainItems(ownerEmail);
  if (!items.length) {
    await seedBrain(ownerEmail);
    items = await listBrainItems(ownerEmail);
  }

  const sourceMap = new Map<string, number>();
  for (const item of items) sourceMap.set(item.source, (sourceMap.get(item.source) || 0) + 1);

  return {
    items,
    total: items.length,
    active: items.filter((item) => item.status === "active").length,
    next: items.filter((item) => item.status === "next").length,
    blocked: items.filter((item) => item.status === "blocked").length,
    done: items.filter((item) => item.status === "done").length,
    areas: new Set(items.map((item) => item.area)).size,
    sources: [
      { name: "GitHub", state: "connected", detail: "51 repositories inventoried in the initial connected scan", itemCount: 51 },
      { name: "Google Drive", state: "connected", detail: "Business, product, SEO, build, and media files sampled", itemCount: 25 },
      {
        name: "ChatGPT memory",
        state: "seeded",
        detail: "Projects, brands, routines, products, and decisions loaded",
        itemCount: [...sourceMap.entries()].filter(([name]) => /chatgpt|project history|memory/i.test(name)).reduce((sum, [, count]) => sum + count, 0),
      },
      {
        name: "Private import",
        state: "ready",
        detail: "JSON imports are stored privately under the signed-in admin account",
        itemCount: sourceMap.get("Private memory import") || 0,
      },
    ],
  };
}
