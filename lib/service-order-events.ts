import "@/lib/server-only";

import { env } from "@/lib/env";
import { buildDeliveryHref, type ServiceOrder } from "@/lib/service-orders";

export type ServiceOrderEventType =
  | "order-created"
  | "order-updated"
  | "order-delivered"
  | "order-live"
  | "proof-received";

export async function sendServiceOrderEvent(order: ServiceOrder, eventType: ServiceOrderEventType) {
  const webhookUrl = env.fulfillmentNotificationWebhookUrl;
  if (!webhookUrl) return { delivered: false, reason: "not-configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.leadWebhookSecret ? { Authorization: `Bearer ${env.leadWebhookSecret}` } : {}),
      },
      body: JSON.stringify({
        event: `illco.fulfillment.${eventType.replaceAll("-", "_")}`,
        adminEmails: env.leadAdminEmails,
        customer: {
          name: order.customerName,
          email: order.customerEmail,
          company: order.customerCompany,
        },
        order: {
          id: order.id,
          productName: order.productName,
          offerId: order.offerId,
          status: order.status,
          priority: order.priority,
          ownerEmail: order.ownerEmail,
          amountSummary: order.amountSummary,
          paymentStatus: order.paymentStatus,
          dueAt: order.dueAt,
          proofStatus: order.proofStatus,
          deliveryUrl: buildDeliveryHref(order),
          adminUrl: new URL(`/admin/orders#${encodeURIComponent(order.id)}`, env.appBaseUrl).toString(),
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Fulfillment event failed with ${response.status}.`);
    return { delivered: true, reason: "sent" };
  } finally {
    clearTimeout(timeout);
  }
}
