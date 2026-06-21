import fs from "node:fs/promises";
import path from "node:path";

import { chromium, type Browser, type Page } from "playwright";

import healthSnapshot from "../data/project-health.json";
import monetizationSnapshot from "../data/monetization-plan.json";
import { products } from "../lib/deployments";

type Product = (typeof products)[number];
type HealthStatus = "healthy" | "degraded" | "offline" | "unknown";

type DemoVideoRecord = {
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  embedUrl?: string | null;
  title?: string | null;
  source?: "youtube-search" | "uploaded" | "manual";
  updatedAt?: string;
  [key: string]: unknown;
};

type DemoVideoSnapshot = {
  generatedAt: string | null;
  projects: Record<string, DemoVideoRecord>;
  [key: string]: unknown;
};

type MonetizationSnapshot = {
  products?: Record<string, {
    publicInFunnel?: boolean;
    healthGate?: {
      behavior?: string;
    };
  }>;
};

type RecordedVideo = {
  productId: string;
  displayName: string;
  productionUrl: string;
  file: string;
  bytes: number;
  recordedAt: string;
  reusedExisting: boolean;
};

const outputRoot = path.resolve(process.env.DEMO_VIDEO_DIR || "artifacts/demo-videos");
const snapshotPath = path.resolve("data/demo-videos.json");
const minVideoBytes = readPositiveInt("min-bytes", "DEMO_RECORD_MIN_BYTES", 25_000);

function readArg(name: string) {
  const prefix = `--${name}=`;
  const exact = `--${name}`;
  const index = process.argv.findIndex((arg) => arg === exact || arg.startsWith(prefix));
  if (index === -1) return null;
  const current = process.argv[index];
  if (current.startsWith(prefix)) return current.slice(prefix.length);
  return process.argv[index + 1] && !process.argv[index + 1].startsWith("--") ? process.argv[index + 1] : "true";
}

function readPositiveInt(name: string, envName: string, fallback: number) {
  const raw = readArg(name) ?? process.env[envName];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${envName} / --${name} must be a non-negative number.`);
  }
  return Math.floor(value);
}

function readBoolean(name: string, envName: string, fallback = false) {
  const raw = readArg(name) ?? process.env[envName];
  if (!raw) return fallback;
  return /^(1|true|yes)$/i.test(raw);
}

function readProjectIds() {
  const raw = readArg("project-ids") ?? readArg("projects") ?? process.env.DEMO_PROJECT_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getHealthStatus(productId: string): HealthStatus {
  const projects = (healthSnapshot as { projects?: Record<string, { status?: HealthStatus }> }).projects || {};
  return projects[productId]?.status || "unknown";
}

function isHealthyPublicFunnelProduct(productId: string) {
  const plan = (monetizationSnapshot as MonetizationSnapshot).products?.[productId];
  return Boolean(plan?.publicInFunnel && plan.healthGate?.behavior === "allow-checkout");
}

async function readSnapshot(): Promise<DemoVideoSnapshot> {
  const raw = await fs.readFile(snapshotPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "{\"generatedAt\":null,\"projects\":{}}";
    throw error;
  });
  const parsed = JSON.parse(raw) as Partial<DemoVideoSnapshot>;
  return {
    ...parsed,
    generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : null,
    projects: isRecord(parsed.projects) ? (parsed.projects as Record<string, DemoVideoRecord>) : {},
  };
}

async function writeJsonAtomic(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2));
  await fs.rename(tempPath, filePath);
}

async function fileStat(filePath: string) {
  return fs.stat(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
}

async function assertPageUsable(product: Product, page: Page) {
  if (!product.productionUrl) throw new Error(`${product.id} does not have a production URL.`);
  const response = await page.goto(product.productionUrl, {
    waitUntil: "domcontentloaded",
    timeout: readPositiveInt("nav-timeout-ms", "DEMO_RECORD_NAV_TIMEOUT_MS", 35_000),
  });

  const status = response?.status() || 0;
  if (!response || status >= 400) {
    throw new Error(`${product.id} returned HTTP ${status || "no-response"} at ${product.productionUrl}.`);
  }

  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  const visibleText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  if (visibleText.replace(/\s+/g, "").length < 40) {
    throw new Error(`${product.id} did not render enough visible content to record.`);
  }
}

async function driveProductDemo(page: Page) {
  const settleMs = readPositiveInt("settle-ms", "DEMO_RECORD_SETTLE_MS", 2_000);
  const stepMs = readPositiveInt("step-ms", "DEMO_RECORD_STEP_MS", 1_250);
  const scrollSteps = Math.max(readPositiveInt("scroll-steps", "DEMO_RECORD_SCROLL_STEPS", 4), 1);

  await page.waitForTimeout(settleMs);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" })).catch(() => undefined);
  await page.waitForTimeout(stepMs);

  for (let index = 1; index <= scrollSteps; index += 1) {
    await page.evaluate(
      (progress) => {
        const maxTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
        window.scrollTo({ top: maxTop * progress, behavior: "smooth" });
      },
      index / scrollSteps,
    );
    await page.waitForTimeout(stepMs);
  }
}

async function recordProduct(browser: Browser, product: Product, force: boolean): Promise<RecordedVideo> {
  if (!product.productionUrl) throw new Error(`${product.id} does not have a production URL.`);

  const finalPath = path.join(outputRoot, `${product.id}.webm`);
  const existingStat = await fileStat(finalPath);
  if (existingStat && existingStat.size >= minVideoBytes && !force) {
    return {
      productId: product.id,
      displayName: product.displayName,
      productionUrl: product.productionUrl,
      file: finalPath,
      bytes: existingStat.size,
      recordedAt: new Date(existingStat.mtimeMs).toISOString(),
      reusedExisting: true,
    };
  }

  const tempDir = path.join(outputRoot, ".tmp", `${product.id}-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: tempDir, size: { width: 1440, height: 900 } },
    userAgent: "ILLCO Command demo recorder (Playwright)",
  });
  const page = await context.newPage();
  const video = page.video();

  try {
    await assertPageUsable(product, page);
    await driveProductDemo(page);
    await context.close();

    if (!video) throw new Error(`${product.id} did not produce a Playwright video handle.`);
    await fs.mkdir(outputRoot, { recursive: true });
    await video.saveAs(finalPath);
  } finally {
    await context.close().catch(() => undefined);
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  const finalStat = await fs.stat(finalPath);
  if (finalStat.size < minVideoBytes) {
    await fs.rm(finalPath, { force: true });
    throw new Error(`${product.id} recording was too small (${finalStat.size} bytes).`);
  }

  return {
    productId: product.id,
    displayName: product.displayName,
    productionUrl: product.productionUrl,
    file: finalPath,
    bytes: finalStat.size,
    recordedAt: new Date().toISOString(),
    reusedExisting: false,
  };
}

