import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import sharp from "sharp";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.join(root, "artifacts", "tutorial-videos", `illco-combined-demo-${stamp}`);
const framesDir = path.join(outDir, "frames");
const rawDir = path.join(outDir, "raw");
const audioDir = path.join(outDir, "audio");
const baseUrl = process.env.ILLCO_DEMO_BASE_URL || "https://www.illcoai.tech";
const ffmpeg = process.env.FFMPEG_PATH || "D:\\Downloads\\ffmpeg\\ffmpeg-8.1-essentials_build\\bin\\ffmpeg.exe";
const ffprobe = process.env.FFPROBE_PATH || "D:\\Downloads\\ffmpeg\\ffmpeg-8.1-essentials_build\\bin\\ffprobe.exe";
const browserExecutable =
  process.env.BROWSER_EXECUTABLE_PATH ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const width = 1920;
const height = 1080;
const poseFramesPerScene = 8;

const scenes = [
  {
    slug: "hero",
    url: "/",
    selector: ".appStoreHeroCopy",
    title: "ILLCO AI App Store",
    label: "Company hub",
    narration:
      "This is the front door for Illco AI. The strategy is simple: keep the company as the hub, then let every app, forge, and creator tool plug into one public marketplace. The visitor sees a premium app store instead of a scattered pile of prototypes.",
  },
  {
    slug: "google-login",
    url: "/",
    selector: "a[href*='/api/account/google/start']",
    title: "Google Sign-In",
    label: "Identity layer",
    narration:
      "The Google sign-in button is not just a login button. It is the identity layer for the whole platform. Creator tools can stay separate, but the account, purchase record, and access check should come back through this hub.",
  },
  {
    slug: "account",
    url: "/",
    selector: "a[href*='/account']",
    title: "Manage Account",
    label: "Account hub",
    narration:
      "The manage account path is where the platform becomes durable. Buyers need a place to return, see purchases, manage subscriptions, and unlock apps. That is what turns demos into a real software business.",
  },
  {
    slug: "nav",
    url: "/",
    selector: ".appStoreNav",
    title: "Transferred Menu",
    label: "Clean navigation",
    narration:
      "The old header menu is removed from the home page. The important routes now live inside the app-store navigation: apps, ChatGPT tooling, Commander, status, Skip proof, blog, custom build, and support.",
  },
  {
    slug: "status",
    url: "/#creator-status",
    selector: "#creator-status",
    title: "Creator Pipeline Status",
    label: "Built versus next",
    narration:
      "This section tells the truth about what is already built. VoiceBook OS, Vocal Visualizer, and Viral Stitch are product pieces. Lyric Video Forge and Meme Forge stay stable as focused forges inside the larger creator pipeline.",
  },
  {
    slug: "voicebook",
    url: "/#catalog",
    prepare: "search:VoiceBook OS",
    text: "VoiceBook OS",
    title: "VoiceBook OS",
    label: "Flagship product",
    narration:
      "VoiceBook OS is the flagship. The purpose is to turn spoken ideas into scripts, videos, shorts, captions, branded assets, and memory-backed creator workflows. This is the product investors and buyers can remember.",
  },
  {
    slug: "vocal-visualizer",
    url: "/#catalog",
    prepare: "search:Vocal Visualizer",
    text: "Vocal Visualizer",
    title: "Vocal Visualizer",
    label: "Voice-reactive visuals",
    narration:
      "Vocal Visualizer gives the voice pipeline a visual product lane. Hooks, vocals, and spoken clips can become branded motion assets. This belongs beside VoiceBook OS because it makes audio visible and sellable.",
  },
  {
    slug: "viral-stitch",
    url: "/#catalog",
    prepare: "search:Viral Stitch AI",
    text: "Viral Stitch AI",
    title: "Viral Stitch AI",
    label: "Short-form engine",
    narration:
      "Viral Stitch AI is the short-form engine. It takes creator clips, testimonials, and proof assets and turns them into faster social variants. This supports the acquisition story because distribution is part of the pipeline.",
  },
  {
    slug: "lyric-video-forge-card",
    url: "/#catalog",
    prepare: "search:Full HD Lyric Videos",
    text: "Full HD Lyric Videos",
    title: "Lyric Video Forge",
    label: "Stable forge",
    narration:
      "Lyric Video Forge stays as its own specialized product. It should not be broken or swallowed by the flagship. It proves Illco AI can ship creator tools around real music, captions, timing, and release-ready video assets.",
  },
  {
    slug: "meme-forge",
    url: "/tools/meme-mcp-server",
    text: "Meme",
    title: "Meme Forge",
    label: "Content traffic engine",
    narration:
      "Meme Forge stays separate too. Its purpose is viral ideation: meme concepts, captions, variants, and content hooks. In the platform strategy, this becomes a traffic and testing engine for products and creator campaigns.",
  },
  {
    slug: "categories",
    url: "/#categories",
    selector: ".appStoreCategoryGrid",
    title: "Category Filters",
    label: "Buyer paths",
    narration:
      "The category cards make the site easier to buy from. Instead of forcing everyone through one product, users can self-select: command tools, lead recovery, workflow automation, music, video, commerce, app conversion, or voice and memory.",
  },
  {
    slug: "search",
    url: "/#catalog",
    selector: ".appStoreSearchGroup",
    title: "Catalog Search",
    label: "Fast discovery",
    narration:
      "Search is for speed. When the catalog grows, buyers need to find the exact tool they came for. This makes the app store feel operational instead of decorative.",
  },
  {
    slug: "sort",
    url: "/#catalog",
    selector: ".appStoreSelectWrap",
    title: "Sort Control",
    label: "Decision support",
    narration:
      "Sorting gives buyers control. Featured, price, and name sorting are small details, but they signal that this is a real catalog with comparison logic, not just a landing page.",
  },
  {
    slug: "cart",
    url: "/#catalog",
    prepare: "cart:VoiceBook OS",
    selector: ".appStoreCartPanel",
    title: "Build Stack Cart",
    label: "Quote path",
    narration:
      "The build stack cart lets a buyer collect tools, estimate the package, and request a quote. This matters because custom AI work often starts as a bundle, not a single impulse purchase.",
  },
  {
    slug: "skip-proof",
    url: "/#skip-proof",
    selector: "#skip-proof",
    title: "Helloskip Proof",
    label: "External trust",
    narration:
      "The Helloskip proof layer is for public trust and discovery. Skip can bring attention and marketplace credibility, while Illco AI keeps conversion, accounts, checkout, and deeper product pages under its own brand.",
  },
  {
    slug: "skip-blog",
    url: "/#skip-blog",
    selector: "#skip-blog",
    title: "Skip Blog Engine",
    label: "Search fuel",
    narration:
      "The Skip blog archive becomes search fuel. Those articles can turn into topic clusters, product hooks, email follow-up, and authority signals that support the Illco AI site.",
  },
  {
    slug: "lyric-tool",
    url: "/tools/lyric-video-forge",
    text: "Lyric Video Forge",
    title: "Lyric Video Forge Tool",
    label: "Creator production",
    narration:
      "The dedicated Lyric Video Forge route is a production surface. It belongs in the creator pipeline because artists need synced lyrics, visual direction, caption assets, and release-ready video workflows.",
  },
  {
    slug: "commander",
    url: "/commander",
    text: "Commander",
    title: "Commander",
    label: "Operations layer",
    narration:
      "Commander is the operations layer. The app store sells and explains. Commander helps run the system, manage apps, and keep the product family organized as it grows.",
  },
  {
    slug: "products",
    url: "/products",
    text: "Products",
    title: "Products Directory",
    label: "Full app inventory",
    narration:
      "The products directory is the broader inventory. This is where the hub-and-spoke structure matters: many tools can exist, but they should still connect back to one account, one brand, and one buying path.",
  },
  {
    slug: "support",
    url: "/#support",
    selector: "#support",
    title: "Concierge Build Desk",
    label: "Custom revenue lane",
    narration:
      "The support and custom-build section is the high-touch revenue lane. Packaged tools are fast, but custom stacks, migrations, and admin setups can become larger projects.",
  },
  {
    slug: "final-strategy",
    url: "/",
    selector: ".appStoreHero",
    title: "Acquisition Path",
    label: "Creator-first AI pipelines",
    narration:
      "The complete strategy is this: Illco AI does not need to beat the giants as a general AI company. It can win a creator-first niche that giants ignore. Voice becomes content. Content becomes videos, memes, lyrics, shorts, offers, and distribution. The hub owns accounts and access. The forges stay focused. The app store turns the system into something buyers can understand.",
  },
];

