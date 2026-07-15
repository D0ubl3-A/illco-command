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
  assert.match(storefront, /"instant-lead-rescue-text-back-ai": "\$750 setup"/);
  assert.match(storefront, /"youtube-rank-revival-ai-pro": "\$50"/);
});

test("Lead Recovery page contains conversion, onboarding, delivery, proof, retention, SEO, and mobile-first requirements", () => {
  const page = read("app/lead-rescue/page.tsx");

  assert.doesNotMatch(page, /#request|requestHref/);
  assert.match(page, /ProductIntakeForm/);
  assert.match(page, /\$750/);
  assert.match(page, /\$199/);
  assert.match(page, /seven business days/i);
  assert.match(page, /20 consecutive end-to-end test calls/i);
  assert.match(page, /Median response time/);
  assert.match(page, /FAQPage/);
  assert.match(page, /sm:grid|lg:grid/);
});

test("Rank Revival page and checkout match the $50 one-video service", () => {
  const page = read("app/youtube-rank-revival/page.tsx");
  const checkout = read("app/api/youtube-rank-revival/checkout/route.ts");
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

  assert.match(checkout, /offerPriceCents = 5000/);
  assert.match(checkout, /createOneTimeCheckoutSession/);
  assert.match(checkout, /videoCount: "1"/);
  assert.match(stripe, /mode: "payment"/);
  assert.match(stripe, /purchaseType: "one-time-service"/);
});

test("priority offer canonical pages are included in the sitemap", () => {
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /\$\{siteUrl\}\/lead-rescue/);
  assert.match(sitemap, /\$\{siteUrl\}\/youtube-rank-revival/);
});
