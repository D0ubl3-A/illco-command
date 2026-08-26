import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";

import { getStripeEventObjectId, requireStripeEventStore } from "../lib/stripe-event-store";

function stripeEvent(object: Record<string, unknown>) {
  return {
    id: "evt_integrity_test",
    type: "checkout.session.completed",
    livemode: false,
    api_version: "2026-07-29.basil",
    data: { object },
  } as unknown as Stripe.Event;
}

test("Stripe event ledger keys object references without trusting metadata", () => {
  assert.equal(getStripeEventObjectId(stripeEvent({ id: "cs_test_123" })), "cs_test_123");
  assert.equal(getStripeEventObjectId(stripeEvent({ id: 123 })), null);
  assert.equal(getStripeEventObjectId(stripeEvent({})), null);
});

test("Stripe event processing fails closed when durable persistence is unavailable", () => {
  assert.throws(
    () => requireStripeEventStore(false),
    /Stripe event persistence is temporarily unavailable/,
  );
  assert.doesNotThrow(() => requireStripeEventStore(true));
});
