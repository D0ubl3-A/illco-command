import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { checkoutProducts } from "../lib/checkout-products";
import { getCheckoutProductGeneratedImageId, getCheckoutProductImagePath, getCheckoutProductVisualSignature } from "../lib/checkout-product-images";

test("checkout product cards use unique generated image assets", () => {
  const imagePaths = checkoutProducts.map((product) => getCheckoutProductImagePath(product));
  const imageIds = checkoutProducts.map((product) => getCheckoutProductGeneratedImageId(product));

  assert.equal(new Set(imagePaths).size, checkoutProducts.length, "each checkout product should have its own generated image path");
  assert.equal(new Set(imageIds).size, checkoutProducts.length, "each checkout product should map to a unique generated image asset");

  for (const imagePath of imagePaths) {
    assert.match(imagePath, /^\/products\/generated\/[^/]+\.jpg\?v=.+/);
    const diskPath = path.join(process.cwd(), "public", imagePath.replace(/^\//, "").replace(/\?.*$/, ""));
    assert.equal(existsSync(diskPath), true, `${imagePath} should point at an existing generated image`);
  }
});

test("music checkout products use distinct generated photos", () => {
  const musicProducts = checkoutProducts.filter((product) => product.category === "Music & Audio");
  const musicImageIds = musicProducts.map((product) => getCheckoutProductVisualSignature(product));

  assert.deepEqual(musicImageIds, [
    "ai-music-mastering-pro",
    "rap-lyric-generator",
    "songanalyzer-deploy",
    "sora-vault-cloud",
    "barz-web-studio",
  ]);
  assert.equal(new Set(musicImageIds).size, musicProducts.length);
});

test("latest ZIP images are used for the top checkout products", () => {
  assert.equal(getImagePathForProduct("ai-music-mastering-pro"), "/products/generated/ai-music-mastering-pro.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("cinematic-ai-music-video-production"), "/products/generated/cinematic-ai-music-video-production.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("full-hd-lyric-videos"), "/products/generated/full-hd-lyric-videos.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("youtube-rank-revival-ai-pro"), "/products/generated/youtube-rank-revival-ai-pro.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("instant-lead-rescue-text-back-ai"), "/products/generated/instant-lead-rescue-text-back-ai.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("ai-workflow-mastery"), "/products/generated/ai-workflow-mastery.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("interactive-legacy-avatar-upgrade"), "/products/generated/interactive-legacy-avatar-upgrade.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("testimonial-to-marketing-asset-generator"), "/products/generated/testimonial-to-marketing-asset-generator.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("notion-research-clipper-ai-for-chrome"), "/products/generated/notion-research-clipper-ai-for-chrome.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("linkedin-gmail-lead-sync-extension"), "/products/generated/linkedin-gmail-lead-sync-extension.jpg?v=2026-06-30-alternate-colors-top10-v1");
});

test("checkout image mappings keep generator fallback output for remaining products", () => {
  assert.equal(getImagePathForProduct("rap-lyric-generator"), "/products/generated/rap-lyric-generator.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("song-analyzer-deploy"), "/products/generated/songanalyzer-deploy.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("vault-select-exclusive-trap-beat"), "/products/generated/sora-vault-cloud.jpg?v=2026-06-30-alternate-colors-top10-v1");
  assert.equal(getImagePathForProduct("barz-beat-shop"), "/products/generated/barz-web-studio.jpg?v=2026-06-30-alternate-colors-top10-v1");
});

function getImagePathForProduct(productId: string) {
  const product = checkoutProducts.find((item) => item.id === productId);
  assert.ok(product, `${productId} should exist`);
  return getCheckoutProductImagePath(product);
}