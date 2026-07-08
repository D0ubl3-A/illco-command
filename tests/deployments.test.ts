import assert from "node:assert/strict";
import test from "node:test";

import { getProductById } from "../lib/deployments";
import { getMonetizationPlan } from "../lib/monetization";
import { storefrontPriceLabel, storefrontProductImage } from "../lib/storefront";

test("YouTube Ops is promoted into the public subscription catalog", () => {
  const product = getProductById("youtube-ops-vercel");
  assert(product);
  assert.equal(product.displayName, "YouTube Ops");
  assert.equal(product.subscriptionTier, "Studio");
  assert.equal(product.licenseMode, "subscription");

  const monetization = getMonetizationPlan(product.id);
  assert(monetization);
  assert.equal(monetization.publicInFunnel, true);
  assert.equal(monetization.healthGate.behavior, "allow-checkout");
  assert.equal(monetization.routeAfterPurchase.type, "command-center");
  assert.equal(monetization.routeAfterPurchase.href, "/apps/youtube-ops-vercel");
});

test("Viral Stitch AI is registered for Command-issued license validation", () => {
  const product = getProductById("viral-stitch-ai");
  assert(product);
  assert.equal(product.displayName, "Viral Stitch AI");
  assert.equal(product.subscriptionTier, "Studio");
  assert.equal(product.licenseMode, "subscription");

  const monetization = getMonetizationPlan(product.id);
  assert(monetization);
  assert.equal(monetization.publicInFunnel, false);
  assert.equal(monetization.healthGate.behavior, "block-checkout");
  assert.equal(monetization.routeAfterPurchase.type, "command-center");
});
test("registry sale offers keep exact prices and colorful product images", () => {
  const mastering = getProductById("ai-music-mastering-pro");
  assert(mastering);
  assert.equal(storefrontPriceLabel(mastering), "$249");
  assert.equal(
    storefrontProductImage(mastering),
    "/assets/product-images/alternate-colors/a_polished_marketing_banner_product_ad_layout_on_20_batch_10.png",
  );

  const leadRescue = getProductById("instant-lead-rescue-text-back-ai");
  assert(leadRescue);
  assert.equal(storefrontPriceLabel(leadRescue), "$399");
  assert.equal(
    storefrontProductImage(leadRescue),
    "/assets/product-images/alternate-colors/square_portrait_ish_graphic_ad_landing_page_mockup_18_batch_8.png",
  );
});
