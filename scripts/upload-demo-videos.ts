import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import healthSnapshot from "../data/project-health.json";
import monetizationSnapshot from "../data/monetization-plan.json";
import { products } from "../lib/deployments";
import {
  fetchYoutubeJson,
  formatSafeError,
  getYoutubeAccessToken,
  parseYoutubeJsonResponse,
  youtubeEmbedUrl,
  youtubeWatchUrl,
  YOUTUBE_UPLOAD_SCOPES,
} from "./youtube-auth";

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

type RecordedVideo = {
  productId: string;
  displayName?: string;
  productionUrl?: string;
  file: string;
  bytes?: number;
  recordedAt?: string;
};

type RecordedManifest = {
  generatedAt?: string;
  recorded?: RecordedVideo[];
};

type MonetizationSnapshot = {
  products?: Record<string, {
    publicInFunnel?: boolean;
    healthGate?: {
      behavior?: string;
    };
  }>;
};

type VideoInsertResponse = {
  id?: string;
};

type VideoListResponse = {
  items?: YoutubeVideoResource[];
};

type YoutubeVideoResource = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
  };
  status?: {
    uploadStatus?: string;
    privacyStatus?: string;
    embeddable?: boolean;
  };
};

const videoRoot = path.resolve(process.env.DEMO_VIDEO_DIR || "artifacts/demo-videos");
const demoSnapshotPath = path.resolve("data/demo-videos.json");
const recordedManifestPath = path.join(videoRoot, "recorded.json");
const maxTitleLength = 100;

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

function mediaTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  return "video/webm";
}

function truncateTitle(value: string) {
  return value.length <= maxTitleLength ? value : value.slice(0, maxTitleLength - 1).trimEnd();
}

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function readSnapshot(): Promise<DemoVideoSnapshot> {
  const parsed = await readJsonFile<Partial<DemoVideoSnapshot>>(demoSnapshotPath, { generatedAt: null, projects: {} });
  return {
    ...parsed,
    generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : null,
    projects: isRecord(parsed.projects) ? (parsed.projects as Record<string, DemoVideoRecord>) : {},
  };
}

function recordsFromSnapshot(snapshot: DemoVideoSnapshot): RecordedVideo[] {
  return Object.entries(snapshot.projects)
    .map(([productId, record]) => ({
      productId,
      file: typeof record.localVideoPath === "string" ? record.localVideoPath : "",
      bytes: typeof record.localVideoBytes === "number" ? record.localVideoBytes : undefined,
      recordedAt: typeof record.localVideoRecordedAt === "string" ? record.localVideoRecordedAt : undefined,
    }))
    .filter((record) => record.file.length > 0);
}

function dedupeRecords(records: RecordedVideo[]) {
  const byProduct = new Map<string, RecordedVideo>();
  for (const record of records) {
    if (!byProduct.has(record.productId)) byProduct.set(record.productId, record);
  }
  return [...byProduct.values()];
}