function esc(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(text, max = 48) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function ensureDirs() {
  await fs.mkdir(framesDir, { recursive: true });
  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });
  await fs.mkdir(path.join(outDir, "tmp"), { recursive: true });
  process.env.TMP = path.join(outDir, "tmp");
  process.env.TEMP = path.join(outDir, "tmp");
}

async function findTextBox(page, text) {
  return page.evaluate((needle) => {
    const wanted = needle.toLowerCase();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let best = null;
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (!(el instanceof HTMLElement)) continue;
      const content = (el.innerText || el.textContent || "").trim();
      if (!content || !content.toLowerCase().includes(wanted)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) continue;
      const area = rect.width * rect.height;
      if (!best || area < best.area) {
        best = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, area };
      }
    }
    return best;
  }, text);
}

async function findSelectorBox(page, selector) {
  const element = await page.$(selector);
  if (!element) return null;
  return element.boundingBox();
}

async function applyPrepare(page, prepare) {
  if (!prepare) return;
  if (prepare.startsWith("search:")) {
    const term = prepare.slice("search:".length);
    const input = await page.$("#searchInput, input[type='search'], .appStoreSearchGroup input");
    if (input) {
      await input.fill(term);
      await page.waitForTimeout(600);
    }
    const box = await findTextBox(page, term);
    if (box) {
      await page.evaluate(({ y }) => window.scrollBy({ top: y - 220, behavior: "instant" }), box);
      await page.waitForTimeout(400);
    }
  }

  if (prepare.startsWith("cart:")) {
    const term = prepare.slice("cart:".length);
    const input = await page.$("#searchInput, input[type='search'], .appStoreSearchGroup input");
    if (input) {
      await input.fill(term);
      await page.waitForTimeout(500);
    }
    const addButton = await page.locator("button", { hasText: "Add to cart" }).first();
    if (await addButton.count()) {
      await addButton.click();
      await page.waitForTimeout(500);
    }
  }
}

