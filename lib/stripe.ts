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

function getCheckoutTrialDays(input: { productId?: string | null }) {
  if (input.productId === "lyric-video-forge") return 1;
  return getGlobalFreeTrialDays();
}

function getCheckoutVideoLimit(input: { productId?: string | null }) {
  return input.productId === "lyric-video-forge" ? 2 : null;
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
  const trialDays = getCheckoutTrialDays(input);
  const videoLimit = getCheckoutVideoLimit(input);

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
      trialDays: String(trialDays || 0),
      videoLimit: videoLimit ? String(videoLimit) : "",
    },
    subscription_data: {
      trial_period_days: trialDays || undefined,
      metadata: {
        planId: input.planId,
        productId: input.productId || "illco-command",
        trialDays: String(trialDays || 0),
        videoLimit: videoLimit ? String(videoLimit) : "",
      },
    },
  });

  return {
    id: session.id,
    url: requireEnv(session.url || "", "Stripe checkout session url"),
  };
}

export async function createOneTimeCheckoutSession(input: {
  email?: string | null;
  productId: string;
  productName: string;
  description: string;
  amountCents: number;
  returnPath?: string | null;
  cancelPath?: string | null;
  metadata?: Record<string, string>;
}) {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 50 || input.amountCents > 10_000_000) {
    throw new Error("A valid one-time checkout amount is required.");
  }

  const stripe = getStripeClient();
  const metadata = {
    planId: "core",
    productId: input.productId,
    purchaseType: "one-time-service",
    amountCents: String(input.amountCents),
    ...input.metadata,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_email: input.email || undefined,
    customer_creation: "always",
    client_reference_id: input.productId,
    success_url: buildSuccessUrl({ returnPath: input.returnPath, productId: input.productId }),
    cancel_url: absoluteUrl(input.cancelPath || env.stripeCancelPath),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amountCents,
          product_data: {
            name: input.productName,
            description: input.description,
          },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
  });

  return {
    id: session.id,
    url: requireEnv(session.url || "", "Stripe checkout session url"),
  };
}

export async function createSetupPlusSubscriptionCheckoutSession(input: {
  email?: string | null;
  productId: string;
  setupName: string;
  setupDescription: string;
  setupAmountCents: number;
  recurringName: string;
  recurringDescription: string;
  recurringAmountCents: number;
  returnPath?: string | null;
  cancelPath?: string | null;
  metadata?: Record<string, string>;
}) {
  for (const [label, value] of [
    ["setup", input.setupAmountCents],
    ["recurring", input.recurringAmountCents],
  ] as const) {
    if (!Number.isInteger(value) || value < 50 || value > 10_000_000) {
      throw new Error(`A valid ${label} checkout amount is required.`);
    }
  }

  const stripe = getStripeClient();
  const metadata = {
    planId: "suite",
    productId: input.productId,
    purchaseType: "setup-plus-subscription",
    setupAmountCents: String(input.setupAmountCents),
    recurringAmountCents: String(input.recurringAmountCents),
    ...input.metadata,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_email: input.email || undefined,
    client_reference_id: input.productId,
    success_url: buildSuccessUrl({ returnPath: input.returnPath, productId: input.productId }),
    cancel_url: absoluteUrl(input.cancelPath || env.stripeCancelPath),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.setupAmountCents,
          product_data: {
            name: input.setupName,
            description: input.setupDescription,
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.recurringAmountCents,
          recurring: { interval: "month" },
          product_data: {
            name: input.recurringName,
            description: input.recurringDescription,
          },
        },
      },
    ],
    metadata,
    subscription_data: { metadata },
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

export async function retrieveStripeSubscription(subscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function retrieveReferralConnectedAccount(accountId: string) {
  const stripe = getStripeClient();
  return stripe.accounts.retrieve(accountId);
}

export async function createReferralTransfer(input: {
  accountId: string;
  amountCents: number;
  currency: string;
  metadata?: Stripe.MetadataParam;
}) {
  const stripe = getStripeClient();
  return stripe.transfers.create({
    amount: input.amountCents,
    currency: input.currency,
    destination: input.accountId,
    metadata: input.metadata,
  });
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
