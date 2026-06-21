import assert from "node:assert/strict";
import test from "node:test";

import { getProductById } from "../lib/deployments";
import { getMonetizationPlan } from "../lib/monetization";

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
  assert.equal(monetization.routeAfterPurchase.type, "production-url");
  assert.equal(monetization.routeAfterPurchase.href, "https://youtubeopsvercel.vercel.app");
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
