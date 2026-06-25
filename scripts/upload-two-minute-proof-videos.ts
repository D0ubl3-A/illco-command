import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

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

type DemoRecord = {
  title?: string | null;
  twoMinuteProofLocalVideoPath?: string | null;
  twoMinuteProofLocalVideoBytes?: number | null;
  twoMinuteProofDurationSeconds?: number | null;
  twoMinuteProofYoutubeVideoId?: string | null;
  twoMinuteProofYoutubeUrl?: string | null;
  twoMinuteProofEmbedUrl?: string | null;
  twoMinuteProofUploadState?: "pending-credentials" | "uploaded" | "failed" | null;
  twoMinuteProofUploadError?: string | null;
  twoMinuteProofUploadErrorAt?: string | null;
  twoMinuteProofUploadedAt?: string | null;
  [key: string]: unknown;
};

type DemoSnapshot = {
  generatedAt?: string | null;
  projects: Record<string, DemoRecord>;
  [key: string]: unknown;
};

type VideoInsertResponse = {
  id?: string;
};

type YoutubeVideoResource = {
  id?: string;
  status?: {
    privacyStatus?: string;
    embeddable?: boolean;
    uploadStatus?: string;
  };
};

type VideoListResponse = {
  items?: YoutubeVideoResource[];
};

const repoRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(repoRoot, "data", "demo-videos.json");
const queuePath = path.join(repoRoot, "data", "video-proof-queue.json");
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

function readProjectIds() {
  const raw = readArg("project-ids") || readArg("projects") || process.env.TWO_MINUTE_UPLOAD_PROJECT_IDS || "";
  return new Set(raw.split(",").map((value) => value.trim()).filter(Boolean));
}

function readLimit() {
  const raw = readArg("limit") || process.env.TWO_MINUTE_UPLOAD_LIMIT || "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
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

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function writeJsonAtomic(filePath: string, value: unknown) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(tempPath, filePath);
}

function productName(productId: string) {
  return products.find((product) => product.id === productId)?.displayName || productId.replace(/-/g, " ");
}

function buildMetadata(productId: string, record: DemoRecord) {
  const displayName = productName(productId);
  return {
    snippet: {
      title: truncateTitle(`${displayName} 2-minute proof | ILLCO AI`),
      description: [
        `Two-minute product proof for ${displayName}.`,
        "Recorded or assembled from the ILLCO Command product proof pipeline.",
        `Product page: https://illcoai.tech/apps/${encodeURIComponent(productId)}`,
        record.twoMinuteProofLocalVideoBytes ? `Local proof bytes: ${record.twoMinuteProofLocalVideoBytes}` : "",
      ].filter(Boolean).join("\n\n"),
      categoryId: "28",
      tags: ["ILLCO AI", "ILLCO Command", displayName, "software proof", "AI workflow"],
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
  url.searchParams.set("part", "status");
  url.searchParams.set("id", videoId);

  const payload = await fetchYoutubeJson<VideoListResponse>(accessToken, url, `YouTube verify two-minute proof ${videoId}`);
  const video = payload.items?.[0];
  if (!video?.id) throw new Error(`YouTube did not return video ${videoId} during verification.`);
  if (video.status?.privacyStatus !== "unlisted") throw new Error(`YouTube video ${videoId} is not unlisted.`);
  if (video.status?.embeddable !== true) throw new Error(`YouTube video ${videoId} is not embeddable.`);
  if (video.status?.uploadStatus && ["deleted", "failed", "rejected"].includes(video.status.uploadStatus)) {
    throw new Error(`YouTube video ${videoId} upload status is ${video.status.uploadStatus}.`);
  }
  return video;
}

async function uploadVideo(accessToken: string, productId: string, record: DemoRecord, filePath: string) {
  const stat = await fs.stat(filePath);
  const mediaType = mediaTypeFor(filePath);
  const initResponse = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mediaType,
      "X-Upload-Content-Length": String(stat.size),
    },
    body: JSON.stringify(buildMetadata(productId, record)),
  });

  if (!initResponse.ok) {
    await parseYoutubeJsonResponse(initResponse, `YouTube two-minute proof upload init for ${productId}`, [accessToken]);
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) throw new Error(`YouTube upload init did not return an upload URL for ${productId}.`);

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
    `YouTube two-minute proof upload for ${productId}`,
    [accessToken, uploadUrl],
  );
  if (!payload.id) throw new Error(`YouTube upload finished without a video ID for ${productId}.`);
  await verifyUploadedVideo(accessToken, payload.id);
  return payload.id;
}

