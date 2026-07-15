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
export const brainRelationTypes = ["related_to", "depends_on", "supports", "produces", "belongs_to", "blocks"] as const;

export type BrainKind = (typeof brainKinds)[number];
export type BrainStatus = (typeof brainStatuses)[number];
export type BrainPriority = (typeof brainPriorities)[number];
export type BrainRelationType = (typeof brainRelationTypes)[number];

export type BrainItem = {
  id: string;
  ownerEmail: string;
  kind: BrainKind;
  area: string;
  title: string;
  summary: string;
  status: BrainStatus;
  priority: BrainPriority;
  progress?: number;
  nextAction?: string;
  pinned?: boolean;
  reviewAt?: string | null;
  tags: string[];
  source: string;
  sourceUrl: string | null;
  dueAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BrainLink = {
  id: string;
  ownerEmail: string;
  fromItemId: string;
  toItemId: string;
  relationType: BrainRelationType;
  note: string;
  strength: number;
  createdAt: string;
};

export type BrainEvent = {
  id: string;
  ownerEmail: string;
  itemId: string | null;
  eventType: string;
  detail: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BrainBrief = {
  focusIds: string[];
  overdueIds: string[];
  dueSoonIds: string[];
  staleIds: string[];
  recentlyUpdatedIds: string[];
  completionRate: number;
};

export type BrainSourceSummary = {
  name: string;
  state: "connected" | "seeded" | "ready";
  detail: string;
  itemCount: number;
};

export type BrainSnapshot = {
  items: BrainItem[];
  links?: BrainLink[];
  events?: BrainEvent[];
  brief?: BrainBrief;
  total: number;
  active: number;
  next: number;
  blocked: number;
  done: number;
  overdue?: number;
  dueSoon?: number;
  stale?: number;
  areas: number;
  connectedItems?: number;
  healthScore?: number;
  sources: BrainSourceSummary[];
};

type BrainImportBase = Partial<
  Pick<
    BrainItem,
    | "id"
    | "kind"
    | "area"
    | "title"
    | "summary"
    | "status"
    | "priority"
    | "progress"
    | "nextAction"
    | "pinned"
    | "reviewAt"
    | "source"
    | "sourceUrl"
    | "dueAt"
    | "metadata"
  >
>;

export type BrainImportItem = BrainImportBase & { tags?: string[] };

export type BrainCommandResult = {
  message: string;
  itemIds: string[];
  mutation: "none" | "created" | "updated";
  command: string;
};
