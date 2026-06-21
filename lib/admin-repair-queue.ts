import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export type AdminRepairRequest = {
  id: string;
  sectionId: string;
  sectionLabel: string;
  reason: string;
  status: "queued";
  createdAt: string;
  updatedAt: string;
};

type RepairQueueStore = {
  requests: AdminRepairRequest[];
};

function repairQueuePath() {
  if (process.env.VERCEL) return join(tmpdir(), "illco-admin-repair-queue.json");
  return join(process.cwd(), "data", "admin-repair-queue.json");
}

function readStore(): RepairQueueStore {
  const path = repairQueuePath();
  if (!existsSync(path)) return { requests: [] };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<RepairQueueStore>;
    return { requests: Array.isArray(parsed.requests) ? parsed.requests : [] };
  } catch {
    return { requests: [] };
  }
}

function writeStore(store: RepairQueueStore) {
  const path = repairQueuePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2));
}

export function listAdminRepairRequests(limit = 40) {
  return readStore().requests
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export function addAdminRepairRequest(input: {
  sectionId: string;
  sectionLabel: string;
  reason: string;
}) {
  const now = new Date().toISOString();
  const request: AdminRepairRequest = {
    id: `repair-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sectionId: input.sectionId,
    sectionLabel: input.sectionLabel,
    reason: input.reason,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
  const store = readStore();
  store.requests.unshift(request);
  store.requests = store.requests.slice(0, 120);
  writeStore(store);
  return request;
}

export function getAdminRepairQueueSnapshot() {
  const requests = listAdminRepairRequests();
  return {
    count: requests.length,
    queued: requests.filter((request) => request.status === "queued").length,
    requests,
  };
}
