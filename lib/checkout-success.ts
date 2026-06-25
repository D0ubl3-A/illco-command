import crypto from "node:crypto";

import { completeCheckoutSession } from "@/lib/checkout-store";
import { isCommandPaymentUnlockProduct } from "@/lib/command-payment-products";
import { hasDatabase } from "@/lib/db";
import { getProductById } from "@/lib/deployments";
import { env, requireEnv, type FunnelPlanId } from "@/lib/env";
import { issueSignedLicense } from "@/lib/license";
import { getMonetizationPlan } from "@/lib/monetization";
import { getProductModuleHref } from "@/lib/product-routes";
import { retrieveCheckoutSession, type StripeCheckoutSession } from "@/lib/stripe";

type CheckoutAccessGrantPayload = {
  sessionId: string;
  customerId: string;
  productId: string;
  planId: FunnelPlanId;
  email: string | null;
  exp: number;
};

function base64Url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function signGrantPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function getCheckoutSessionSecret() {
  return requireEnv(env.checkoutSessionSecret, "CHECKOUT_SESSION_SECRET");
}

function toIsoFromUnix(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function normalizePlanId(value: string | null | undefined): FunnelPlanId {
  if (value === "studio" || value === "suite" || value === "agency" || value === "enterprise") return value;
  return "core";
}

function getCustomerId(session: StripeCheckoutSession) {
  return typeof session.customer === "string" ? session.customer : session.customer?.id || null;
}

function getCustomerEmail(session: StripeCheckoutSession) {
  if (session.customer_details?.email) return session.customer_details.email.toLowerCase();
  if (typeof session.customer !== "string" && session.customer && !("deleted" in session.customer) && session.customer.email) {
    return session.customer.email.toLowerCase();
  }
  return null;
}

export function summarizeCheckoutSession(session: StripeCheckoutSession, fallbackProductId?: string | null) {
  const productId = String(
    session.metadata?.productId ||
      session.client_reference_id ||
      fallbackProductId ||
      "illco-command",
  ).trim();
  const planId = normalizePlanId(session.metadata?.planId);
  const product = getProductById(productId);
  const monetization = product ? getMonetizationPlan(productId) : null;
  const customerId = getCustomerId(session);
  const email = getCustomerEmail(session);
  const checkoutStatus = session.status || "open";
  const launchHref = product ? getProductModuleHref(product.id) : "/";

  return {
    sessionId: session.id,
    customerId,
    email,
    productId,
    planId,
    product,
    monetization,
    productName: product?.displayName || "ILLCO Command",
    checkoutStatus,
    paymentStatus: session.payment_status || "unpaid",
    checkoutComplete: checkoutStatus === "complete" || session.payment_status === "paid",
    launchHref,
    createdAtIso: toIsoFromUnix(session.created),
  };
}

async function persistCheckoutSummary(session: StripeCheckoutSession, fallbackProductId?: string | null) {
  if (!hasDatabase()) return;

  const summary = summarizeCheckoutSession(session, fallbackProductId);
  await completeCheckoutSession({
    stripeSessionId: session.id,
    stripeCustomerId: summary.customerId,
    planId: summary.planId,
    productId: summary.productId,
    email: summary.email,
    status: summary.checkoutStatus,
    rawPayload: session as unknown as Record<string, unknown>,
  });
}

export function createCheckoutAccessGrant(input: Omit<CheckoutAccessGrantPayload, "exp"> & { expiresInSeconds?: number }) {
  const payload: CheckoutAccessGrantPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + Math.max(300, input.expiresInSeconds || 7 * 24 * 60 * 60),
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = signGrantPayload(encodedPayload, getCheckoutSessionSecret());
  return `ILLCOGRANT.${encodedPayload}.${signature}`;
}

export function verifyCheckoutAccessGrant(token: string | null | undefined, expectedSessionId?: string) {
  const raw = String(token || "").trim();
  if (!raw.startsWith("ILLCOGRANT.")) {
    throw new Error("A valid checkout access grant is required.");
  }

  const [, payload, signature] = raw.split(".");
  if (!payload || !signature) {
    throw new Error("Checkout access grant is malformed.");
  }

  const expectedSignature = signGrantPayload(payload, getCheckoutSessionSecret());
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error("Checkout access grant signature is invalid.");
  }

  let decoded: CheckoutAccessGrantPayload;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CheckoutAccessGrantPayload;
  } catch {
    throw new Error("Checkout access grant payload is invalid.");
  }

  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Checkout access grant is expired.");
  }
  if (expectedSessionId && decoded.sessionId !== expectedSessionId) {
    throw new Error("Checkout access grant does not match this session.");
  }

  return decoded;
}

export async function hydrateCheckoutSuccess(input: {
  sessionId: string;
  fallbackProductId?: string | null;
  viewerEmail?: string | null;
}) {
  const session = await retrieveCheckoutSession(input.sessionId);
  const summary = summarizeCheckoutSession(session, input.fallbackProductId);

  await persistCheckoutSummary(session, input.fallbackProductId);

  const licenseKey =
    summary.checkoutComplete && summary.email && env.licenseSigningSecret && !isCommandPaymentUnlockProduct(summary.productId)
      ? issueSignedLicense({
          email: summary.email,
          productId: summary.productId,
          issuedAt: summary.createdAtIso,
          checkoutSessionId: summary.sessionId,
        })
      : null;

  const portalGrant =
    summary.checkoutComplete && summary.customerId && env.checkoutSessionSecret
      ? createCheckoutAccessGrant({
          sessionId: summary.sessionId,
          customerId: summary.customerId,
          productId: summary.productId,
          planId: summary.planId,
          email: summary.email,
        })
      : null;

  return {
    ...summary,
    session,
    licenseKey,
    portalGrant,
  };
}