async function main() {
  const limit = readPositiveInt("limit", "DEMO_RECORD_LIMIT", 0);
  const dryRun = readBoolean("dry-run", "DEMO_RECORD_DRY_RUN");
  const force = readBoolean("force", "DEMO_RECORD_FORCE");
  const projectIds = readProjectIds();
  const snapshot = await readSnapshot();
  const nextProjects = { ...snapshot.projects };
  const skipped: Array<{ productId: string; reason: string }> = [];
  const recorded: RecordedVideo[] = [];

  const candidates = products.filter((product) => {
    if (projectIds.size > 0 && !projectIds.has(product.id) && !projectIds.has(product.name)) return false;
    if (!product.productionUrl) {
      skipped.push({ productId: product.id, reason: "missing-production-url" });
      return false;
    }
    if (snapshot.projects[product.id]?.youtubeVideoId) {
      skipped.push({ productId: product.id, reason: "youtube-video-exists" });
      return false;
    }
    if (!isHealthyPublicFunnelProduct(product.id)) {
      skipped.push({ productId: product.id, reason: "not-healthy-public-funnel-product" });
      return false;
    }
    const healthStatus = getHealthStatus(product.id);
    if (healthStatus !== "healthy") {
      skipped.push({ productId: product.id, reason: `health-${healthStatus}` });
      return false;
    }
    return true;
  });
  const selected = limit > 0 ? candidates.slice(0, limit) : candidates;

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          event: "demo-record-dry-run",
          selected: selected.map((product) => ({ productId: product.id, url: product.productionUrl })),
          skipped,
        },
        null,
        2,
      ),
    );
    return;
  }

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    for (const product of selected) {
      try {
        const result = await recordProduct(browser, product, force);
        recorded.push(result);
        const now = new Date().toISOString();
        nextProjects[product.id] = {
          ...nextProjects[product.id],
          title: nextProjects[product.id]?.title || `${product.displayName} demo | ILLCO Command`,
          source: nextProjects[product.id]?.source || "manual",
          updatedAt: now,
          projectId: product.id,
          productionUrl: product.productionUrl,
          localVideoPath: result.file,
          localVideoBytes: result.bytes,
          localVideoRecordedAt: result.recordedAt,
        };
        await writeJsonAtomic(snapshotPath, { ...snapshot, generatedAt: now, projects: nextProjects });
        console.log(JSON.stringify({ event: "demo-recorded", productId: product.id, file: result.file, bytes: result.bytes }));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        skipped.push({ productId: product.id, reason });
        console.log(JSON.stringify({ event: "demo-record-skipped", productId: product.id, reason }));
      }
    }
  } finally {
    await browser?.close().catch(() => undefined);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    videoRoot: outputRoot,
    recorded,
    skipped,
  };
  await writeJsonAtomic(path.join(outputRoot, "recorded.json"), manifest);
  await writeJsonAtomic(snapshotPath, { ...snapshot, generatedAt: new Date().toISOString(), projects: nextProjects });
  console.log(JSON.stringify({ event: "demo-record-complete", recorded: recorded.length, skipped: skipped.length }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "demo-record-failed", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
