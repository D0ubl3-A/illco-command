import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkoutProducts } from "../lib/checkout-products";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("priority offers use one canonical name, scope, and sales route", () => {
  const lead = checkoutProducts.find((product) => product.id === "instant-lead-rescue-text-back-ai");
  const youtube = checkoutProducts.find((product) => product.id === "youtube-rank-revival-ai-pro");
  const storefront = read("app/page.tsx");

  assert.equal(lead?.name, "ILLCO Lead Recovery System");
  assert.match(lead?.summary || "", /text-back.*qualification.*booking.*monthly optimization/i);
  assert.equal(youtube?.name, "YouTube Rank Revival AI Pro");
  assert.match(youtube?.summary || "", /\$50 one-video optimization sprint/i);

  assert.match(storefront, /"instant-lead-rescue-text-back-ai": "\/lead-rescue"/);
  assert.match(storefront, /"youtube-rank-revival-ai-pro": "\/youtube-rank-revival"/);
  assert.match(storefront, /"instant-lead-rescue-text-back-ai": "\\$750 setup \\+ \\$199\\/mo"/);
  assert.match(storefront, /"youtube-rank-revival-ai-pro": "\$50"/);
});


test("homepage routes buyers through honest purchase modes", () => {
  const storefront = read("app/page.tsx");
  const client = read("components/app-store-client.tsx");

  assert.match(storefront, /purchaseMode = dedicatedSalesPages\[checkoutProduct\.id\]/);
  assert.match(storefront, /canDirectCheckoutPublicProduct\(appProduct\.id\)/);
  assert.match(client, /action="\/api\/subscriptions\/checkout"/);
  assert.match(client, /Buy now — \{product\.priceLabel\}/);
  assert.match(client, /Book service — \{product\.priceLabel\}/);
  assert.match(client, /Add to quote/);
  assert.doesNotMatch(client, /Add to cart/);
  assert.match(client, /Quote builder/);
  assert.match(client, /Estimated starting total/);
});

test("Lead Recovery has linked setup-plus-subscription checkout and verified confirmation", () => {
  const page = read("app/lead-rescue/page.tsx");
  const checkout = read("app/api/lead-recovery/checkout/route.ts");
  const intake = read("components/product-intake-form.tsx");
  const stripe = read("lib/stripe.ts");

  assert.doesNotMatch(page, /#request|requestHref/);
  assert.match(page, /ProductIntakeForm/);
  assert.match(page, /checkoutHref=\{checkoutHref\}/);
  assert.match(page, /verifyLeadRecoveryPayment/);
  assert.match(page, /session\.mode === "subscription"/);
  assert.match(page, /session\.payment_status === "paid"/);
  assert.match(page, /session\.metadata\?\.intakeId/);
  assert.match(page, /\$750/);
  assert.match(page, /\$199/);
  assert.match(page, /seven business days/i);
  assert.match(page, /20 consecutive end-to-end test calls/i);
  assert.match(page, /Median response time/);
  assert.match(page, /UnitPriceSpecification/);
  assert.match(page, /FAQPage/);
  assert.match(page, /sm:grid|lg:grid/);

  assert.match(checkout, /export async function POST/);
  assert.match(checkout, /export async function GET\(\)/);
  assert.match(checkout, /status: 405/);
  assert.match(checkout, /getLeadReference/);
  assert.match(checkout, /lead\.planId !== productId/);
  assert.match(checkout, /setupAmountCents = 75_000/);
  assert.match(checkout, /recurringAmountCents = 19_900/);
  assert.match(checkout, /createSetupPlusSubscriptionCheckoutSession/);
  assert.match(checkout, /intakeId: lead\.id/);
  assert.match(checkout, /planId: "suite"/);

  assert.match(intake, /method="post"/);
  assert.match(intake, /name="intakeId" value=\{intakeId\}/);
  assert.match(stripe, /purchaseType: "setup-plus-subscription"/);
  assert.match(stripe, /recurring: \{ interval: "month" \}/);
});

test("Rank Revival page and checkout match the $50 one-video service", () => {
  const page = read("app/youtube-rank-revival/page.tsx");
  const checkout = read("app/api/youtube-rank-revival/checkout/route.ts");
  const intake = read("components/product-intake-form.tsx");
  const stripe = read("lib/stripe.ts");

  assert.match(page, /\$50 one-time/i);
  assert.match(page, /One existing video/i);
  assert.match(page, /24-72 hours/i);
  assert.match(page, /Three title options/i);
  assert.match(page, /Rewritten description/i);
  assert.match(page, /Thumbnail improvement direction/i);
  assert.match(page, /One revision round/i);
  assert.match(page, /No channel password required/i);
  assert.match(page, /FAQPage/);
  assert.match(page, /verifyRankRevivalPayment/);
  assert.match(page, /session\.payment_status === "paid"/);
  assert.match(page, /session\.metadata\?\.intakeId/);
  assert.doesNotMatch(page, /href=\{checkoutHref\}/);

  assert.match(checkout, /export async function POST/);
  assert.match(checkout, /export async function GET\(\)/);
  assert.match(checkout, /status: 405/);
  assert.match(checkout, /getLeadReference/);
  assert.match(checkout, /lead\.planId !== offerId/);
  assert.match(checkout, /offerPriceCents = 5000/);
  assert.match(checkout, /createOneTimeCheckoutSession/);
  assert.match(checkout, /intakeId: lead\.id/);
  assert.match(checkout, /videoCount: "1"/);

  assert.match(intake, /Specific YouTube video URL/);
  assert.match(intake, /name="channelUrl"/);
  assert.match(intake, /name="volume" value="1"/);
  assert.match(intake, /method="post"/);
  assert.match(intake, /name="intakeId" value=\{intakeId\}/);

  assert.match(stripe, /mode: "payment"/);
  assert.match(stripe, /purchaseType: "one-time-service"/);
});

test("priority offer canonical pages are included in the sitemap", () => {
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /\$\{siteUrl\}\/lead-rescue/);
  assert.match(sitemap, /\$\{siteUrl\}\/youtube-rank-revival/);
});
