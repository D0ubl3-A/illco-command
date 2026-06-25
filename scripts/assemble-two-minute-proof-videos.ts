import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(__dirname, "..");
const queuePath = path.join(repoRoot, "data", "video-proof-queue.json");
const demoSnapshotPath = path.join(repoRoot, "data", "demo-videos.json");
const outputRoot = path.resolve(process.env.TWO_MINUTE_PROOF_DIR || path.join(repoRoot, "artifacts", "two-minute-proof-videos"));
const ffmpegPath = path.resolve(
  process.env.FFMPEG_PATH || "D:/workspace/.tmp/ffmpeg/ffmpeg-8.0.1-essentials_build/bin/ffmpeg.exe",
);

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
  const raw = readArg("project-ids") || readArg("projects") || process.env.TWO_MINUTE_PROOF_PROJECT_IDS || "";
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

function readLimit() {
  const raw = readArg("limit") || process.env.TWO_MINUTE_PROOF_LIMIT || "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function readBoolean(name: string) {
  const raw = readArg(name) || process.env[`TWO_MINUTE_PROOF_${name.replace(/-/g, "_").toUpperCase()}`];
  return /^(1|true|yes)$/i.test(String(raw || ""));
}

async function statOrNull(filePath: string) {
  return fs.stat(filePath).catch(() => null);
}

async function runFfmpeg(inputPath: string, outputPath: string) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const args = [
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    inputPath,
    "-t",
    "120",
    "-vf",
    "scale=960:-2,fps=15",
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "280k",
    "-deadline",
    "good",
    "-cpu-used",
    "4",
    outputPath,
  ];
  await execFileAsync(ffmpegPath, args, { timeout: 180_000, maxBuffer: 1024 * 1024 * 6 });
}

async function main() {
  const queue = JSON.parse(await fs.readFile(queuePath, "utf8")) as {
    items: Array<{ productId: string; proofStatus: string }>;
  };
  const snapshot = JSON.parse(await fs.readFile(demoSnapshotPath, "utf8")) as {
    generatedAt?: string;
    projects: Record<string, Record<string, unknown>>;
  };

  const requested = new Set(readProjectIds());
  const force = readBoolean("force");
  const limit = readLimit();
  let targets = queue.items.filter((item) => item.proofStatus === "short_demo_ready");
  if (requested.size) targets = targets.filter((item) => requested.has(item.productId));
  if (limit) targets = targets.slice(0, limit);

  const assembled = [];
  const skipped = [];

  for (const item of targets) {
    const record = snapshot.projects[item.productId] || {};
    const sourcePath = String(record.localVideoPath || record.tutorialLocalVideoPath || "");
    const outputPath = path.join(outputRoot, item.productId, `${item.productId}.proof.webm`);

    try {
      if (!sourcePath) throw new Error("No local source video path is recorded.");
      const sourceStat = await statOrNull(sourcePath);
      if (!sourceStat) throw new Error(`Source video is missing: ${sourcePath}`);

      const existing = await statOrNull(outputPath);
      if (!force && existing && existing.size > 25_000) {
        assembled.push({ productId: item.productId, outputPath, bytes: existing.size, reusedExisting: true });
      } else {
        await runFfmpeg(sourcePath, outputPath);
        const outputStat = await statOrNull(outputPath);
        if (!outputStat || outputStat.size < 25_000) throw new Error("Assembled proof video is missing or too small.");
        assembled.push({ productId: item.productId, outputPath, bytes: outputStat.size, reusedExisting: false });
      }

      const stat = await statOrNull(outputPath);
      snapshot.projects[item.productId] = {
        ...record,
        twoMinuteProofLocalVideoPath: outputPath,
        twoMinuteProofLocalVideoBytes: stat?.size || 0,
        twoMinuteProofRecordedAt: new Date().toISOString(),
        twoMinuteProofDurationSeconds: 120,
        twoMinuteProofSourceUrl: sourcePath,
        twoMinuteProofStatus: "recorded",
        twoMinuteProofAssembly: "looped-local-demo",
        updatedAt: new Date().toISOString(),
      };
      console.log(JSON.stringify({ event: "two-minute-proof-assembled", productId: item.productId, outputPath, bytes: stat?.size || 0 }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown assembly error.";
      skipped.push({ productId: item.productId, reason });
      console.log(JSON.stringify({ event: "two-minute-proof-skipped", productId: item.productId, reason }));
    }
  }

  snapshot.generatedAt = new Date().toISOString();
  await fs.writeFile(demoSnapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({ event: "two-minute-proof-assembly-complete", assembled: assembled.length, skipped: skipped.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