async function captureFrames() {
  const launchOptions = {
    headless: true,
    args: [
      `--disk-cache-dir=${path.join(outDir, "edge-cache")}`,
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  };
  if (await fileExists(browserExecutable)) {
    launchOptions.executablePath = browserExecutable;
  }
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const metadata = [];

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const url = scene.url.startsWith("http") ? scene.url : `${baseUrl}${scene.url}`;
    let box = null;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1400);
      await applyPrepare(page, scene.prepare);

      box = scene.selector ? await findSelectorBox(page, scene.selector) : null;
      if (!box && scene.text) box = await findTextBox(page, scene.text);
      if (box) {
        await page.evaluate(({ y }) => window.scrollBy({ top: y - 260, behavior: "instant" }), box);
        await page.waitForTimeout(450);
        box = scene.selector ? await findSelectorBox(page, scene.selector) : await findTextBox(page, scene.text);
      }
    } catch (error) {
      await page.setContent(
        `<main style="width:1920px;height:1080px;margin:0;display:grid;place-items:center;background:#050912;color:#eef4ff;font-family:Aptos,Segoe UI,Arial">
          <section style="width:1320px;padding:80px;border:1px solid rgba(92,241,255,.25);background:rgba(8,14,24,.92)">
            <p style="color:#5cf1ff;text-transform:uppercase;letter-spacing:.28em;font-weight:800">Fallback capture</p>
            <h1 style="font-size:96px;line-height:.9;margin:0 0 28px;text-transform:uppercase">${esc(scene.title)}</h1>
            <p style="font-size:34px;line-height:1.35;color:#cbd7ea">${esc(scene.narration)}</p>
          </section>
        </main>`,
        { waitUntil: "domcontentloaded" },
      );
      box = { x: 300, y: 190, width: 1320, height: 620 };
    }

    const rawPath = path.join(rawDir, `${String(i + 1).padStart(2, "0")}-${scene.slug}.png`);
    await page.screenshot({ path: rawPath, fullPage: false });
    const framePaths = [];
    for (let tick = 0; tick < poseFramesPerScene; tick += 1) {
      const framePath = path.join(framesDir, `${String(i + 1).padStart(2, "0")}-${scene.slug}-${String(tick + 1).padStart(2, "0")}.png`);
      await composeFrame(rawPath, framePath, scene, box, i + 1, tick, poseFramesPerScene);
      framePaths.push(framePath);
    }
    metadata.push({ ...scene, index: i + 1, rawPath, framePath: framePaths[0], framePaths, targetBox: box || null });
  }

  await browser.close();
  return metadata;
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function rigSvg(scene, box, tick, totalTicks) {
  const phase = (tick / totalTicks) * Math.PI * 2;
  const talk = tick % 2 === 0;
  const nod = Math.sin(phase) * 4;
  const wave = Math.sin(phase) * 18;
  const pointX = box ? Math.max(160, Math.min(1500, box.x + box.width / 2)) : 1160;
  const pointY = box ? Math.max(140, Math.min(760, box.y + box.height / 2)) : 380;
  const cx = 1578;
  const cy = 785;
  const handX = cx - 138 - wave * 0.6;
  const handY = cy + 2 - Math.abs(wave) * 0.35;
  const label = esc(scene.label);

  return `<g id="rigged-guide">
    <line x1="${handX}" y1="${handY}" x2="${pointX}" y2="${pointY}" stroke="rgba(92,241,255,0.58)" stroke-width="5" stroke-dasharray="16 14"/>
    <circle cx="${pointX}" cy="${pointY}" r="${18 + Math.abs(Math.sin(phase)) * 7}" fill="none" stroke="#f0b24b" stroke-width="6"/>
    <ellipse cx="${cx}" cy="${cy + 174}" rx="178" ry="34" fill="rgba(0,0,0,0.36)"/>
    <path d="M${cx - 74} ${cy + 62} C${cx - 116} ${cy + 130}, ${cx - 92} ${cy + 210}, ${cx - 38} ${cy + 236} L${cx + 58} ${cy + 236} C${cx + 110} ${cy + 198}, ${cx + 122} ${cy + 126}, ${cx + 76} ${cy + 62} Z" fill="#07111f" stroke="#5cf1ff" stroke-width="5"/>
    <path d="M${cx - 54} ${cy + 92} C${cx - 128 - wave} ${cy + 78}, ${handX + 20} ${handY + 10}, ${handX} ${handY}" fill="none" stroke="#9eeef7" stroke-width="18" stroke-linecap="round"/>
    <path d="M${cx + 54} ${cy + 96} C${cx + 118 + wave * 0.35} ${cy + 116}, ${cx + 122} ${cy + 178}, ${cx + 88} ${cy + 220}" fill="none" stroke="#9eeef7" stroke-width="18" stroke-linecap="round"/>
    <circle cx="${handX}" cy="${handY}" r="17" fill="#f8fbff" stroke="#07111f" stroke-width="4"/>
    <circle cx="${cx + 88}" cy="${cy + 220}" r="17" fill="#f8fbff" stroke="#07111f" stroke-width="4"/>
    <rect x="${cx - 112}" y="${cy - 82 + nod}" width="224" height="164" rx="62" fill="#f8fbff" stroke="#07111f" stroke-width="8"/>
    <path d="M${cx - 92} ${cy - 6 + nod} C${cx - 54} ${cy - 58 + nod}, ${cx + 46} ${cy - 58 + nod}, ${cx + 92} ${cy - 2 + nod}" fill="none" stroke="#5cf1ff" stroke-width="8" stroke-linecap="round"/>
    <circle cx="${cx - 42}" cy="${cy - 8 + nod}" r="10" fill="#07111f"/>
    <circle cx="${cx + 42}" cy="${cy - 8 + nod}" r="10" fill="#07111f"/>
    <rect x="${cx - 34}" y="${cy + 34 + nod}" width="68" height="${talk ? 30 : 11}" rx="${talk ? 15 : 6}" fill="#07111f"/>
    <rect x="${cx - 128}" y="${cy + 252}" width="256" height="64" rx="20" fill="rgba(3,8,17,0.92)" stroke="rgba(92,241,255,0.35)" stroke-width="2"/>
    <text x="${cx}" y="${cy + 278}" text-anchor="middle" fill="#5cf1ff" font-size="18" font-weight="900" letter-spacing="3" font-family="Aptos, Segoe UI, Arial">RIGGED GUIDE</text>
    <text x="${cx}" y="${cy + 304}" text-anchor="middle" fill="#d7e3f6" font-size="18" font-family="Aptos, Segoe UI, Arial">${label}</text>
  </g>`;
}

