import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("verified priority checkouts enter the tracked delivery portal", () => {
  const leadCheckout = read("app/api/lead-recovery/checkout/route.ts");
  const youtubeCheckout = read("app/api/youtube-rank-revival/checkout/route.ts");
  const deliveryCheckout = read("app/delivery/checkout/page.tsx");

  assert.match(leadCheckout, /returnPath: "\/delivery\/checkout\?offer=lead-recovery-system"/);
  assert.match(youtubeCheckout, /returnPath: "\/delivery\/checkout\?offer=youtube-rank-revival-ai-pro"/);
  assert.match(deliveryCheckout, /session\.payment_status !== "paid"/);
  assert.match(deliveryCheckout, /session\.metadata\?\.intakeId/);
  assert.match(deliveryCheckout, /upsertServiceOrderFromCheckout/);
  assert.match(deliveryCheckout, /buildDeliveryHref/);
});

test("Stripe completion creates an idempotent fulfillment order and owner alert", () => {
  const webhook = read("lib/stripe-webhook.ts");
  const orders = read("lib/service-orders.ts");

  assert.match(webhook, /upsertServiceOrderFromCheckout/);
  assert.match(webhook, /notifyServiceOrderCreated/);
  assert.match(orders, /CREATE TABLE IF NOT EXISTS illco_command_service_orders/);
  assert.match(orders, /ON CONFLICT \(stripe_session_id\) DO UPDATE/);
  assert.match(orders, /20 consecutive end-to-end tests passed/);
  assert.match(orders, /Three title options completed/);
  assert.match(orders, /FULFILLMENT_NOTIFICATION_WEBHOOK_URL|fulfillmentNotificationWebhookUrl/);
});

test("customers receive a private noindex delivery, result, and proof portal", () => {
  const portal = read("app/delivery/[orderId]/page.tsx");
  const proofRoute = read("app/api/delivery/[orderId]/proof/route.ts");
  const orders = read("lib/service-orders.ts");

  assert.match(portal, /robots: \{ index: false/);
  assert.match(portal, /Private customer delivery portal/);
  assert.match(portal, /Visible progress from payment to result/);
  assert.match(portal, /Measured outcome/);
  assert.match(portal, /Submit verified feedback/);
  assert.match(proofRoute, /submitServiceOrderProof/);
  assert.match(proofRoute, /method|POST/);
  assert.match(orders, /createHmac\("sha256"/);
  assert.match(orders, /timingSafeEqual/);
  assert.match(orders, /proof_permission/);
});

test("admin has a protected fulfillment queue with checklist, metrics, and proof controls", () => {
  const admin = read("app/admin/page.tsx");
  const queue = read("app/admin/orders/page.tsx");
  const actions = read("app/admin/orders/actions.ts");

  assert.match(admin, /href="\/admin\/orders"/);
  assert.match(queue, /Fulfillment and proof queue/);
  assert.match(queue, /Customer portal/);
  assert.match(queue, /Delivery checklist/);
  assert.match(queue, /Estimated revenue/);
  assert.match(queue, /CTR before/);
  assert.match(queue, /Proof status/);
  assert.match(actions, /isAdminAuthenticated/);
  assert.match(actions, /updateServiceOrder/);
  assert.match(actions, /revalidatePath\("\/admin\/orders"\)/);
});

test("fulfillment runtime configuration is explicit", () => {
  const env = read("lib/env.ts");
  assert.match(env, /SERVICE_ORDER_ACCESS_SECRET/);
  assert.match(env, /FULFILLMENT_NOTIFICATION_WEBHOOK_URL/);
  assert.match(env, /deliveryPortalReady/);
  assert.match(env, /fulfillmentNotificationsReady/);
});
