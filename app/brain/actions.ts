"use server";

import { revalidatePath } from "next/cache";

import { isTrustedAdminEmail } from "@/lib/admin-identities";
import { createBrainItem, importBrainItems, updateBrainItemStatus } from "@/lib/brain-store";
import { brainStatuses, type BrainKind, type BrainPriority, type BrainStatus } from "@/lib/brain-types";
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

export async function createBrainItemAction(formData: FormData) {
  const user = await requireBrainAdmin();
  await createBrainItem(user.email, {
    kind: formValue(formData, "kind") as BrainKind,
    area: formValue(formData, "area"),
    title: formValue(formData, "title"),
    summary: formValue(formData, "summary"),
    status: (formValue(formData, "status") || "next") as BrainStatus,
    priority: (formValue(formData, "priority") || "medium") as BrainPriority,
    tags: formValue(formData, "tags").split(/[,|]/).map((tag) => tag.trim()).filter(Boolean),
    source: "manual",
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

export async function importBrainItemsAction(formData: FormData) {
  const user = await requireBrainAdmin();
  const rawJson = formValue(formData, "brainJson");
  if (!rawJson) throw new Error("Paste or upload a Brain OS JSON export first.");
  const parsed = JSON.parse(rawJson) as unknown;
  await importBrainItems(user.email, parsed);
  revalidatePath("/brain");
}
