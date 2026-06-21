import Stripe from "stripe";

import { env, type FunnelPlanId, getGlobalFreeTrialDays, getStripePriceIdForPlan, requireEnv } from "@/lib/env";

let cachedStripeClient: Stripe | null = null;
let cachedStripeSecretKey = "";

function isProductionDeployment() {
  const explicitEnv = String(process.env.VERCEL_ENV || "").toLowerCase();
  return explicitEnv === "production" || process.env.NODE_ENV === "production";
}

function assertStripeSecretKeyEnvironment(secretKey: string) {
  const isLive = secretKey.startsWith("sk_live_");
  const isTest = secretKey.startsWith("sk_test_");

  if (!isLive && !isTest) {
    throw new Error("Invalid STRIPE_SECRET_KEY format. Use a live or test Stripe secret key.");
  }

  if (isProductionDeployment() && !isLive) {
    throw new Error("Production checkout is configured with a test Stripe secret key. Replace STRIPE_SECRET_KEY with your live sk_live_ key.");
  }
}

function getStripeClient() {
  const stripeSecretKey = requireEnv(env.stripeSecretKey, "STRIPE_SECRET_KEY");
  assertStripeSecretKeyEnvironment(stripeSecretKey);

  if (!cachedStripeClient || cachedStripeSecretKey !== stripeSecretKey) {
    cachedStripeSecretKey = stripeSecretKey;
    cachedStripeClient = new Stripe(stripeSecretKey);
  }
  return cachedStripeClient;
}

function absoluteUrl(path: string) {
  return new URL(path, env.appBaseUrl).toString();
}

function buildSuccessUrl(input: { returnPath?: string | null; productId?: string | null }) {
  const url = new URL(input.returnPath || env.stripeSuccessPath, env.appBaseUrl);
  if (!url.searchParams.has("checkout")) {
    url.searchParams.set("checkout", "success");
  }
  if (!url.searchParams.has("session_id")) {
    url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  }
  if (input.productId && !url.searchParams.has("productId")) {
    url.searchParams.set("productId", input.productId);
  }
  return url.toString();
}

export async function createCheckoutSession(input: {
  email?: string | null;
  planId: FunnelPlanId;
  productId?: string | null;
  returnPath?: string | null;
}) {
  const stripePriceId = requireEnv(getStripePriceIdForPlan(input.planId), `STRIPE_PRICE_${input.planId.toUpperCase()}_ID`);
  const stripe = getStripeClient();
  const trialDays = getGlobalFreeTrialDays();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_email: input.email || undefined,
    client_reference_id: input.productId || "illco-command",
    success_url: buildSuccessUrl(input),
    cancel_url: absoluteUrl(env.stripeCancelPath),
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      planId: input.planId,
      productId: input.productId || "illco-command",
    },
    subscription_data: {
      trial_period_days: trialDays || undefined,
      metadata: {
        planId: input.planId,
        productId: input.productId || "illco-command",
        trialDays: String(trialDays || 0),
      },
    },
  });

  return {
    id: session.id,
    url: requireEnv(session.url || "", "Stripe checkout session url"),
  };
}

export async function retrieveCheckoutSession(sessionId: string) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
}

export async function createPortalSession(input: { stripeCustomerId: string; returnPath?: string | null }) {
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: absoluteUrl(input.returnPath || "/account"),
  });

  return {
    id: session.id,
    url: requireEnv(session.url || "", "Stripe billing portal url"),
  };
}

export function constructStripeWebhookEvent(payload: string, signatureHeader: string | null) {
  const stripeWebhookSecret = requireEnv(env.stripeWebhookSecret, "STRIPE_WEBHOOK_SECRET");
  if (!signatureHeader) {
    throw new Error("Missing Stripe-Signature header.");
  }

  return getStripeClient().webhooks.constructEvent(payload, signatureHeader, stripeWebhookSecret);
}

export type StripeCheckoutSession = Stripe.Checkout.Session;
