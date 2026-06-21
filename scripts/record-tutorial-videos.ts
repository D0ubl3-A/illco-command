import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { chromium, type Browser, type Page } from "playwright";

import demoVideoSnapshot from "../data/demo-videos.json";
import healthSnapshot from "../data/project-health.json";
import monetizationSnapshot from "../data/monetization-plan.json";
import { products } from "../lib/deployments";

type Product = (typeof products)[number];
type HealthStatus = "healthy" | "degraded" | "offline" | "unknown";

type DemoVideoRecord = {
  tutorialYoutubeVideoId?: string | null;
  tutorialLocalVideoPath?: string | null;
  tutorialTranscriptPath?: string | null;
  tutorialCaptionPath?: string | null;
  tutorialManifestPath?: string | null;
  tutorialDurationSeconds?: number | null;
  tutorialIncludesCaptions?: boolean | null;
  tutorialIncludesHighlights?: boolean | null;
  tutorialIncludesNarration?: boolean | null;
  tutorialPacing?: string | null;
  tutorialSceneCount?: number | null;
  tutorialPacingFloorSeconds?: number | null;
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

type TutorialStep = {
  id: string;
  caption: string;
  narration: string;
  progress: number;
  dwellMs: number;
  highlight: TutorialHighlight;
};

type TutorialHighlight = {
  inset: string;
  color: string;
  captionPosition: "top" | "bottom";
};

type TutorialSceneOverride = Partial<Omit<TutorialStep, "highlight">> & {
  highlight?: Partial<TutorialHighlight>;
};

type TutorialSceneConfig = {
  scenes?: Record<string, TutorialSceneOverride>;
};

type TutorialPaths = {
  rawVideoPath: string;
  scriptPath: string;
  captionsPath: string;
  audioPath: string;
  outputVideoPath: string;
  manifestPath: string;
};

const execFileAsync = promisify(execFile);
const outputRoot = path.resolve(process.env.TUTORIAL_VIDEO_DIR || "artifacts/tutorial-videos");
const snapshotPath = path.resolve("data/demo-videos.json");
const ffmpegPath = path.resolve(
  process.env.FFMPEG_PATH || "D:/workspace/.tmp/ffmpeg/ffmpeg-8.0.1-essentials_build/bin/ffmpeg.exe",
);
const ffprobePath = path.resolve(
  process.env.FFPROBE_PATH || "D:/workspace/.tmp/ffmpeg/ffmpeg-8.0.1-essentials_build/bin/ffprobe.exe",
);
const minimumTutorialDurationSeconds = readPositiveInt("min-duration-seconds", "TUTORIAL_MIN_DURATION_SECONDS", 120);
const minimumSceneDwellMs = readPositiveInt("min-scene-ms", "TUTORIAL_MIN_SCENE_MS", 16_000);
const dwellMultiplier = readPositiveFloat("dwell-multiplier", "TUTORIAL_DWELL_MULTIPLIER", 1);
let cachedSceneConfig: TutorialSceneConfig | undefined;

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

function readPositiveFloat(name: string, envName: string, fallback: number) {
  const raw = readArg(name) ?? process.env[envName];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${envName} / --${name} must be a positive number.`);
  }
  return value;
}

function readBoolean(name: string, envName: string, fallback = false) {
  const raw = readArg(name) ?? process.env[envName];
  if (!raw) return fallback;
  return /^(1|true|yes)$/i.test(raw);
}

function readProjectIds() {
  const raw = readArg("project-ids") ?? readArg("projects") ?? process.env.TUTORIAL_PROJECT_IDS ?? "";
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

function isTutorialRecordComplete(record: DemoVideoRecord | undefined) {
  if (!record?.tutorialYoutubeVideoId) return false;
  if (!record.tutorialIncludesCaptions || !record.tutorialIncludesHighlights || !record.tutorialIncludesNarration) {
    return false;
  }
  if (record.tutorialPacing !== "slow") return false;
  return (record.tutorialDurationSeconds || 0) >= minimumTutorialDurationSeconds;
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

function asPositiveInt(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function asProgress(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : null;
}

function asCaptionPosition(value: unknown): TutorialHighlight["captionPosition"] | null {
  return value === "top" || value === "bottom" ? value : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSceneConfig(value: unknown): TutorialSceneConfig {
  if (!isRecord(value) || !isRecord(value.scenes)) return {};
  const scenes: Record<string, TutorialSceneOverride> = {};

  for (const [sceneId, rawScene] of Object.entries(value.scenes)) {
    if (!isRecord(rawScene)) continue;
    const override: TutorialSceneOverride = {};
    const caption = asString(rawScene.caption);
    const narration = asString(rawScene.narration);
    const progress = asProgress(rawScene.progress);
    const dwellMs = asPositiveInt(rawScene.dwellMs);
    const id = asString(rawScene.id);

    if (id) override.id = id;
    if (caption) override.caption = caption;
    if (narration) override.narration = narration;
    if (progress !== null) override.progress = progress;
    if (dwellMs !== null) override.dwellMs = dwellMs;

    if (isRecord(rawScene.highlight)) {
      const highlight: Partial<TutorialHighlight> = {};
      const inset = asString(rawScene.highlight.inset);
      const color = asString(rawScene.highlight.color);
      const captionPosition = asCaptionPosition(rawScene.highlight.captionPosition);
      if (inset) highlight.inset = inset;
      if (color) highlight.color = color;
      if (captionPosition) highlight.captionPosition = captionPosition;
      override.highlight = highlight;
    }

    scenes[sceneId] = override;
  }

  return { scenes };
}

async function readTutorialSceneConfig() {
  if (cachedSceneConfig) return cachedSceneConfig;
  const configPath = readArg("scene-config") ?? process.env.TUTORIAL_SCENE_CONFIG_PATH;
  if (!configPath) {
    cachedSceneConfig = {};
    return cachedSceneConfig;
  }

  const resolvedPath = path.resolve(configPath);
  const raw = await fs.readFile(resolvedPath, "utf8");
  cachedSceneConfig = normalizeSceneConfig(JSON.parse(raw));
  return cachedSceneConfig;
}

function applySceneConfig(step: TutorialStep, config: TutorialSceneConfig): TutorialStep {
  const override = config.scenes?.[step.id];
  if (!override) return step;
  return {
    ...step,
    ...override,
    progress: override.progress ?? step.progress,
    dwellMs: override.dwellMs ?? step.dwellMs,
    highlight: {
      ...step.highlight,
      ...override.highlight,
    },
  };
}

function applyPacingFloor(steps: TutorialStep[]) {
  const pacedSteps = steps.map((step) => ({
    ...step,
    dwellMs: Math.max(minimumSceneDwellMs, Math.round(step.dwellMs * dwellMultiplier)),
  }));
  const targetDurationMs = minimumTutorialDurationSeconds * 1000;
  const currentDurationMs = pacedSteps.reduce((total, step) => total + step.dwellMs, 0);
  if (currentDurationMs >= targetDurationMs) return pacedSteps;

  const extraPerStep = Math.ceil((targetDurationMs - currentDurationMs) / pacedSteps.length);
  return pacedSteps.map((step) => ({
    ...step,
    dwellMs: step.dwellMs + extraPerStep,
  }));
}

function tutorialSteps(product: Product, config: TutorialSceneConfig): TutorialStep[] {
  const appName = product.displayName;
  const baseSteps: TutorialStep[] = [
    {
      id: "welcome",
      caption: `Welcome to ${appName}`,
      narration: `Welcome to ${appName}. This tutorial moves slowly so you can see the live product and understand what the first screen is offering.`,
      progress: 0,
      dwellMs: 20_000,
      highlight: { inset: "82px 26px 132px", color: "rgba(255, 51, 85, 0.9)", captionPosition: "bottom" },
    },
    {
      id: "top-offer",
      caption: "First, read the top offer and main action.",
      narration: "First, look at the top of the page. The headline, primary action, and opening content tell you what this app is meant to do.",
      progress: 0.18,
      dwellMs: 28_000,
      highlight: { inset: "96px 34px 400px", color: "rgba(68, 215, 255, 0.95)", captionPosition: "bottom" },
    },
    {
      id: "core-workflow",
      caption: "Next, review the middle of the workflow.",
      narration: "Next, we move down slowly. This section usually shows the core workflow, features, proof, or the product interface customers will use.",
      progress: 0.45,
      dwellMs: 32_000,
      highlight: { inset: "150px 46px 170px", color: "rgba(255, 214, 102, 0.95)", captionPosition: "bottom" },
    },
    {
      id: "conversion-output",
      caption: "Then, check the conversion or output area.",
      narration: "Now we continue to the lower part of the page. Watch for forms, output panels, examples, pricing, or the next step a customer should take.",
      progress: 0.72,
      dwellMs: 32_000,
      highlight: { inset: "130px 44px 184px", color: "rgba(76, 238, 162, 0.95)", captionPosition: "top" },
    },
    {
      id: "wrap-up",
      caption: `${appName} is a working ILLCO route.`,
      narration: `That is the complete first-pass walkthrough for ${appName}. The route passed the latest health gate, and ILLCO Command keeps it available for reviewed setup and customer access.`,
      progress: 1,
      dwellMs: 24_000,
      highlight: { inset: "118px 38px 150px", color: "rgba(255, 255, 255, 0.92)", captionPosition: "top" },
    },
  ];
  return applyPacingFloor(baseSteps.map((step) => applySceneConfig(step, config)));
}

async function installTutorialOverlay(page: Page, product: Product) {
  await page.addStyleTag({
    content: `
      #illcoTutorialOverlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: none;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #illcoTutorialOverlay .illcoTop {
        position: absolute;
        top: 18px;
        left: 18px;
        right: 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      #illcoTutorialOverlay .illcoBadge,
      #illcoTutorialOverlay .illcoTimer {
        min-height: 36px;
        display: inline-flex;
        align-items: center;
        padding: 0 12px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 8px;
        background: rgba(6, 8, 12, 0.82);
        color: #fff;
        font-size: 13px;
        font-weight: 850;
        box-shadow: 0 14px 45px rgba(0,0,0,0.32);
        backdrop-filter: blur(14px);
      }
      #illcoTutorialOverlay .illcoCaption {
        position: absolute;
        left: 50%;
        width: min(980px, calc(100vw - 42px));
        transform: translateX(-50%);
        padding: 18px 22px;
        border: 1px solid rgba(68, 215, 255, 0.42);
        border-radius: 8px;
        background: rgba(5, 8, 12, 0.88);
        color: #fff;
        font-size: clamp(25px, 2.7vw, 34px);
        font-weight: 900;
        line-height: 1.12;
        text-align: center;
        text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        box-shadow: 0 22px 65px rgba(0,0,0,0.45), 0 0 0 4px rgba(68, 215, 255, 0.08);
        backdrop-filter: blur(18px);
      }
      #illcoTutorialOverlay .illcoCaption[data-position="bottom"] {
        bottom: 34px;
      }
      #illcoTutorialOverlay .illcoCaption[data-position="top"] {
        top: 76px;
      }
      #illcoTutorialOverlay .illcoFocus {
        position: absolute;
        inset: 82px 26px 132px;
        border: 3px solid rgba(255, 51, 85, 0.9);
        border-radius: 12px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.08), 0 0 38px rgba(255,51,85,0.32);
      }
    `,
  });
  await page.evaluate((displayName) => {
    const overlay = document.createElement("div");
    overlay.id = "illcoTutorialOverlay";
    overlay.innerHTML = `
      <div class="illcoTop">
        <div class="illcoBadge">ILLCO Command tutorial: ${displayName}</div>
        <div class="illcoTimer">Slow walkthrough</div>
      </div>
      <div class="illcoFocus"></div>
      <div class="illcoCaption" data-position="bottom">Loading tutorial...</div>
    `;
    document.body.appendChild(overlay);
  }, product.displayName);
}

async function setTutorialStep(page: Page, step: TutorialStep) {
  await page.evaluate((nextStep) => {
    const captionNode = document.querySelector("#illcoTutorialOverlay .illcoCaption");
    if (captionNode instanceof HTMLElement) {
      captionNode.textContent = nextStep.caption;
      captionNode.dataset.position = nextStep.highlight.captionPosition;
    }
    const focusNode = document.querySelector("#illcoTutorialOverlay .illcoFocus");
    if (focusNode instanceof HTMLElement) {
      focusNode.style.inset = nextStep.highlight.inset;
      focusNode.style.borderColor = nextStep.highlight.color;
      focusNode.style.boxShadow = `0 0 0 9999px rgba(0,0,0,0.08), 0 0 38px ${nextStep.highlight.color}`;
    }
  }, step);
}

async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate((nextProgress) => {
    const maxTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    window.scrollTo({ top: maxTop * nextProgress, behavior: "smooth" });
  }, progress);
}

async function assertPageUsable(product: Product, page: Page) {
  if (!product.productionUrl) throw new Error(`${product.id} does not have a production URL.`);
  const response = await page.goto(product.productionUrl, {
    waitUntil: "domcontentloaded",
    timeout: readPositiveInt("nav-timeout-ms", "TUTORIAL_NAV_TIMEOUT_MS", 40_000),
  });

  const status = response?.status() || 0;
  if (!response || status >= 400) {
    throw new Error(`${product.id} returned HTTP ${status || "no-response"} at ${product.productionUrl}.`);
  }

  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  const visibleText = await page.locator("body").innerText({ timeout: 6_000 }).catch(() => "");
  if (visibleText.replace(/\s+/g, "").length < 40) {
    throw new Error(`${product.id} did not render enough visible content to record.`);
  }
}

function narrationText(product: Product, steps: TutorialStep[]) {
  return [
    `${product.displayName} full tutorial.`,
    ...steps.map((step) => step.narration),
    "End of tutorial.",
  ].join("\n\n");
}

function srtTimestamp(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const ms = Math.floor((seconds - whole) * 1000);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function captionFile(steps: TutorialStep[]) {
  let cursor = 0.7;
  return steps
    .map((step, index) => {
      const duration = Math.max(4, step.dwellMs / 1000 - 0.6);
      const start = cursor;
      const end = cursor + duration;
      cursor += step.dwellMs / 1000;
      return `${index + 1}\n${srtTimestamp(start)} --> ${srtTimestamp(end)}\n${step.caption}\n`;
    })
    .join("\n");
}

function sceneTimeline(steps: TutorialStep[]) {
  let cursor = 0.7;
  return steps.map((step, index) => {
    const duration = Math.max(4, step.dwellMs / 1000 - 0.6);
    const startSeconds = cursor;
    const endSeconds = cursor + duration;
    cursor += step.dwellMs / 1000;
    return {
      index: index + 1,
      id: step.id,
      caption: step.caption,
      narration: step.narration,
      progress: step.progress,
      dwellMs: step.dwellMs,
      startSeconds: Number(startSeconds.toFixed(3)),
      endSeconds: Number(endSeconds.toFixed(3)),
      highlight: step.highlight,
    };
  });
}

function tutorialManifest(product: Product, paths: TutorialPaths, steps: TutorialStep[], durationSeconds: number | null) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    productId: product.id,
    displayName: product.displayName,
    productionUrl: product.productionUrl,
    pacing: {
      label: "slow",
      minimumDurationSeconds: minimumTutorialDurationSeconds,
      minimumSceneDwellMs,
      dwellMultiplier,
      actualDurationSeconds: durationSeconds,
    },
    assets: {
      rawVideoPath: paths.rawVideoPath,
      outputVideoPath: paths.outputVideoPath,
      narrationScriptPath: paths.scriptPath,
      narrationAudioPath: paths.audioPath,
      captionsPath: paths.captionsPath,
    },
    scenes: sceneTimeline(steps),
  };
}

async function synthesizeNarration(scriptPath: string, outputWavPath: string) {
  const command = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    [
      "Add-Type -AssemblyName System.Speech;",
      `$text = Get-Content -Raw -LiteralPath '${scriptPath.replace(/'/g, "''")}';`,
      "$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer;",
      "$speaker.Rate = -3;",
      "$speaker.Volume = 95;",
      `$speaker.SetOutputToWaveFile('${outputWavPath.replace(/'/g, "''")}');`,
      "$speaker.Speak($text);",
      "$speaker.Dispose();",
    ].join(" "),
  ];
  await execFileAsync("powershell.exe", command, { timeout: 180_000 });
}

