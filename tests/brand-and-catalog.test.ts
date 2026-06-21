import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { checkoutProductCategories, checkoutProductCategoryDetails, checkoutProducts } from "../lib/checkout-products";

const layoutSource = readFileSync("app/layout.tsx", "utf8");
const commandClientSource = readFileSync("components/command-client.tsx", "utf8");
const checkoutSectionSource = readFileSync("components/checkout-products-section.tsx", "utf8");
const logoSource = readFileSync("public/brand/illco-command-logo.svg", "utf8");
const faviconSource = readFileSync("public/favicon.svg", "utf8");
const appIconSource = readFileSync("app/icon.svg", "utf8");

test("site uses the ILLCO command logo and SVG favicon", () => {
  assert.match(layoutSource, /\/icon\.svg/);
  assert.match(layoutSource, /\/favicon\.svg/);
  assert.match(commandClientSource, /\/brand\/illco-command-logo\.svg/);
  assert.match(logoSource, /ILLCO AI command logo/);
  assert.match(faviconSource, /#050a12/);
  assert.match(appIconSource, /#ff2b25/);
});

test("checkout products are grouped into buyer-friendly lanes", () => {
  assert.deepEqual(checkoutProductCategories, [
    "Command & AI Operators",
    "Sales & Lead Recovery",
    "Workflow Automation",
    "Music & Audio",
    "Video & Creator Growth",
    "Commerce & Stores",
    "App Conversion",
    "Voice & Memory",
  ]);

  for (const category of checkoutProductCategories) {
    assert.ok(checkoutProductCategoryDetails[category], `${category} needs a buyer-facing description`);
    assert.ok(checkoutProducts.some((product) => product.category === category), `${category} needs at least one product`);
  }

  assert.equal(checkoutProducts.find((product) => product.id === "ai-workflow-mastery")?.category, "Command & AI Operators");
  assert.equal(checkoutProducts.find((product) => product.id === "instant-lead-rescue-text-back-ai")?.category, "Sales & Lead Recovery");
  assert.equal(checkoutProducts.find((product) => product.id === "website-to-android-app-conversion")?.category, "App Conversion");
  assert.match(checkoutSectionSource, /checkoutProductCategoryDetails/);
});

test("Commander app directory renders categorized product groups", () => {
  assert.match(commandClientSource, /productCategoryGroups/);
  assert.match(commandClientSource, /categoryDescriptions/);
  assert.match(commandClientSource, /productDirectoryRank/);
});
