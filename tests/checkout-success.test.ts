import assert from "node:assert/strict";
import test from "node:test";

process.env.CHECKOUT_SESSION_SECRET = "grant-secret-for-tests";

test("checkout session summaries normalize YouTube Ops purchases", async () => {
  const { summarizeCheckoutSession } = await import("../lib/checkout-success");

  const summary = summarizeCheckoutSession({
    id: "cs_test_123",
    customer: "cus_test_123",
    client_reference_id: "youtube-ops-vercel",
    metadata: {
      productId: "youtube-ops-vercel",
      planId: "studio",
    },
    status: "complete",
    payment_status: "paid",
    customer_details: {
      email: "Creator@Example.com",
    },
    created: 1_700_000_000,
  } as never);

  assert.equal(summary.productId, "youtube-ops-vercel");
  assert.equal(summary.productName, "YouTube Ops");
  assert.equal(summary.planId, "studio");
  assert.equal(summary.email, "creator@example.com");
  assert.equal(summary.checkoutComplete, true);
});

test("checkout access grants round-trip and bind to a session", async () => {
  const { createCheckoutAccessGrant, verifyCheckoutAccessGrant } = await import("../lib/checkout-success");

  const grant = createCheckoutAccessGrant({
    sessionId: "cs_test_456",
    customerId: "cus_test_456",
    productId: "youtube-ops-vercel",
    planId: "studio",
    email: "creator@example.com",
    expiresInSeconds: 3600,
  });

  const payload = verifyCheckoutAccessGrant(grant, "cs_test_456");
  assert.equal(payload.customerId, "cus_test_456");
  assert.equal(payload.productId, "youtube-ops-vercel");
  assert.equal(payload.planId, "studio");
  assert.equal(payload.email, "creator@example.com");
});

test("checkout access grants reject tampering", async () => {
  const { createCheckoutAccessGrant, verifyCheckoutAccessGrant } = await import("../lib/checkout-success");

  const grant = createCheckoutAccessGrant({
    sessionId: "cs_test_tamper",
    customerId: "cus_test_tamper",
    productId: "youtube-ops-vercel",
    planId: "studio",
    email: "creator@example.com",
  });
  const [prefix, payload, signature] = grant.split(".");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  decoded.productId = "illco-command";
  const tampered = `${prefix}.${Buffer.from(JSON.stringify(decoded)).toString("base64url")}.${signature}`;

  assert.throws(() => verifyCheckoutAccessGrant(tampered, "cs_test_tamper"), /signature is invalid/);
});

test("completed one-time checkouts do not unlock before payment succeeds", async () => {
  const { summarizeCheckoutSession } = await import("../lib/checkout-success");

  const summary = summarizeCheckoutSession({
    id: "cs_test_unpaid",
    mode: "payment",
    customer: "cus_test_unpaid",
    client_reference_id: "youtube-ops-vercel",
    metadata: { productId: "youtube-ops-vercel", planId: "studio" },
    status: "complete",
    payment_status: "unpaid",
  } as never);

  assert.equal(summary.checkoutComplete, false);
});

test("subscription trials can unlock only after Checkout completes", async () => {
  const { summarizeCheckoutSession } = await import("../lib/checkout-success");

  const completeTrial = summarizeCheckoutSession({
    id: "cs_test_trial",
    mode: "subscription",
    customer: "cus_test_trial",
    client_reference_id: "youtube-ops-vercel",
    metadata: { productId: "youtube-ops-vercel", planId: "studio" },
    status: "complete",
    payment_status: "no_payment_required",
  } as never);
  const openTrial = summarizeCheckoutSession({
    id: "cs_test_open_trial",
    mode: "subscription",
    customer: "cus_test_open_trial",
    client_reference_id: "youtube-ops-vercel",
    metadata: { productId: "youtube-ops-vercel", planId: "studio" },
    status: "open",
    payment_status: "no_payment_required",
  } as never);

  assert.equal(completeTrial.checkoutComplete, true);
  assert.equal(openTrial.checkoutComplete, false);
});

test("missing purchase persistence fails the webhook so Stripe can retry", async () => {
  const { requirePurchasePersistence } = await import("../lib/stripe-webhook");

  assert.throws(
    () => requirePurchasePersistence(false),
    /Purchase persistence is temporarily unavailable; retry this webhook/,
  );
  assert.doesNotThrow(() => requirePurchasePersistence(true));
});
