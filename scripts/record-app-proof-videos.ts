import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

type DemoVideoSnapshot = {
  generatedAt?: string | null;
  projects?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
};

const repoRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(repoRoot, "data", "demo-videos.json");
const outputRoot = path.resolve(process.env.APP_PROOF_VIDEO_DIR || path.join(repoRoot, "artifacts", "two-minute-proof-videos"));

function readArg(name: string) {
  const prefix = `--${name}=`;
  const exact = `--${name}`;
  const index = process.argv.findIndex((arg) => arg === exact || arg.startsWith(prefix));
  if (index === -1) return null;
  const current = process.argv[index];
  if (current.startsWith(prefix)) return current.slice(prefix.length);
  return process.argv[index + 1] && !process.argv[index + 1].startsWith("--") ? process.argv[index + 1] : "true";
}

function readProjectIds() {
  const raw = readArg("project-ids") || readArg("projects") || process.env.APP_PROOF_PROJECT_IDS || "";
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

function readPositiveInt(name: string, fallback: number) {
  const raw = readArg(name) || process.env[`APP_PROOF_${name.replace(/-/g, "_").toUpperCase()}`];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error(`--${name} must be a positive number.`);
  return Math.floor(parsed);
}

function readString(name: string, fallback: string) {
  const raw = readArg(name) || process.env[`APP_PROOF_${name.replace(/-/g, "_").toUpperCase()}`];
  return raw ? String(raw) : fallback;
}

function readBoolean(name: string, fallback = false) {
  const raw = readArg(name) || process.env[`APP_PROOF_${name.replace(/-/g, "_").toUpperCase()}`];
  if (!raw) return fallback;
  return /^(1|true|yes)$/i.test(raw);
}

async function hoverAndPause(page: import("playwright").Page, selector: string, timeout = 1_500) {
  const locator = page.locator(selector).first();
  if ((await locator.count().catch(() => 0)) < 1) return false;
  await locator.hover({ timeout }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  return true;
}

async function clickSafe(page: import("playwright").Page, selector: string, timeout = 1_500) {
  const locator = page.locator(selector).first();
  if ((await locator.count().catch(() => 0)) < 1) return false;
  await locator.click({ timeout }).catch(() => undefined);
  await page.waitForLoadState("domcontentloaded", { timeout: 3_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  return true;
}

async function scrollToRatio(page: import("playwright").Page, ratio: number, pauseMs = 2_000) {
  await page.evaluate((scrollProgress) => {
    const maxTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    window.scrollTo({ top: maxTop * scrollProgress, behavior: "smooth" });
  }, ratio);
  await page.waitForTimeout(pauseMs);
}

async function driveRealAppWalkthrough(page: import("playwright").Page, durationMs: number) {
  const startedAt = Date.now();
  const timeLeft = () => durationMs - (Date.now() - startedAt);
  const continueIfTime = () => timeLeft() > 4_000;

  await hoverAndPause(page, "h1");
  await hoverAndPause(page, ".appLandingActions .button");
  await scrollToRatio(page, 0.18, 2_500);

  if (continueIfTime()) {
    await hoverAndPause(page, ".appLandingFacts .factCard");
    await scrollToRatio(page, 0.34, 2_500);
  }

  if (continueIfTime()) {
    await clickSafe(page, 'a[href="#checkout-products"]');
    await hoverAndPause(page, "#checkout-products");
    await scrollToRatio(page, 0.5, 2_500);
  }

  if (continueIfTime()) {
    await hoverAndPause(page, ".appVideoFrame iframe, .appLandingVideoFrame video, video");
    const firstVideo = page.locator("video").first();
    if ((await firstVideo.count().catch(() => 0)) > 0) {
      await firstVideo.evaluate((video) => {
        const el = video as HTMLVideoElement;
        el.muted = true;
        void el.play().catch(() => undefined);
      }).catch(() => undefined);
      await page.waitForTimeout(4_000);
    }
  }

  if (continueIfTime()) {
    await scrollToRatio(page, 0.72, 2_500);
    await hoverAndPause(page, ".accountNote, .appLandingCard");
  }

  if (continueIfTime()) {
    await clickSafe(page, 'a[href="#request"]');
    await hoverAndPause(page, "#request");
    const name = page.locator('input[name="name"]').first();
    if ((await name.count().catch(() => 0)) > 0) {
      await name.fill("Launch Reviewer", { timeout: 1_500 }).catch(() => undefined);
      await page.locator('input[name="email"]').first().fill("reviewer@example.com", { timeout: 1_500 }).catch(() => undefined);
      await page.locator("textarea, input[name='message']").first().fill("Reviewing the product flow, proof video, checkout path, and account unlock.", { timeout: 1_500 }).catch(() => undefined);
      await page.waitForTimeout(3_000);
    }
  }

  let step = 0;
  while (timeLeft() > 0) {
    const progress = step % 2 === 0 ? 0.08 : 0.82;
    await scrollToRatio(page, progress, Math.min(6_000, Math.max(1_000, timeLeft())));
    step += 1;
  }
}

async function readSnapshot(): Promise<DemoVideoSnapshot> {
  const raw = await fs.readFile(snapshotPath, "utf8");
  const parsed = JSON.parse(raw) as DemoVideoSnapshot;
  return {
    ...parsed,
    projects: parsed.projects && typeof parsed.projects === "object" ? parsed.projects : {},
  };
}

async function writeJsonAtomic(filePath: string, value: unknown) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(tempPath, filePath);
}

async function fileExists(filePath: string) {
  return fs.stat(filePath).then((stat) => stat).catch(() => null);
}

async function recordProductProof(productId: string, options: {
  baseUrl: string;
  durationSeconds: number;
  force: boolean;
  suffix: string;
}) {
  const productOutputDir = path.join(outputRoot, productId);
  const outputPath = path.join(productOutputDir, `${productId}.${options.suffix}.webm`);
  const existing = await fileExists(outputPath);
  if (existing && existing.size > 25_000 && !options.force) {
    return {
      productId,
      outputPath,
      bytes: existing.size,
      recordedAt: new Date(existing.mtimeMs).toISOString(),
      reusedExisting: true,
    };
  }

  await fs.mkdir(productOutputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const tempDir = path.join(productOutputDir, ".tmp");
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: tempDir, size: { width: 1280, height: 720 } },
    userAgent: "ILLCO Command two-minute proof recorder",
  });
  const page = await context.newPage();
  const video = page.video();

  try {
    const url = new URL(`/apps/${encodeURIComponent(productId)}`, options.baseUrl).toString();
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const status = response?.status() || 0;
    if (!response || status >= 400) {
      throw new Error(`${productId} app proof route returned HTTP ${status || "no-response"}.`);
    }

    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    const bodyText = await page.locator("body").innerText({ timeout: 8_000 }).catch(() => "");
    if (bodyText.replace(/\s+/g, "").length < 80) {
      throw new Error(`${productId} app proof route did not render enough visible content.`);
    }

    await driveRealAppWalkthrough(page, options.durationSeconds * 1000);

    await context.close();
    if (!video) throw new Error(`${productId} did not produce a Playwright video.`);
    await video.saveAs(outputPath);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  const stat = await fs.stat(outputPath);
  if (stat.size < 25_000) {
    throw new Error(`${productId} proof video is too small (${stat.size} bytes).`);
  }

  return {
    productId,
    outputPath,
    bytes: stat.size,
    recordedAt: new Date().toISOString(),
    reusedExisting: false,
  };
}

async function main() {
  const projectIds = readProjectIds();
  if (!projectIds.length) {
    throw new Error("Provide --project-ids=id1,id2.");
  }

  const baseUrl = readArg("base-url") || process.env.APP_PROOF_BASE_URL || "https://illcoai.tech";
  const durationSeconds = readPositiveInt("duration-seconds", 120);
  const suffix = readString("suffix", durationSeconds > 120 ? "real-walkthrough" : "proof");
  const force = readBoolean("force");
  const snapshot = await readSnapshot();
  const recorded = [];
  const skipped = [];

  for (const productId of projectIds) {
    try {
      const result = await recordProductProof(productId, { baseUrl, durationSeconds, force, suffix });
      snapshot.projects = snapshot.projects || {};
      snapshot.projects[productId] = {
        ...(snapshot.projects[productId] || {}),
        twoMinuteProofLocalVideoPath: result.outputPath,
        twoMinuteProofLocalVideoBytes: result.bytes,
        twoMinuteProofRecordedAt: result.recordedAt,
        twoMinuteProofDurationSeconds: durationSeconds,
        twoMinuteProofSourceUrl: new URL(`/apps/${encodeURIComponent(productId)}`, baseUrl).toString(),
        twoMinuteProofStatus: "recorded",
        twoMinuteProofAssembly: "real-command-app-walkthrough",
        twoMinuteProofReusedExisting: result.reusedExisting,
        updatedAt: result.recordedAt,
      };
      recorded.push(result);
      console.log(JSON.stringify({ event: "app-proof-recorded", ...result }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown recording error.";
      skipped.push({ productId, reason });
      console.log(JSON.stringify({ event: "app-proof-skipped", productId, reason }));
    }
  }

  snapshot.generatedAt = new Date().toISOString();
  await writeJsonAtomic(snapshotPath, snapshot);
  console.log(JSON.stringify({ event: "app-proof-complete", recorded: recorded.length, skipped: skipped.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
