export const brainKinds = [
  "project",
  "task",
  "decision",
  "idea",
  "content",
  "music",
  "product",
  "research",
  "system",
  "memory",
] as const;

export const brainStatuses = ["active", "next", "blocked", "waiting", "done", "archived"] as const;
export const brainPriorities = ["critical", "high", "medium", "low"] as const;

export type BrainKind = (typeof brainKinds)[number];
export type BrainStatus = (typeof brainStatuses)[number];
export type BrainPriority = (typeof brainPriorities)[number];

export type BrainItem = {
  id: string;
  ownerEmail: string;
  kind: BrainKind;
  area: string;
  title: string;
  summary: string;
  status: BrainStatus;
  priority: BrainPriority;
  tags: string[];
  source: string;
  sourceUrl: string | null;
  dueAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BrainSourceSummary = {
  name: string;
  state: "connected" | "seeded" | "ready";
  detail: string;
  itemCount: number;
};

export type BrainSnapshot = {
  items: BrainItem[];
  total: number;
  active: number;
  next: number;
  blocked: number;
  done: number;
  areas: number;
  sources: BrainSourceSummary[];
};

export type BrainImportItem = Partial<
  Pick<
    BrainItem,
    "id" | "kind" | "area" | "title" | "summary" | "status" | "priority" | "tags" | "source" | "sourceUrl" | "dueAt" | "metadata"
  >
>;
