import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { completeCheckoutSession } from "@/lib/checkout-store";
import { summarizeCheckoutSession } from "@/lib/checkout-success";
import { hasDatabase } from "@/lib/db";
import {
  claimStripeEvent,
  completeStripeEvent,
  enqueueStripeNotification,
  failStripeEvent,
  markStripeNotificationDelivered,
  markStripeNotificationFailed,
} from "@/lib/stripe-event-store";
import { notifyServiceOrderCreated, upsertServiceOrderFromCheckout } from "@/lib/service-orders";
import { constructStripeWebhookEvent } from "@/lib/stripe";

export function requirePurchasePersistence(available = hasDatabase()) {
  if (!available) {
    throw new Error("Purchase persistence is temporarily unavailable; retry this webhook.");
  }
}

async function persistCheckoutEvent(eventId: string, session: Stripe.Checkout.Session) {
  requirePurchasePersistence();

  const summary = summarizeCheckoutSession(session);
  if (!summary.checkoutComplete) return;

  await completeCheckoutSession({
    stripeSessionId: summary.sessionId,
    stripeCustomerId: summary.customerId,
    planId: summary.planId,
    productId: summary.productId,
    email: summary.email,
    status: summary.checkoutStatus,
    rawPayload: session as unknown as Record<string, unknown>,
  });

  const order = await upsertServiceOrderFromCheckout(session);
  const outboxId = await enqueueStripeNotification({
    eventId,
    topic: "service-order.created",
    dedupeKey: `service-order.created:${order.id}`,
    payload: order as unknown as Record<string, unknown>,
  });

  if (!outboxId) throw new Error("Could not persist the service-order notification.");

  try {
    await notifyServiceOrderCreated(order);
    await markStripeNotificationDelivered(outboxId);
  } catch (error) {
    await markStripeNotificationFailed(outboxId, error);
    console.error("Service-order notification queued for retry", error);
    throw error;
  }
}

export async function handleStripeWebhook(request: Request) {
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = constructStripeWebhookEvent(payload, request.headers.get("stripe-signature"));
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Invalid Stripe webhook." },
      { status: 400 },
    );
  }

  let claimed = false;
  try {
    const claim = await claimStripeEvent(event);
    if (!claim.acquired) {
      return NextResponse.json({ ok: true, duplicate: true, status: claim.status });
    }
    claimed = true;

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await persistCheckoutEvent(event.id, event.data.object as Stripe.Checkout.Session);
    }

    await completeStripeEvent(event.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (claimed) {
      try {
        await failStripeEvent(event.id, error);
      } catch (ledgerError) {
        console.error("Stripe event failure could not be recorded", ledgerError);
      }
    }
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Stripe webhook processing failed." },
      { status: 500 },
    );
  }
}
