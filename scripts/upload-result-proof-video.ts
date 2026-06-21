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

type DemoVideoRecord = {
  title?: string | null;
  source?: "youtube-search" | "uploaded" | "manual";
  updatedAt?: string;
  [key: string]: unknown;
};

type DemoVideoSnapshot = {
  generatedAt: string | null;
  projects: Record<string, DemoVideoRecord>;
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

const snapshotPath = path.resolve("data/demo-videos.json");
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

function requireArg(name: string) {
  const value = readArg(name);
  if (!value || value === "true") {
    throw new Error(`Missing required argument --${name}.`);
  }
  return value;
}

function readNumberArg(name: string) {
  const value = readArg(name);
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`--${name} must be a non-negative number.`);
  }
  return parsed;
}

function truncateTitle(value: string) {
  return value.length <= maxTitleLength ? value : value.slice(0, maxTitleLength - 1).trimEnd();
}

async function readSnapshot(): Promise<DemoVideoSnapshot> {
  const raw = await fs.readFile(snapshotPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return JSON.stringify({ generatedAt: null, projects: {} });
    }
    throw error;
  });
  const parsed = JSON.parse(raw) as Partial<DemoVideoSnapshot>;
  return {
    generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : null,
    projects: typeof parsed.projects === "object" && parsed.projects ? parsed.projects as Record<string, DemoVideoRecord> : {},
  };
}

async function writeSnapshot(snapshot: DemoVideoSnapshot) {
  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  const tempPath = `${snapshotPath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(snapshot, null, 2));
  await fs.rename(tempPath, snapshotPath);
}

function mediaTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  return "video/webm";
}

function buildMetadata(productId: string, title: string, summary: string, productionUrl?: string | null) {
  return {
    snippet: {
      title: truncateTitle(title),
      description: [
        summary,
        productionUrl ? `Live app: ${productionUrl}` : "",
        "This proof clip shows a real before/after output result captured from the working mastering pipeline.",
        "Uploaded by the ILLCO Command result-proof pipeline.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      categoryId: "10",
      tags: [
        "ILLCO Command",
        "audio mastering",
        "before after",
        "result proof",
        productId,
        "phase limiter",
      ],
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

  const payload = await fetchYoutubeJson<VideoListResponse>(accessToken, url, `YouTube verify uploaded result proof ${videoId}`);
  const video = payload.items?.[0];
  if (!video?.id) throw new Error(`YouTube did not return uploaded result proof ${videoId} during verification.`);
  if (video.status?.privacyStatus !== "unlisted") {
    throw new Error(`YouTube result proof ${videoId} is ${video.status?.privacyStatus || "unknown"}, not unlisted.`);
  }
  if (video.status?.embeddable !== true) {
    throw new Error(`YouTube result proof ${videoId} is not embeddable.`);
  }
  if (video.status?.uploadStatus && ["deleted", "failed", "rejected"].includes(video.status.uploadStatus)) {
    throw new Error(`YouTube result proof ${videoId} upload status is ${video.status.uploadStatus}.`);
  }
  return video;
}

async function uploadVideo(accessToken: string, filePath: string, metadata: ReturnType<typeof buildMetadata>) {
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
    body: JSON.stringify(metadata),
  });

  if (!initResponse.ok) {
    await parseYoutubeJsonResponse(initResponse, "YouTube result proof upload init", [accessToken]);
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) {
    throw new Error("YouTube result proof upload init did not return a resumable upload URL.");
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
    "YouTube result proof video upload",
    [accessToken, uploadUrl],
  );
  if (!payload.id) throw new Error("YouTube result proof upload finished without a video ID.");

  return verifyUploadedVideo(accessToken, payload.id);
}

async function main() {
  const projectId = requireArg("project-id");
  const filePath = path.resolve(requireArg("file"));
  const title = requireArg("title");
  const summary = requireArg("summary");
  const durationSeconds = readNumberArg("duration") ?? null;

  const product = products.find((item) => item.id === projectId);
  if (!product) {
    throw new Error(`Unknown product id ${projectId}.`);
  }

  const snapshot = await readSnapshot();
  const accessToken = await getYoutubeAccessToken({
    requiredScopes: YOUTUBE_UPLOAD_SCOPES,
    usage: "uploading result proof videos",
  });

  const video = await uploadVideo(accessToken, filePath, buildMetadata(projectId, title, summary, product.productionUrl));
  const youtubeVideoId = String(video.id);
  const now = new Date().toISOString();

  snapshot.projects[projectId] = {
    ...snapshot.projects[projectId],
    title: snapshot.projects[projectId]?.title || `${product.displayName} demo | ILLCO Command`,
    source: "uploaded",
    updatedAt: now,
    projectId,
    productionUrl: product.productionUrl,
    resultProofYoutubeVideoId: youtubeVideoId,
    resultProofYoutubeUrl: youtubeWatchUrl(youtubeVideoId),
    resultProofEmbedUrl: youtubeEmbedUrl(youtubeVideoId),
    resultProofTitle: video.snippet?.title || title,
    resultProofDurationSeconds: durationSeconds,
    resultProofSummary: summary,
    resultProofLocalVideoPath: filePath,
    resultProofYoutubePrivacyStatus: video.status?.privacyStatus || null,
    resultProofYoutubeEmbeddable: video.status?.embeddable ?? null,
    resultProofYoutubeUploadStatus: video.status?.uploadStatus || null,
    resultProofYoutubePublishedAt: video.snippet?.publishedAt || null,
  };

  await writeSnapshot({
    generatedAt: now,
    projects: snapshot.projects,
  });

  console.log(
    JSON.stringify(
      {
        event: "result-proof-uploaded",
        projectId,
        youtubeVideoId,
        youtubeUrl: youtubeWatchUrl(youtubeVideoId),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "result-proof-upload-failed", error: formatSafeError(error) }));
  process.exitCode = 1;
});