async function muxTutorial(rawVideoPath: string, audioPath: string, outputVideoPath: string) {
  await execFileAsync(
    ffmpegPath,
    [
      "-y",
      "-i",
      rawVideoPath,
      "-i",
      audioPath,
      "-filter_complex",
      "[1:a]adelay=700:all=1,apad[a]",
      "-map",
      "0:v:0",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      "-shortest",
      outputVideoPath,
    ],
    { timeout: 240_000 },
  );
}

async function probeDuration(filePath: string) {
  const { stdout } = await execFileAsync(
    ffprobePath,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
    { timeout: 30_000 },
  );
  const duration = Number(String(stdout).trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Unable to determine duration for ${filePath}.`);
  }
  return duration;
}

async function recordTutorial(browser: Browser, product: Product, force: boolean) {
  if (!product.productionUrl) throw new Error(`${product.id} does not have a production URL.`);

  const productDir = path.join(outputRoot, product.id);
  const paths: TutorialPaths = {
    rawVideoPath: path.join(productDir, `${product.id}.raw.webm`),
    scriptPath: path.join(productDir, `${product.id}.narration.txt`),
    captionsPath: path.join(productDir, `${product.id}.captions.srt`),
    audioPath: path.join(productDir, `${product.id}.narration.wav`),
    outputVideoPath: path.join(productDir, `${product.id}.tutorial.mp4`),
    manifestPath: path.join(productDir, `${product.id}.tutorial.json`),
  };
  const sceneConfig = await readTutorialSceneConfig();
  const steps = tutorialSteps(product, sceneConfig);
  await fs.mkdir(productDir, { recursive: true });
  await fs.writeFile(paths.scriptPath, narrationText(product, steps));
  await fs.writeFile(paths.captionsPath, captionFile(steps));
  await writeJsonAtomic(paths.manifestPath, tutorialManifest(product, paths, steps, null));

  if (!force) {
    const existing = await fs.stat(paths.outputVideoPath).catch(() => null);
    if (existing && existing.size > 250_000) {
      const durationSeconds = await probeDuration(paths.outputVideoPath);
      if (durationSeconds >= minimumTutorialDurationSeconds) {
        await writeJsonAtomic(paths.manifestPath, tutorialManifest(product, paths, steps, durationSeconds));
        return {
          outputVideoPath: paths.outputVideoPath,
          scriptPath: paths.scriptPath,
          captionsPath: paths.captionsPath,
          manifestPath: paths.manifestPath,
          durationSeconds,
          sceneCount: steps.length,
          reusedExisting: true,
        };
      }
    }
  }

  const tempDir = path.join(productDir, ".tmp", `${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: tempDir, size: { width: 1440, height: 900 } },
    userAgent: "ILLCO Command full tutorial recorder (Playwright)",
  });
  const page = await context.newPage();
  const video = page.video();

  try {
    await assertPageUsable(product, page);
    await installTutorialOverlay(page, product);
    await page.waitForTimeout(2_000);

    for (const step of steps) {
      await setTutorialStep(page, step);
      await scrollToProgress(page, step.progress);
      await page.waitForTimeout(step.dwellMs);
    }

    await context.close();
    if (!video) throw new Error(`${product.id} did not produce a Playwright video handle.`);
    await video.saveAs(paths.rawVideoPath);
  } finally {
    await context.close().catch(() => undefined);
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  await synthesizeNarration(paths.scriptPath, paths.audioPath);
  await muxTutorial(paths.rawVideoPath, paths.audioPath, paths.outputVideoPath);

  const stat = await fs.stat(paths.outputVideoPath);
  if (stat.size < 250_000) {
    throw new Error(`${product.id} tutorial output was too small (${stat.size} bytes).`);
  }

  const durationSeconds = await probeDuration(paths.outputVideoPath);
  if (durationSeconds < minimumTutorialDurationSeconds) {
    throw new Error(`${product.id} tutorial was ${Math.round(durationSeconds)}s; minimum full-length tutorial duration is ${minimumTutorialDurationSeconds}s.`);
  }

  await writeJsonAtomic(paths.manifestPath, tutorialManifest(product, paths, steps, durationSeconds));
  return {
    outputVideoPath: paths.outputVideoPath,
    scriptPath: paths.scriptPath,
    captionsPath: paths.captionsPath,
    manifestPath: paths.manifestPath,
    durationSeconds,
    sceneCount: steps.length,
    reusedExisting: false,
  };
}

