"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getServiceOrder,
  serviceOrderPriorities,
  serviceOrderProofStatuses,
  serviceOrderStatuses,
  updateServiceOrder,
  type ServiceOrderPriority,
  type ServiceOrderProofStatus,
  type ServiceOrderStatus,
} from "@/lib/service-orders";
import { isAdminAuthenticated } from "../auth";

function text(formData: FormData, name: string, maxLength = 1200) {
  return String(formData.get(name) || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function validStatus(value: string): ServiceOrderStatus {
  return serviceOrderStatuses.includes(value as ServiceOrderStatus) ? (value as ServiceOrderStatus) : "onboarding";
}

function validPriority(value: string): ServiceOrderPriority {
  return serviceOrderPriorities.includes(value as ServiceOrderPriority) ? (value as ServiceOrderPriority) : "standard";
}

function validProofStatus(value: string): ServiceOrderProofStatus {
  return serviceOrderProofStatuses.includes(value as ServiceOrderProofStatus) ? (value as ServiceOrderProofStatus) : "pending";
}

function normalizedDueAt(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function updateServiceOrderAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) redirect("/admin");

  const orderId = text(formData, "orderId", 80);
  const existing = await getServiceOrder(orderId);
  if (!existing) redirect("/admin/orders?state=missing");

  const doneSteps = new Set(formData.getAll("doneStep").map((value) => String(value)));
  const checklist = existing.checklist.map((item) => ({ ...item, done: doneSteps.has(item.id) }));

  await updateServiceOrder(orderId, {
    status: validStatus(text(formData, "status", 40)),
    priority: validPriority(text(formData, "priority", 40)),
    ownerEmail: text(formData, "ownerEmail", 180),
    dueAt: normalizedDueAt(text(formData, "dueAt", 80)),
    proofStatus: validProofStatus(text(formData, "proofStatus", 40)),
    proofUrl: text(formData, "proofUrl", 500),
    checklist,
    metrics: {
      responseTime: text(formData, "responseTime", 120),
      recoveredLeads: text(formData, "recoveredLeads", 120),
      appointmentsBooked: text(formData, "appointmentsBooked", 120),
      showRate: text(formData, "showRate", 120),
      estimatedRevenue: text(formData, "estimatedRevenue", 120),
      viewsBefore: text(formData, "viewsBefore", 120),
      viewsAfter: text(formData, "viewsAfter", 120),
      clickThroughRateBefore: text(formData, "clickThroughRateBefore", 120),
      clickThroughRateAfter: text(formData, "clickThroughRateAfter", 120),
      averageViewDurationBefore: text(formData, "averageViewDurationBefore", 120),
      averageViewDurationAfter: text(formData, "averageViewDurationAfter", 120),
      notes: text(formData, "metricsNotes", 1200),
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/delivery/${orderId}`);
  redirect(`/admin/orders?state=saved#${encodeURIComponent(orderId)}`);
}
