import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export type ShaylaFeedbackItem = {
  id: string;
  productId: string;
  message: string;
  agentReply: string;
  actionItems: string[];
  status: "new" | "reviewed";
  createdAt: string;
};

type ShaylaFeedbackStore = {
  items: ShaylaFeedbackItem[];
};

function feedbackPath() {
  if (process.env.VERCEL) return join(tmpdir(), "illco-shayla-feedback.json");
  return join(process.cwd(), "data", "shayla-feedback.json");
}

function readStore(): ShaylaFeedbackStore {
  const path = feedbackPath();
  if (!existsSync(path)) return { items: [] };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<ShaylaFeedbackStore>;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

function writeStore(store: ShaylaFeedbackStore) {
  const path = feedbackPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2));
}

export function listShaylaFeedback(limit = 20) {
  return readStore().items
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function addShaylaFeedback(input: {
  productId: string;
  message: string;
  agentReply: string;
  actionItems: string[];
}) {
  const store = readStore();
  const item: ShaylaFeedbackItem = {
    id: `shayla-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    productId: input.productId,
    message: input.message,
    agentReply: input.agentReply,
    actionItems: input.actionItems,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  store.items.unshift(item);
  store.items = store.items.slice(0, 100);
  writeStore(store);
  return item;
}

export function getShaylaFeedbackSnapshot() {
  const items = listShaylaFeedback(10);
  return {
    count: items.length,
    newest: items[0] || null,
    items,
    pendingActionItems: items.flatMap((item) =>
      item.actionItems.map((action) => ({
        feedbackId: item.id,
        productId: item.productId,
        action,
        createdAt: item.createdAt,
      })),
    ),
  };
}
