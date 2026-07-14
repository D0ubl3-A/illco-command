"use server";

import { revalidatePath } from "next/cache";

import { isTrustedAdminEmail } from "@/lib/admin-identities";
import {
  createBrainItem,
  createBrainLink,
  importBrainItems,
  setBrainItemPinned,
  updateBrainItem,
  updateBrainItemStatus,
} from "@/lib/brain-store";
import {
  brainRelationTypes,
  brainStatuses,
  type BrainKind,
  type BrainPriority,
  type BrainRelationType,
  type BrainStatus,
} from "@/lib/brain-types";
import { getCurrentUser } from "@/lib/user-accounts";

async function requireBrainAdmin() {
  const user = await getCurrentUser();
  if (!user || !isTrustedAdminEmail(user.email)) {
    throw new Error("Brain OS requires an authenticated ILLCO admin account.");
  }
  return user;
}

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function formTags(formData: FormData, key = "tags") {
  return formValue(formData, key).split(/[,|]/).map((tag) => tag.trim()).filter(Boolean);
}

function formBoolean(formData: FormData, key: string) {
  return ["true", "1", "yes", "on"].includes(formValue(formData, key).toLowerCase());
}

export async function createBrainItemAction(formData: FormData) {
  const user = await requireBrainAdmin();
  await createBrainItem(user.email, {
    kind: formValue(formData, "kind") as BrainKind,
    area: formValue(formData, "area"),
    title: formValue(formData, "title"),
    summary: formValue(formData, "summary"),
    status: (formValue(formData, "status") || "next") as BrainStatus,
    priority: (formValue(formData, "priority") || "medium") as BrainPriority,
    progress: Number(formValue(formData, "progress") || 0),
    nextAction: formValue(formData, "nextAction"),
    pinned: formBoolean(formData, "pinned"),
    reviewAt: formValue(formData, "reviewAt") || null,
    tags: formTags(formData),
    source: "manual",
    sourceUrl: formValue(formData, "sourceUrl") || null,
    dueAt: formValue(formData, "dueAt") || null,
  });
  revalidatePath("/brain");
}

export async function updateBrainItemAction(formData: FormData) {
  const user = await requireBrainAdmin();
  const id = formValue(formData, "id");
  if (!id) throw new Error("Memory ID is required.");
  await updateBrainItem(user.email, id, {
    kind: formValue(formData, "kind") as BrainKind,
    area: formValue(formData, "area"),
    title: formValue(formData, "title"),
    summary: formValue(formData, "summary"),
    status: formValue(formData, "status") as BrainStatus,
    priority: formValue(formData, "priority") as BrainPriority,
    progress: Number(formValue(formData, "progress") || 0),
    nextAction: formValue(formData, "nextAction"),
    pinned: formBoolean(formData, "pinned"),
    reviewAt: formValue(formData, "reviewAt") || null,
    tags: formTags(formData),
    sourceUrl: formValue(formData, "sourceUrl") || null,
    dueAt: formValue(formData, "dueAt") || null,
  });
  revalidatePath("/brain");
}

export async function updateBrainItemStatusAction(formData: FormData) {
  const user = await requireBrainAdmin();
  const id = formValue(formData, "id");
  const status = formValue(formData, "status") as BrainStatus;
  if (!id || !brainStatuses.includes(status)) throw new Error("Invalid Brain OS status update.");
  await updateBrainItemStatus(user.email, id, status);
  revalidatePath("/brain");
}

export async function toggleBrainPinAction(formData: FormData) {
  const user = await requireBrainAdmin();
  const id = formValue(formData, "id");
  if (!id) throw new Error("Memory ID is required.");
  await setBrainItemPinned(user.email, id, formBoolean(formData, "pinned"));
  revalidatePath("/brain");
}

export async function createBrainLinkAction(formData: FormData) {
  const user = await requireBrainAdmin();
  const relationType = formValue(formData, "relationType") as BrainRelationType;
  if (!brainRelationTypes.includes(relationType)) throw new Error("Invalid relationship type.");
  await createBrainLink(user.email, {
    fromItemId: formValue(formData, "fromItemId"),
    toItemId: formValue(formData, "toItemId"),
    relationType,
    note: formValue(formData, "note"),
    strength: Number(formValue(formData, "strength") || 3),
  });
  revalidatePath("/brain");
}

export async function importBrainItemsAction(formData: FormData) {
  const user = await requireBrainAdmin();
  const rawJson = formValue(formData, "brainJson");
  if (!rawJson) throw new Error("Paste or upload a Brain OS JSON export first.");
  const parsed = JSON.parse(rawJson) as unknown;
  await importBrainItems(user.email, parsed);
  revalidatePath("/brain");
}