async function writeSnapshot(snapshot: DemoVideoSnapshot) {
  await fs.mkdir(path.dirname(demoSnapshotPath), { recursive: true });
  const tempPath = `${demoSnapshotPath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(snapshot, null, 2));
  await fs.rename(tempPath, demoSnapshotPath);
}

function buildMetadata(product: Product) {
  const title = truncateTitle(`${product.displayName} demo | ILLCO Command`);
  return {
    snippet: {
      title,
      description: [
        `${product.displayName} product walkthrough recorded from the live deployment.`,
        product.productionUrl ? `Live app: ${product.productionUrl}` : "",
        "Uploaded by the ILLCO Command demo video pipeline.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      categoryId: "28",
      tags: ["ILLCO Command", product.displayName, product.name, "Vercel app demo", "software demo"],
    },
    status: {
      privacyStatus: "unlisted",
      selfDeclaredMadeForKids: false,
      embeddable: true,
      publicStatsViewable: false,
      containsSyntheticMedia: false,
    },
  };
}

async function verifyUploadedVideo(accessToken: string, videoId: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,status");
  url.searchParams.set("id", videoId);

  const payload = await fetchYoutubeJson<VideoListResponse>(accessToken, url, `YouTube verify uploaded video ${videoId}`);
  const video = payload.items?.[0];
  if (!video?.id) throw new Error(`YouTube did not return uploaded video ${videoId} during verification.`);
  if (video.status?.privacyStatus !== "unlisted") {
    throw new Error(`YouTube video ${videoId} is ${video.status?.privacyStatus || "unknown"}, not unlisted.`);
  }
  if (video.status?.embeddable !== true) {
    throw new Error(`YouTube video ${videoId} is not embeddable.`);
  }
  if (video.status?.uploadStatus && ["deleted", "failed", "rejected"].includes(video.status.uploadStatus)) {
    throw new Error(`YouTube video ${videoId} upload status is ${video.status.uploadStatus}.`);
  }
  return video;
}

async function uploadVideo(accessToken: string, product: Product, filePath: string) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size <= 0) {
    throw new Error(`${filePath} is not a readable video file.`);
  }

  const mediaType = mediaTypeFor(filePath);
  const initResponse = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mediaType,
      "X-Upload-Content-Length": String(stat.size),
    },
    body: JSON.stringify(buildMetadata(product)),
  });

  if (!initResponse.ok) {
    await parseYoutubeJsonResponse(initResponse, `YouTube upload init for ${product.id}`, [accessToken]);
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) {
    throw new Error(`YouTube upload init did not return a resumable upload URL for ${product.id}.`);
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mediaType,
      "Content-Length": String(stat.size),
    },
    body: createReadStream(filePath) as unknown as BodyInit,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  const payload = await parseYoutubeJsonResponse<VideoInsertResponse>(
    uploadResponse,
    `YouTube video upload for ${product.id}`,
    [accessToken, uploadUrl],
  );
  if (!payload.id) throw new Error(`YouTube upload finished without a video ID for ${product.id}.`);

  return verifyUploadedVideo(accessToken, payload.id);
}

async function main() {
  const limit = readPositiveInt("limit", "DEMO_UPLOAD_LIMIT", 0);
  const dryRun = readBoolean("dry-run", "DEMO_UPLOAD_DRY_RUN");
  const projectIds = readProjectIds();
  const snapshot = await readSnapshot();
  const nextProjects = { ...snapshot.projects };
  const manifest = await readJsonFile<RecordedManifest>(recordedManifestPath, { recorded: [] });
  const skipped: Array<{ productId: string; reason: string }> = [];
  const recordedVideos = dedupeRecords([...(manifest.recorded || []), ...recordsFromSnapshot(snapshot)]);

  const targets = recordedVideos
    .filter((record) => {
      if (projectIds.size > 0 && !projectIds.has(record.productId)) return false;
      if (nextProjects[record.productId]?.youtubeVideoId) {
        skipped.push({ productId: record.productId, reason: "youtube-video-exists" });
        return false;
      }
      if (!isHealthyPublicFunnelProduct(record.productId)) {
        skipped.push({ productId: record.productId, reason: "not-healthy-public-funnel-product" });
        return false;
      }
      const healthStatus = getHealthStatus(record.productId);
      if (healthStatus !== "healthy") {
        skipped.push({ productId: record.productId, reason: `health-${healthStatus}` });
        return false;
      }
      return true;
    })
    .filter((record) => {
      const resolvedPath = path.resolve(record.file);
      if (!isInside(videoRoot, resolvedPath)) {
        skipped.push({ productId: record.productId, reason: "file-outside-demo-video-dir" });
        return false;
      }
      return true;
    });
  const selected = limit > 0 ? targets.slice(0, limit) : targets;

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          event: "demo-upload-dry-run",
          selected: selected.map((record) => ({ productId: record.productId, file: record.file })),
          skipped,
        },
        null,
        2,
      ),
    );
    return;
  }

  const accessToken = await getYoutubeAccessToken({
    requiredScopes: YOUTUBE_UPLOAD_SCOPES,
    usage: "uploading demo videos",
  });
  let uploaded = 0;

  for (const record of selected) {
    const product = products.find((item) => item.id === record.productId);
    if (!product) {
      skipped.push({ productId: record.productId, reason: "unknown-product" });
      continue;
    }

    try {
      const video = await uploadVideo(accessToken, product, path.resolve(record.file));
      const youtubeVideoId = String(video.id);
      const now = new Date().toISOString();
      nextProjects[record.productId] = {
        ...nextProjects[record.productId],
        youtubeVideoId,
        youtubeUrl: youtubeWatchUrl(youtubeVideoId),
        embedUrl: youtubeEmbedUrl(youtubeVideoId),
        title: video.snippet?.title || `${product.displayName} demo | ILLCO Command`,
        source: "uploaded",
        updatedAt: now,
        projectId: product.id,
        productionUrl: product.productionUrl,
        localVideoPath: record.file,
        youtubePrivacyStatus: video.status?.privacyStatus || null,
        youtubeEmbeddable: video.status?.embeddable ?? null,
        youtubeUploadStatus: video.status?.uploadStatus || null,
        youtubePublishedAt: video.snippet?.publishedAt || null,
      };
      uploaded += 1;
      await writeSnapshot({ ...snapshot, generatedAt: now, projects: nextProjects });
      console.log(JSON.stringify({ event: "demo-uploaded", productId: record.productId, youtubeVideoId }));
    } catch (error) {
      const now = new Date().toISOString();
      const message = formatSafeError(error);
      nextProjects[record.productId] = {
        ...nextProjects[record.productId],
        updatedAt: now,
        uploadError: message,
        uploadErrorAt: now,
      };
      await writeSnapshot({ ...snapshot, generatedAt: now, projects: nextProjects });
      skipped.push({ productId: record.productId, reason: message });
      console.log(JSON.stringify({ event: "demo-upload-skipped", productId: record.productId, reason: message }));
    }
  }

  await writeSnapshot({ ...snapshot, generatedAt: new Date().toISOString(), projects: nextProjects });
  console.log(JSON.stringify({ event: "demo-upload-complete", uploaded, skipped: skipped.length }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "demo-upload-failed", error: formatSafeError(error) }));
  process.exitCode = 1;
});
