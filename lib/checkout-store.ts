import { getSql } from "@/lib/db";
import type { FunnelPlanId } from "@/lib/env";

export type CheckoutSessionRecord = {
  stripeSessionId: string;
  planId: FunnelPlanId;
  productId: string;
  userId?: string | null;
  email?: string | null;
  checkoutUrl?: string | null;
};

export type CheckoutSessionCompletionRecord = {
  stripeSessionId: string;
  stripeCustomerId?: string | null;
  planId: FunnelPlanId;
  productId: string;
  email?: string | null;
  status: string;
  rawPayload: Record<string, unknown>;
};

export async function recordCheckoutSession(input: CheckoutSessionRecord) {
  const sql = getSql();
  const rawPayload = {
    stripeSessionId: input.stripeSessionId,
    planId: input.planId,
    productId: input.productId,
    email: input.email || null,
  };

  const rows = (await sql`
    INSERT INTO illco_command_checkout_sessions (
      stripe_session_id,
      plan_id,
      product_id,
      user_id,
      email,
      checkout_url,
      raw_payload
    )
    VALUES (
      ${input.stripeSessionId},
      ${input.planId},
      ${input.productId},
      ${input.userId || null},
      ${input.email || null},
      ${input.checkoutUrl || null},
      ${JSON.stringify(rawPayload)}::jsonb
    )
    ON CONFLICT (stripe_session_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      product_id = EXCLUDED.product_id,
      user_id = COALESCE(illco_command_checkout_sessions.user_id, EXCLUDED.user_id),
      email = EXCLUDED.email,
      checkout_url = EXCLUDED.checkout_url,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    RETURNING id::text AS id
  `) as Array<{ id: string }>;

  const stored = rows[0];
  if (!stored?.id) {
    throw new Error("Checkout session insert did not return a stored record.");
  }

  return stored;
}

export async function completeCheckoutSession(input: CheckoutSessionCompletionRecord) {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO illco_command_checkout_sessions (
      stripe_session_id,
      stripe_customer_id,
      plan_id,
      product_id,
      email,
      status,
      raw_payload
    )
    VALUES (
      ${input.stripeSessionId},
      ${input.stripeCustomerId || null},
      ${input.planId},
      ${input.productId},
      ${input.email || null},
      ${input.status},
      ${JSON.stringify(input.rawPayload)}::jsonb
    )
    ON CONFLICT (stripe_session_id) DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      plan_id = EXCLUDED.plan_id,
      product_id = EXCLUDED.product_id,
      email = EXCLUDED.email,
      status = EXCLUDED.status,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    RETURNING id::text AS id
  `) as Array<{ id: string }>;

  const stored = rows[0];
  if (!stored?.id) {
    throw new Error("Checkout completion update did not return a stored record.");
  }

  return stored;
}