async function composeFrame(rawPath, framePath, scene, box, index, tick = 0, totalTicks = 1) {
  const base = sharp(rawPath).resize(width, height, { fit: "cover" });
  const dimmed = await base
    .clone()
    .composite([{ input: Buffer.from(`<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="rgba(1,6,14,0.58)"/></svg>`), top: 0, left: 0 }])
    .png()
    .toBuffer();

  const composites = [];
  if (box) {
    const pad = 18;
    const x = Math.max(0, Math.floor(box.x - pad));
    const y = Math.max(0, Math.floor(box.y - pad));
    const w = Math.min(width - x, Math.ceil(box.width + pad * 2));
    const h = Math.min(height - y, Math.ceil(box.height + pad * 2));
    const crop = await sharp(rawPath).extract({ left: x, top: y, width: Math.max(1, w), height: Math.max(1, h) }).png().toBuffer();
    composites.push({ input: crop, left: x, top: y });
    composites.push({
      input: Buffer.from(`<svg width="${width}" height="${height}">
        <rect x="${x + 3}" y="${y + 3}" width="${Math.max(1, w - 6)}" height="${Math.max(1, h - 6)}" rx="18" fill="none" stroke="#5cf1ff" stroke-width="6"/>
        <rect x="${x + 10}" y="${y + 10}" width="${Math.max(1, w - 20)}" height="${Math.max(1, h - 20)}" rx="12" fill="none" stroke="rgba(240,178,75,0.88)" stroke-width="2"/>
      </svg>`),
      left: 0,
      top: 0,
    });
  }

  const titleLines = wrap(scene.title, 24);
  const narrationLines = wrap(scene.narration, 74).slice(0, 4);
  const titleSvg = titleLines.map((line, n) => `<text x="72" y="${132 + n * 58}" fill="#f8fbff" font-size="52" font-weight="900" font-family="Aptos, Segoe UI, Arial">${esc(line)}</text>`).join("");
  const copySvg = narrationLines.map((line, n) => `<text x="76" y="${814 + n * 35}" fill="#d7e3f6" font-size="26" font-family="Aptos, Segoe UI, Arial">${esc(line)}</text>`).join("");
  const overlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(3,8,17,0.96)"/>
        <stop offset="1" stop-color="rgba(9,18,32,0.84)"/>
      </linearGradient>
    </defs>
    <rect x="44" y="42" width="820" height="${titleLines.length > 1 ? 260 : 202}" rx="24" fill="url(#panel)" stroke="rgba(92,241,255,0.28)" stroke-width="2"/>
    <text x="72" y="82" fill="#5cf1ff" font-size="20" font-weight="800" letter-spacing="5" font-family="Aptos, Segoe UI, Arial">SCENE ${String(index).padStart(2, "0")} / ${esc(scene.label).toUpperCase()}</text>
    ${titleSvg}
    <rect x="44" y="742" width="1330" height="246" rx="24" fill="rgba(3,8,17,0.88)" stroke="rgba(240,178,75,0.24)" stroke-width="2"/>
    ${copySvg}
    <text x="76" y="954" fill="#f0b24b" font-size="22" font-weight="800" letter-spacing="3" font-family="Aptos, Segoe UI, Arial">ILLCO AI / CREATOR-FIRST AI PIPELINES</text>
    ${rigSvg(scene, box, tick, totalTicks)}
  </svg>`;
  composites.push({ input: Buffer.from(overlay), left: 0, top: 0 });

  await sharp(dimmed).composite(composites).png().toFile(framePath);
}

async function ttsOpenAI(text, output) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE || "onyx",
      input: text,
      format: "mp3",
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI TTS failed: ${response.status} ${body.slice(0, 300)}`);
  }
  const audio = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(output, audio);
  return true;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

