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
