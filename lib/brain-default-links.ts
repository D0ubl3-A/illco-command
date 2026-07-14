import "@/lib/server-only";

import { createBrainLink } from "@/lib/brain-store";
import type { BrainItem, BrainRelationType } from "@/lib/brain-types";

type LinkSeed = {
  from: string;
  to: string;
  relationType: BrainRelationType;
  note: string;
  strength: number;
};

const defaultLinks: LinkSeed[] = [
  {
    from: "iLLCo Command",
    to: "Lyric Video Forge",
    relationType: "supports",
    note: "ILLCO Command hosts and distributes the creator tool.",
    strength: 5,
  },
  {
    from: "iLLCo Command",
    to: "AI Record Label Operating Platform",
    relationType: "supports",
    note: "The command center is the shared operating layer for the label platform.",
    strength: 4,
  },
  {
    from: "Agent swarm delivery model",
    to: "Viral Stitch AI",
    relationType: "supports",
    note: "Specialized agents divide research, editing, QA, and publishing work.",
    strength: 5,
  },
  {
    from: "Orchestration beats one long generation",
    to: "Viral Stitch AI",
    relationType: "supports",
    note: "Viral Stitch depends on controlled scenes, continuity, and staged assembly.",
    strength: 5,
  },
  {
    from: "M3ntally-iLL",
    to: "God's Hitman",
    relationType: "produces",
    note: "God's Hitman is an active M3ntally-iLL release concept.",
    strength: 5,
  },
  {
    from: "M3ntally-iLL",
    to: "Dying Soul animated video",
    relationType: "produces",
    note: "The animated video belongs to the M3ntally-iLL music catalog.",
    strength: 5,
  },
  {
    from: "Professional AI Music Mastering",
    to: "M3ntally-iLL",
    relationType: "supports",
    note: "The mastering workflow supports release-ready music output.",
    strength: 4,
  },
  {
    from: "Every production starts with one project ID",
    to: "Faceless YouTube Channel Machine",
    relationType: "supports",
    note: "Each channel production should preserve provenance under one project identity.",
    strength: 4,
  },
  {
    from: "Clean duplicate blog URLs",
    to: "LinkedIn authority engine",
    relationType: "supports",
    note: "SEO cleanup protects the canonical content system that social authority points toward.",
    strength: 3,
  },
  {
    from: "Import private memory pack",
    to: "iLLCo Command",
    relationType: "belongs_to",
    note: "Private memory import is an activation step inside Brain OS.",
    strength: 5,
  },
];

function byTitle(items: BrainItem[], title: string) {
  return items.find((item) => item.title.toLowerCase() === title.toLowerCase()) || null;
}

export async function seedDefaultBrainLinks(ownerEmail: string, items: BrainItem[]) {
  let created = 0;
  for (const seed of defaultLinks) {
    const from = byTitle(items, seed.from);
    const to = byTitle(items, seed.to);
    if (!from || !to) continue;
    await createBrainLink(ownerEmail, {
      fromItemId: from.id,
      toItemId: to.id,
      relationType: seed.relationType,
      note: seed.note,
      strength: seed.strength,
    });
    created += 1;
  }
  return created;
}