function probeDuration(file) {
  const out = run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  return Number.parseFloat(out.trim()) || 0;
}

async function renderAudio(metadata) {
  const audioFiles = [];
  const durations = [];
  const canUseOpenAI = Boolean(process.env.OPENAI_API_KEY);

  for (const scene of metadata) {
    const audioPath = path.join(audioDir, `${String(scene.index).padStart(2, "0")}-${scene.slug}.mp3`);
    const narration = `${scene.title}. ${scene.narration}`;
    if (canUseOpenAI) {
      await ttsOpenAI(narration, audioPath);
    } else {
      throw new Error("No TTS provider available. Set ELEVENLABS_API_KEY or OPENAI_API_KEY.");
    }
    audioFiles.push(audioPath);
    durations.push(Math.max(5.5, probeDuration(audioPath) + 0.6));
  }

  const audioList = path.join(outDir, "audio-concat.txt");
  await fs.writeFile(audioList, audioFiles.map((file) => `file '${file.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
  const narrationPath = path.join(outDir, "illco-combined-demo-narration.mp3");
  run(ffmpeg, ["-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", audioList, "-c:a", "libmp3lame", "-q:a", "2", narrationPath]);
  return { narrationPath, durations, audioFiles };
}

async function renderVideo(metadata, durations, narrationPath) {
  const frameList = path.join(outDir, "frames-concat.txt");
  const lines = [];
  for (let i = 0; i < metadata.length; i += 1) {
    const sceneFrames = metadata[i].framePaths?.length ? metadata[i].framePaths : [metadata[i].framePath];
    const frameDuration = durations[i] / sceneFrames.length;
    for (const framePath of sceneFrames) {
      lines.push(`file '${framePath.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`);
      lines.push(`duration ${frameDuration.toFixed(3)}`);
    }
  }
  lines.push(`file '${metadata[metadata.length - 1].framePath.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`);
  await fs.writeFile(frameList, lines.join("\n"));

  const silentPath = path.join(outDir, "illco-combined-demo-silent.mp4");
  run(ffmpeg, [
    "-hide_banner",
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    frameList,
    "-vf",
    "fps=30,format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    silentPath,
  ]);

  const finalPath = path.join(outDir, "illco-ai-combined-highlight-demo.mp4");
  run(ffmpeg, [
    "-hide_banner",
    "-y",
    "-i",
    silentPath,
    "-i",
    narrationPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-shortest",
    finalPath,
  ]);
  return { silentPath, finalPath };
}

