import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { products } from "../lib/deployments";
import { getMonetizationPlan } from "../lib/monetization";
import { getProductViralImagePath } from "../lib/product-marketing";

test("product marketing images resolve to real public assets", () => {
  const customProducts = products.filter((product) => getProductViralImagePath(product).startsWith("/products/custom/"));
  assert.ok(customProducts.length >= 60, "expected most products to receive meaningful product-family images");

  for (const product of products) {
    const imagePath = getProductViralImagePath(product);
    const diskPath = path.join(process.cwd(), "public", imagePath.replace(/^\//, ""));
    assert.equal(existsSync(diskPath), true, `${product.id} should use an existing custom image: ${imagePath}`);
  }
});

test("priority products receive images that match the product purpose", () => {
  const imageById = new Map(products.map((product) => [product.id, getProductViralImagePath(product)]));

  assert.equal(imageById.get("automateflow"), "/products/custom/instant-lead-rescue-text-back-ai.jpg");
  assert.equal(imageById.get("dj-curse-reverse"), "/products/custom/dj-curse-reverse.jpg");
  assert.equal(imageById.get("illcoai-video-generator-deploy"), "/products/custom/illcoai-video-generator-dashboard.jpg");
  assert.equal(imageById.get("ill-motion-ai"), "/products/custom/ill-motion-ai-music-video.jpg");
  assert.equal(imageById.get("think-for-me-mode"), "/products/custom/think-for-me-mode-command-center.jpg");
  assert.equal(imageById.get("youtube-ops-vercel"), "/products/custom/youtube-ops-command-center.jpg");
});

test("every public funnel product uses a custom image family", () => {
  const publicProducts = products.filter((product) => getMonetizationPlan(product.id)?.publicInFunnel);
  assert.ok(publicProducts.length > 0, "expected public funnel products");

  for (const product of publicProducts) {
    assert.match(
      getProductViralImagePath(product),
      /^\/products\/custom\//,
      `${product.id} should not use a generic generated card in the public funnel`,
    );
  }
});
