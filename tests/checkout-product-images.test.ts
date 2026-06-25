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
    "mastering-studio-platform",
    "rap-lyric-generator",
    "songanalyzer-deploy",
    "sora-vault-cloud",
    "barz-web-studio",
  ]);
  assert.equal(new Set(musicImageIds).size, musicProducts.length);
});

test("checkout image mappings use generator output instead of custom repeated photos", () => {
  assert.equal(getImagePathForProduct("ai-music-mastering-pro"), "/products/generated/mastering-studio-platform.jpg?v=2026-06-24-generator-assets-v1");
  assert.equal(getImagePathForProduct("rap-lyric-generator"), "/products/generated/rap-lyric-generator.jpg?v=2026-06-24-generator-assets-v1");
  assert.equal(getImagePathForProduct("song-analyzer-deploy"), "/products/generated/songanalyzer-deploy.jpg?v=2026-06-24-generator-assets-v1");
  assert.equal(getImagePathForProduct("vault-select-exclusive-trap-beat"), "/products/generated/sora-vault-cloud.jpg?v=2026-06-24-generator-assets-v1");
  assert.equal(getImagePathForProduct("barz-beat-shop"), "/products/generated/barz-web-studio.jpg?v=2026-06-24-generator-assets-v1");
});

function getImagePathForProduct(productId: string) {
  const product = checkoutProducts.find((item) => item.id === productId);
  assert.ok(product, `${productId} should exist`);
  return getCheckoutProductImagePath(product);
}