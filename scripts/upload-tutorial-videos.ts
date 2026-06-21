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
  tutorialYoutubeVideoId?: string | null;
  tutorialYoutubeUrl?: string | null;
  tutorialEmbedUrl?: string | null;
  tutorialTitle?: string | null;
  tutorialLocalVideoPath?: string | null;
  tutorialDurationSeconds?: number | null;
  tutorialTranscriptPath?: string | null;
  tutorialCaptionPath?: string | null;
  tutorialManifestPath?: string | null;
  tutorialIncludesCaptions?: boolean | null;
  tutorialIncludesHighlights?: boolean | null;
  tutorialIncludesNarration?: boolean | null;
  tutorialPacing?: string | null;
  tutorialUploadState?: "pending-credentials" | "uploaded" | "failed" | null;
  tutorialUploadPendingReason?: string | null;
  tutorialUploadPendingAt?: string | null;
  tutorialUploadError?: string | null;
  tutorialUploadErrorAt?: string | null;
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

const demoSnapshotPath = path.resolve("data/demo-videos.json");
const tutorialRoot = path.resolve(process.env.TUTORIAL_VIDEO_DIR || "artifacts/tutorial-videos");
const minimumTutorialDurationSeconds = 120;

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

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
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
  const raw = await fs.readFile(demoSnapshotPath, "utf8").catch((error: NodeJS.ErrnoException) => {
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

async function writeSnapshot(snapshot: DemoVideoSnapshot) {
  await fs.mkdir(path.dirname(demoSnapshotPath), { recursive: true });
  const tempPath = `${demoSnapshotPath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(snapshot, null, 2));
  await fs.rename(tempPath, demoSnapshotPath);
}

function mediaTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  return "video/webm";
}

function buildMetadata(product: Product, record: DemoVideoRecord) {
  const title = String(record.tutorialTitle || `${product.displayName} full tutorial | ILLCO Command`).slice(0, 100);
  return {
    snippet: {
      title,
      description: [
        `Full-length ${product.displayName} tutorial recorded from the live deployment.`,
        "Includes slow pacing, visible captions, highlight framing, and narration.",
        product.productionUrl ? `Live app: ${product.productionUrl}` : "",
        "Uploaded by the ILLCO Command tutorial pipeline.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      categoryId: "28",
      tags: ["ILLCO Command", product.displayName, product.name, "tutorial", "software walkthrough"],
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

  const payload = await fetchYoutubeJson<VideoListResponse>(accessToken, url, `YouTube verify tutorial video ${videoId}`);
  const video = payload.items?.[0];
  if (!video?.id) throw new Error(`YouTube did not return tutorial video ${videoId} during verification.`);
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

async function uploadVideo(accessToken: string, product: Product, record: DemoVideoRecord, filePath: string) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size <= 0) {
    throw new Error(`${filePath} is not a readable tutorial video file.`);
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
    body: JSON.stringify(buildMetadata(product, record)),
  });

  if (!initResponse.ok) {
    await parseYoutubeJsonResponse(initResponse, `YouTube tutorial upload init for ${product.id}`, [accessToken]);
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
    `YouTube tutorial upload for ${product.id}`,
    [accessToken, uploadUrl],
  );
  if (!payload.id) throw new Error(`YouTube upload finished without a video ID for ${product.id}.`);

  return verifyUploadedVideo(accessToken, payload.id);
}

async function markCredentialPending(
  snapshot: DemoVideoSnapshot,
  nextProjects: Record<string, DemoVideoRecord>,
  selected: Array<[string, DemoVideoRecord]>,
  reason: string,
) {
  const now = new Date().toISOString();
  for (const [productId] of selected) {
    nextProjects[productId] = {
      ...nextProjects[productId],
      tutorialUploadState: "pending-credentials",
      tutorialUploadPendingReason: reason,
      tutorialUploadPendingAt: now,
      updatedAt: now,
    };
    console.log(JSON.stringify({ event: "tutorial-upload-pending", productId, reason }));
  }
  await writeSnapshot({ ...snapshot, generatedAt: now, projects: nextProjects });
}

async function main() {
  const limit = readPositiveInt("limit", "TUTORIAL_UPLOAD_LIMIT", 0);
  const dryRun = readBoolean("dry-run", "TUTORIAL_UPLOAD_DRY_RUN");
  const replaceExisting = readBoolean("replace-existing", "TUTORIAL_UPLOAD_REPLACE_EXISTING");
  const projectIds = readProjectIds();
  const snapshot = await readSnapshot();
  const nextProjects = { ...snapshot.projects };
  const skipped: Array<{ productId: string; reason: string }> = [];

  const targets = Object.entries(nextProjects)
    .filter(([productId, record]) => {
      if (projectIds.size > 0 && !projectIds.has(productId)) return false;
      if (record.tutorialYoutubeVideoId && !replaceExisting) {
        skipped.push({ productId, reason: "tutorial-youtube-video-exists" });
        return false;
      }
      if (!record.tutorialLocalVideoPath) {
        skipped.push({ productId, reason: "missing-tutorial-local-video" });
        return false;
      }
      if ((record.tutorialDurationSeconds || 0) < minimumTutorialDurationSeconds) {
        skipped.push({ productId, reason: "tutorial-too-short" });
        return false;
      }
      if (!record.tutorialIncludesCaptions || !record.tutorialIncludesHighlights || !record.tutorialIncludesNarration) {
        skipped.push({ productId, reason: "tutorial-missing-required-assets" });
        return false;
      }
      if (record.tutorialPacing !== "slow") {
        skipped.push({ productId, reason: "tutorial-not-slow-paced" });
        return false;
      }
      if (!isHealthyPublicFunnelProduct(productId)) {
        skipped.push({ productId, reason: "not-healthy-public-funnel-product" });
        return false;
      }
      const healthStatus = getHealthStatus(productId);
      if (healthStatus !== "healthy") {
        skipped.push({ productId, reason: `health-${healthStatus}` });
        return false;
      }
      const resolvedPath = path.resolve(record.tutorialLocalVideoPath);
      if (!isInside(tutorialRoot, resolvedPath)) {
        skipped.push({ productId, reason: "file-outside-tutorial-video-dir" });
        return false;
      }
      return true;
    });
  const selected = limit > 0 ? targets.slice(0, limit) : targets;

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          event: "tutorial-upload-dry-run",
          selected: selected.map(([productId, record]) => ({ productId, file: record.tutorialLocalVideoPath })),
          skipped,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (selected.length === 0) {
    console.log(JSON.stringify({ event: "tutorial-upload-complete", uploaded: 0, skipped: skipped.length }, null, 2));
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getYoutubeAccessToken({
      requiredScopes: YOUTUBE_UPLOAD_SCOPES,
      usage: "uploading narrated tutorial videos",
    });
  } catch (error) {
    const message = formatSafeError(error);
    await markCredentialPending(snapshot, nextProjects, selected, message);
    console.log(
      JSON.stringify(
        {
          event: "tutorial-upload-complete",
          uploaded: 0,
          pendingCredentials: selected.length,
          skipped: skipped.length,
        },
        null,
        2,
      ),
    );
    return;
  }
  let uploaded = 0;

  for (const [productId, record] of selected) {
    const product = products.find((item) => item.id === productId);
    if (!product || !record.tutorialLocalVideoPath) {
      skipped.push({ productId, reason: "unknown-product-or-missing-file" });
      continue;
    }

    try {
      const video = await uploadVideo(accessToken, product, record, path.resolve(record.tutorialLocalVideoPath));
      const youtubeVideoId = String(video.id);
      const now = new Date().toISOString();
      nextProjects[productId] = {
        ...nextProjects[productId],
        tutorialYoutubeVideoId: youtubeVideoId,
        tutorialYoutubeUrl: youtubeWatchUrl(youtubeVideoId),
        tutorialEmbedUrl: youtubeEmbedUrl(youtubeVideoId),
        tutorialTitle: video.snippet?.title || record.tutorialTitle || `${product.displayName} full tutorial | ILLCO Command`,
        tutorialUpdatedAt: now,
        tutorialYoutubePrivacyStatus: video.status?.privacyStatus || null,
        tutorialYoutubeEmbeddable: video.status?.embeddable ?? null,
        tutorialYoutubeUploadStatus: video.status?.uploadStatus || null,
        tutorialYoutubePublishedAt: video.snippet?.publishedAt || null,
        tutorialUploadState: "uploaded",
        tutorialUploadPendingReason: null,
        tutorialUploadPendingAt: null,
        tutorialUploadError: null,
        tutorialUploadErrorAt: null,
        updatedAt: now,
      };
      uploaded += 1;
      await writeSnapshot({ ...snapshot, generatedAt: now, projects: nextProjects });
      console.log(JSON.stringify({ event: "tutorial-uploaded", productId, youtubeVideoId }));
    } catch (error) {
      const now = new Date().toISOString();
      const message = formatSafeError(error);
      nextProjects[productId] = {
        ...nextProjects[productId],
        tutorialUploadState: "failed",
        tutorialUploadError: message,
        tutorialUploadErrorAt: now,
        updatedAt: now,
      };
      await writeSnapshot({ ...snapshot, generatedAt: now, projects: nextProjects });
      skipped.push({ productId, reason: message });
      console.log(JSON.stringify({ event: "tutorial-upload-skipped", productId, reason: message }));
    }
  }

  await writeSnapshot({ ...snapshot, generatedAt: new Date().toISOString(), projects: nextProjects });
  console.log(JSON.stringify({ event: "tutorial-upload-complete", uploaded, skipped: skipped.length }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "tutorial-upload-failed", error: formatSafeError(error) }));
  process.exitCode = 1;
});
