import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { completeCheckoutSession } from "@/lib/checkout-store";
import { summarizeCheckoutSession } from "@/lib/checkout-success";
import { hasDatabase } from "@/lib/db";
import { constructStripeWebhookEvent } from "@/lib/stripe";

async function persistCheckoutEvent(session: Stripe.Checkout.Session) {
  if (!hasDatabase()) return;
  const summary = summarizeCheckoutSession(session);
  await completeCheckoutSession({
    stripeSessionId: summary.sessionId,
    stripeCustomerId: summary.customerId,
    planId: summary.planId,
    productId: summary.productId,
    email: summary.email,
    status: summary.checkoutStatus,
    rawPayload: session as unknown as Record<string, unknown>,
  });
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

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await persistCheckoutEvent(event.data.object as Stripe.Checkout.Session);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Stripe webhook processing failed." },
      { status: 500 },
    );
  }
}
