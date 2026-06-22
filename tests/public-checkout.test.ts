import assert from "node:assert/strict";
import test from "node:test";

import { getAppFunnelState } from "../lib/app-funnel";
import { getProductById } from "../lib/deployments";
import { getConfigurationStatus } from "../lib/env";
import { getMonetizationPlan, monetizationPlan } from "../lib/monetization";
import { canDirectCheckoutPublicPlan, canDirectCheckoutPublicProduct } from "../lib/public-checkout";

function appState(productId: string) {
  const product = getProductById(productId);
  assert.ok(product, `${productId} should exist in the deployment catalog`);
  return getAppFunnelState(product);
}

test("public direct checkout requires proof-ready product coverage", () => {
  assert.equal(canDirectCheckoutPublicProduct("uap-ai-lab"), true);
  assert.equal(canDirectCheckoutPublicProduct("mastering-studio-platform"), true);
  assert.equal(canDirectCheckoutPublicProduct("youtube-ops-vercel"), true);
});

test("plan-level public checkout only passes when at least one product is proof ready", () => {
  assert.equal(canDirectCheckoutPublicPlan("studio"), true);
});

test("app landing launch links are blocked for non-healthy public apps", () => {
  assert.equal(appState("online-store").canOpen, false);
  assert.equal(appState("whatsapp-bot").canOpen, false);
  assert.equal(appState("ship-fast-test").canOpen, false);
});

test("monetization snapshot never exposes degraded apps as checkout-with-warning", () => {
  const warningProducts = Object.values(monetizationPlan.products).filter(
    (product) => product.healthGate.behavior === "allow-checkout-with-warning",
  );

  assert.deepEqual(warningProducts, []);
});

test("separated companion products are present and locked independently", () => {
  const companionIds = [
    "ai-companion-conversational-intake",
    "ai-companion-prompt-studio",
    "ai-companion-content-production",
    "ai-companion-sales-agent-handoff",
    "ai-companion-command-routing",
    "ai-companion-workspace-access",
  ];

  for (const productId of companionIds) {
    const plan = getMonetizationPlan(productId);
    assert.ok(getProductById(productId), `${productId} should exist in the deployment catalog`);
    assert.ok(plan, `${productId} should exist in the monetization plan`);
    assert.equal(plan.publicInFunnel, false);
    assert.equal(plan.healthGate.behavior, "block-checkout");
    assert.equal(canDirectCheckoutPublicProduct(productId), false);
    assert.equal(appState(productId).canOpen, false);
  }
});

test("app landing launch links follow direct-checkout readiness", () => {
  const uapState = appState("uap-ai-lab");
  const config = getConfigurationStatus();
  assert.equal(uapState.canOpen, Boolean(config.subscriptionsReady && config.planPrices[uapState.planId]));
  assert.equal(appState("youtube-ops-vercel").canOpen, Boolean(config.subscriptionsReady && config.planPrices.studio));
});