async function main() {
  const requested = readProjectIds();
  const limit = readLimit();
  const snapshot = await readJson<DemoSnapshot>(snapshotPath);
  const queue = await readJson<{ items: Array<{ productId: string; proofStatus: string }> }>(queuePath);
  let targets = queue.items.filter((item) => item.proofStatus === "two_minute_ready");
  if (requested.size) targets = targets.filter((item) => requested.has(item.productId));
  targets = targets.filter((item) => {
    const record = snapshot.projects[item.productId];
    return Boolean(record?.twoMinuteProofLocalVideoPath && !record.twoMinuteProofYoutubeVideoId);
  });
  if (limit) targets = targets.slice(0, limit);

  let accessToken = "";
  try {
    accessToken = await getYoutubeAccessToken({
      requiredScopes: YOUTUBE_UPLOAD_SCOPES,
      usage: "two-minute proof uploads",
    });
  } catch (error) {
    const now = new Date().toISOString();
    for (const target of targets) {
      snapshot.projects[target.productId] = {
        ...(snapshot.projects[target.productId] || {}),
        twoMinuteProofUploadState: "pending-credentials",
        twoMinuteProofUploadError: formatSafeError(error),
        twoMinuteProofUploadErrorAt: now,
      };
    }
    await writeJsonAtomic(snapshotPath, snapshot);
    console.log(JSON.stringify({ event: "two-minute-proof-upload-pending-credentials", targets: targets.length, reason: formatSafeError(error) }, null, 2));
    return;
  }

  let uploaded = 0;
  let failed = 0;
  for (const target of targets) {
    const record = snapshot.projects[target.productId];
    const filePath = String(record.twoMinuteProofLocalVideoPath || "");
    try {
      const videoId = await uploadVideo(accessToken, target.productId, record, filePath);
      const now = new Date().toISOString();
      snapshot.projects[target.productId] = {
        ...record,
        twoMinuteProofYoutubeVideoId: videoId,
        twoMinuteProofYoutubeUrl: youtubeWatchUrl(videoId),
        twoMinuteProofEmbedUrl: youtubeEmbedUrl(videoId),
        twoMinuteProofUploadState: "uploaded",
        twoMinuteProofUploadedAt: now,
        updatedAt: now,
      };
      uploaded += 1;
      await writeJsonAtomic(snapshotPath, snapshot);
      console.log(JSON.stringify({ event: "two-minute-proof-uploaded", productId: target.productId, videoId }));
    } catch (error) {
      const now = new Date().toISOString();
      snapshot.projects[target.productId] = {
        ...record,
        twoMinuteProofUploadState: "failed",
        twoMinuteProofUploadError: formatSafeError(error),
        twoMinuteProofUploadErrorAt: now,
      };
      failed += 1;
      await writeJsonAtomic(snapshotPath, snapshot);
      console.log(JSON.stringify({ event: "two-minute-proof-upload-failed", productId: target.productId, reason: formatSafeError(error) }));
    }
  }

  snapshot.generatedAt = new Date().toISOString();
  await writeJsonAtomic(snapshotPath, snapshot);
  console.log(JSON.stringify({ event: "two-minute-proof-upload-complete", uploaded, failed, remaining: Math.max(targets.length - uploaded - failed, 0) }, null, 2));
}

main().catch((error) => {
  console.error(formatSafeError(error));
  process.exitCode = 1;
});
