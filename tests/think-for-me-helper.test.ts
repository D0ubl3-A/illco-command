import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getAppFunnelState } from "../lib/app-funnel";
import { getProductById } from "../lib/deployments";
import { getMonetizationPlan } from "../lib/monetization";
import { canDirectCheckoutPublicProduct } from "../lib/public-checkout";
import { thinkForMeSkillMarkdown } from "../lib/think-for-me-skill";

const toolsInterfaceSource = readFileSync("components/illco-tools-interface.tsx", "utf8");
const helperPageSource = readFileSync("app/tools/think-for-me-mode/page.tsx", "utf8");
const skillRouteSource = readFileSync("app/tools/think-for-me-mode/skill/route.ts", "utf8");
const productAccessSource = readFileSync("lib/product-access.ts", "utf8");
const copyPromptSource = readFileSync("components/copy-prompt-block.tsx", "utf8");
const appLandingSource = readFileSync("app/apps/[productId]/page.tsx", "utf8");
const sitemapSource = readFileSync("app/sitemap.ts", "utf8");
const productImageSource = readFileSync("public/products/think-for-me-mode.svg", "utf8");

test("Think For Me helper is linked from the ILLCO Tools module grid", () => {
  assert.match(toolsInterfaceSource, /id:\s*"think-for-me-mode"/);
  assert.match(toolsInterfaceSource, /name:\s*"Think For Me Mode"/);
  assert.match(toolsInterfaceSource, /href:\s*"\/tools\/think-for-me-mode"/);
  assert.match(toolsInterfaceSource, /OpenAI Agents SDK View/);
  assert.match(toolsInterfaceSource, /ElevenLabs Narration/);
});

test("Think For Me page explains when to keep or redo agent and narration workflows", () => {
  assert.match(helperPageSource, /Goal = destination/);
  assert.match(helperPageSource, /Plan Mode = map/);
  assert.match(helperPageSource, /CLI = hands/);
  assert.match(helperPageSource, /Redo With Agents SDK/);
  assert.match(helperPageSource, /Keep The Narration/);
  assert.match(helperPageSource, /Redo The Narration/);
  assert.match(helperPageSource, /Create an ElevenLabs narration plan/);
  assert.match(helperPageSource, /CopyPromptBlock/);
  assert.match(helperPageSource, /Actual Codex Skill/);
  assert.match(thinkForMeSkillMarkdown, /name: think-for-me-mode/);
  assert.match(helperPageSource, /Copy SKILL\.md/);
  assert.match(helperPageSource, /Copy install command/);
  assert.match(helperPageSource, /Copy verify command/);
  assert.match(helperPageSource, /Invoke-WebRequest -Uri 'https:\/\/illcoai\.tech\/tools\/think-for-me-mode\/skill'/);
  assert.match(helperPageSource, /-UseBasicParsing/);
  assert.match(helperPageSource, /New-Item -ItemType Directory -Force/);
  assert.match(helperPageSource, /Think For Me skill verified/);
  assert.match(helperPageSource, /## OpenAI Agents SDK View/);
  assert.match(helperPageSource, /## ElevenLabs Narration/);
  assert.match(helperPageSource, /Download SKILL\.md/);
  assert.match(helperPageSource, /\/tools\/think-for-me-mode\/skill/);
  assert.match(helperPageSource, /D:\\workspace\\.codex\\skills\\think-for-me-mode\\SKILL\.md/);
});

test("Think For Me starter prompts can be copied from the helper page", () => {
  assert.match(copyPromptSource, /navigator\.clipboard/);
  assert.match(copyPromptSource, /document\.execCommand\("copy"\)/);
  assert.match(copyPromptSource, /Copied/);
  assert.match(copyPromptSource, /Select text/);
});

test("Think For Me helper is included in public sitemap routes", () => {
  assert.match(sitemapSource, /\/tools\/think-for-me-mode/);
});

test("Think For Me Mode is locked as a paid Studio product", () => {
  const product = getProductById("think-for-me-mode");
  const monetization = getMonetizationPlan("think-for-me-mode");

  assert.ok(product);
  assert.equal(product.displayName, "Think For Me Mode");
  assert.equal(product.category, "command");
  assert.equal(product.subscriptionTier, "Studio");
  assert.equal(product.licenseMode, "seat");
  assert.equal(product.productionUrl, "https://illcoai.tech/tools/think-for-me-mode");
  assert.ok(monetization);
  assert.equal(monetization.publicInFunnel, true);
  assert.equal(monetization.needsDemoVideo, true);
  assert.equal(monetization.healthGate.behavior, "allow-checkout");
  assert.equal(canDirectCheckoutPublicProduct("think-for-me-mode"), true);

  const state = getAppFunnelState(product);
  assert.ok(["Guided setup", "Self-serve subscription"].includes(state.accessLabel));
  assert.match(state.title, /AI operator mode/);
  assert.match(state.summary, /fewer blank screens/);
});

test("Think For Me Mode app landing uses the product image", () => {
  assert.match(appLandingSource, /getProductViralImagePath/);
  assert.match(appLandingSource, /appLandingProductImage/);
  assert.match(productImageSource, /Think For Me Mode/);
  assert.match(productImageSource, /AGENTS SDK/);
  assert.match(productImageSource, /ELEVENLABS/);
});

test("Think For Me page and SKILL.md route require paid product access", () => {
  assert.match(helperPageSource, /getProductAccess\(productId\)/);
  assert.match(helperPageSource, /LockedThinkForMeMode/);
  assert.match(helperPageSource, /Locked until paid/);
  assert.match(helperPageSource, /name="productId" value=\{productId\}/);
  assert.match(helperPageSource, /name="planId" value=\{productPlanId\}/);
  assert.match(skillRouteSource, /getProductAccess\(productId\)/);
  assert.match(skillRouteSource, /NextResponse\.redirect/);
  assert.match(skillRouteSource, /thinkForMeSkillMarkdown/);
  assert.match(productAccessSource, /isTrustedAdminEmail/);
  assert.match(productAccessSource, /purchaseUnlocksProduct/);
  assert.match(productAccessSource, /paidStatuses/);
});