async function createContactSheet(finalPath) {
  const contactSheet = path.join(outDir, "illco-ai-combined-highlight-demo-contact-sheet.jpg");
  run(ffmpeg, [
    "-hide_banner",
    "-y",
    "-i",
    finalPath,
    "-vf",
    "fps=1/24,scale=384:-1,tile=5x4",
    "-frames:v",
    "1",
    contactSheet,
  ]);
  return contactSheet;
}

async function probeJson(finalPath) {
  const out = run(ffprobe, ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", finalPath]);
  return JSON.parse(out);
}

async function main() {
  await ensureDirs();
  const metadata = await captureFrames();
  await fs.writeFile(path.join(outDir, "scene-map.json"), JSON.stringify(metadata, null, 2));
  await fs.writeFile(
    path.join(outDir, "elevenlabs-ready-narration-script.txt"),
    metadata.map((scene) => `SCENE ${scene.index}: ${scene.title}\n${scene.narration}`).join("\n\n"),
  );
  const { narrationPath, durations, audioFiles } = await renderAudio(metadata);
  const { silentPath, finalPath } = await renderVideo(metadata, durations, narrationPath);
  const contactSheet = await createContactSheet(finalPath);
  const probe = await probeJson(finalPath);
  const duration = Number.parseFloat(probe.format?.duration || "0");
  const report = {
    status: "final",
    caveat: process.env.ELEVENLABS_API_KEY
      ? "ElevenLabs key was available."
      : "ElevenLabs key was not available; narration used the configured fallback TTS provider. Revoice from elevenlabs-ready-narration-script.txt when an ElevenLabs key is provided.",
    characterRigging:
      "Implemented in-render as an animated guide character with head nods, mouth poses, arm poses, hand pointer, pulse target, and scene labels over dimmed live UI backgrounds.",
    baseUrl,
    sceneCount: metadata.length,
    durationSeconds: duration,
    durationMinutes: duration / 60,
    finalPath,
    silentPath,
    narrationPath,
    audioFiles,
    contactSheet,
    streams: probe.streams?.map((stream) => ({
      codec_type: stream.codec_type,
      codec_name: stream.codec_name,
      width: stream.width,
      height: stream.height,
      pix_fmt: stream.pix_fmt,
      sample_rate: stream.sample_rate,
      channels: stream.channels,
      duration: stream.duration,
    })),
  };
  await fs.writeFile(path.join(outDir, "render-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