async function main() {
  const limit = readPositiveInt("limit", "TUTORIAL_RECORD_LIMIT", 0);
  const force = readBoolean("force", "TUTORIAL_RECORD_FORCE");
  const projectIds = readProjectIds();
  const snapshot = await readSnapshot();
  const nextProjects = { ...snapshot.projects };
  const skipped: Array<{ productId: string; reason: string }> = [];
  const recorded: Array<{ productId: string; file: string; durationSeconds: number }> = [];

  const candidates = products.filter((product) => {
    if (projectIds.size > 0 && !projectIds.has(product.id) && !projectIds.has(product.name)) return false;
    if (!product.productionUrl) {
      skipped.push({ productId: product.id, reason: "missing-production-url" });
      return false;
    }
    if (isTutorialRecordComplete(nextProjects[product.id])) {
      skipped.push({ productId: product.id, reason: "tutorial-youtube-video-exists" });
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

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    for (const product of selected) {
      try {
        const result = await recordTutorial(browser, product, force);
        const now = new Date().toISOString();
        nextProjects[product.id] = {
          ...nextProjects[product.id],
          title: nextProjects[product.id]?.title || `${product.displayName} tutorial | ILLCO Command`,
          source: nextProjects[product.id]?.source || "manual",
          updatedAt: now,
          projectId: product.id,
          productionUrl: product.productionUrl,
          tutorialTitle: `${product.displayName} full tutorial | ILLCO Command`,
          tutorialLocalVideoPath: result.outputVideoPath,
          tutorialTranscriptPath: result.scriptPath,
          tutorialCaptionPath: result.captionsPath,
          tutorialManifestPath: result.manifestPath,
          tutorialDurationSeconds: Math.round(result.durationSeconds),
          tutorialUpdatedAt: now,
          tutorialIncludesCaptions: true,
          tutorialIncludesHighlights: true,
          tutorialIncludesNarration: true,
          tutorialPacing: "slow",
          tutorialSceneCount: result.sceneCount,
          tutorialPacingFloorSeconds: Math.round(minimumSceneDwellMs / 1000),
        };
        recorded.push({ productId: product.id, file: result.outputVideoPath, durationSeconds: Math.round(result.durationSeconds) });
        await writeJsonAtomic(snapshotPath, { ...snapshot, generatedAt: now, projects: nextProjects });
        console.log(JSON.stringify({ event: "tutorial-recorded", productId: product.id, file: result.outputVideoPath, durationSeconds: Math.round(result.durationSeconds) }));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        skipped.push({ productId: product.id, reason });
        console.log(JSON.stringify({ event: "tutorial-record-skipped", productId: product.id, reason }));
      }
    }
  } finally {
    await browser?.close().catch(() => undefined);
  }

  await writeJsonAtomic(path.join(outputRoot, "recorded.json"), {
    generatedAt: new Date().toISOString(),
    recorded,
    skipped,
  });
  await writeJsonAtomic(snapshotPath, { ...snapshot, generatedAt: new Date().toISOString(), projects: nextProjects });
  console.log(JSON.stringify({ event: "tutorial-record-complete", recorded: recorded.length, skipped: skipped.length }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "tutorial-record-failed", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
