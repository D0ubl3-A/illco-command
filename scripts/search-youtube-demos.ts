import fs from "node:fs/promises";
import path from "node:path";

import monetizationSnapshot from "../data/monetization-plan.json";
import { products } from "../lib/deployments";
import {
  fetchYoutubeJson,
  formatSafeError,
  getYoutubeAccessToken,
  youtubeEmbedUrl,
  youtubeWatchUrl,
  YOUTUBE_SEARCH_SCOPES,
} from "./youtube-auth";

type Product = (typeof products)[number];

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

type SearchListResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
    };
  }>;
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
  player?: {
    embedHtml?: string;
  };
};

const outputPath = path.resolve("data/demo-videos.json");
const defaultSearchResultsPerProduct = 10;

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

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhrase(haystack: string, phrase: string) {
  const normalizedPhrase = normalize(phrase);
  return Boolean(normalizedPhrase) && haystack.includes(normalizedPhrase);
}

function scoreVideo(product: Product, video: YoutubeVideoResource) {
  const text = normalize(`${video.snippet?.title || ""} ${video.snippet?.description || ""}`);
  let score = 0;

  if (hasPhrase(text, product.displayName)) score += 10;
  if (hasPhrase(text, product.name)) score += 8;
  if (hasPhrase(text, product.id)) score += 8;
  if (hasPhrase(text, "ILLCO Command")) score += 3;
  if (hasPhrase(text, "demo")) score += 2;

  return score;
}

function projectQuery(product: Product) {
  return `"${product.displayName}" "ILLCO Command" demo`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHealthyPublicFunnelProduct(productId: string) {
  const plan = (monetizationSnapshot as MonetizationSnapshot).products?.[productId];
  return Boolean(plan?.publicInFunnel && plan.healthGate?.behavior === "allow-checkout");
}

async function readSnapshot(): Promise<DemoVideoSnapshot> {
  const raw = await fs.readFile(outputPath, "utf8").catch((error: NodeJS.ErrnoException) => {
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
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const next = JSON.stringify(snapshot, null, 2);
  const tempPath = `${outputPath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, next);
  await fs.rename(tempPath, outputPath);
}

async function searchOwnedVideos(accessToken: string, product: Product) {
  const maxResults = Math.min(Math.max(readPositiveInt("max-results", "DEMO_SEARCH_MAX_RESULTS", defaultSearchResultsPerProduct), 1), 50);
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("forMine", "true");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("q", projectQuery(product));

  const payload = await fetchYoutubeJson<SearchListResponse>(accessToken, url, `YouTube search for ${product.id}`);
  return (payload.items || [])
    .map((item) => item.id?.videoId)
    .filter((videoId): videoId is string => typeof videoId === "string" && videoId.length > 0);
}

async function getVideoDetails(accessToken: string, videoIds: string[]) {
  if (videoIds.length === 0) return [];
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,status,player");
  url.searchParams.set("id", videoIds.join(","));

  const payload = await fetchYoutubeJson<VideoListResponse>(accessToken, url, "YouTube video details lookup");
  return payload.items || [];
}

function usableEmbedReason(video: YoutubeVideoResource) {
  const status = video.status;
  if (!video.id) return "missing-video-id";
  if (status?.uploadStatus && ["deleted", "failed", "rejected"].includes(status.uploadStatus)) {
    return `upload-${status.uploadStatus}`;
  }
  if (status?.privacyStatus === "private") return "private-video";
  if (status?.embeddable !== true) return "not-embeddable";
  return null;
}

async function findExistingDemo(accessToken: string, product: Product) {
  const videoIds = await searchOwnedVideos(accessToken, product);
  const videos = await getVideoDetails(accessToken, videoIds);
  const ranked = videos
    .map((video) => ({ video, score: scoreVideo(product, video), unusableReason: usableEmbedReason(video) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  const match = ranked.find((candidate) => !candidate.unusableReason);
  if (!match?.video.id) {
    return {
      record: null,
      rejectedReason: ranked[0]?.unusableReason || (videoIds.length ? "no-title-match" : "not-found"),
      candidateCount: videoIds.length,
    };
  }

  const videoId = match.video.id;
  return {
    record: {
      youtubeVideoId: videoId,
      youtubeUrl: youtubeWatchUrl(videoId),
      embedUrl: youtubeEmbedUrl(videoId),
      title: match.video.snippet?.title || `${product.displayName} demo | ILLCO Command`,
      source: "youtube-search" as const,
      updatedAt: new Date().toISOString(),
      youtubePrivacyStatus: match.video.status?.privacyStatus || null,
      youtubeEmbeddable: match.video.status?.embeddable ?? null,
      youtubeUploadStatus: match.video.status?.uploadStatus || null,
      youtubePublishedAt: match.video.snippet?.publishedAt || null,
    },
    rejectedReason: null,
    candidateCount: videoIds.length,
  };
}

async function main() {
  const limit = readPositiveInt("limit", "DEMO_SEARCH_LIMIT", 0);
  const refreshExisting = readBoolean("refresh-existing", "DEMO_SEARCH_REFRESH_EXISTING");
  const projectIds = readProjectIds();
  const snapshot = await readSnapshot();
  const nextProjects = { ...snapshot.projects };
  const accessToken = await getYoutubeAccessToken({
    requiredScopes: YOUTUBE_SEARCH_SCOPES,
    usage: "searching authenticated channel demo videos",
  });

  const targets = products
    .filter((product) => projectIds.size === 0 || projectIds.has(product.id) || projectIds.has(product.name))
    .filter((product) => isHealthyPublicFunnelProduct(product.id))
    .filter((product) => refreshExisting || !nextProjects[product.id]?.youtubeVideoId);
  const selected = limit > 0 ? targets.slice(0, limit) : targets;
  let found = 0;
  let skipped = 0;

  for (const product of selected) {
    const result = await findExistingDemo(accessToken, product);
    if (result.record) {
      nextProjects[product.id] = {
        ...nextProjects[product.id],
        ...result.record,
        projectId: product.id,
        productionUrl: product.productionUrl,
      };
      found += 1;
      await writeSnapshot({ ...snapshot, generatedAt: new Date().toISOString(), projects: nextProjects });
      console.log(JSON.stringify({ event: "youtube-demo-found", productId: product.id, videoId: result.record.youtubeVideoId }));
    } else {
      skipped += 1;
      console.log(
        JSON.stringify({
          event: "youtube-demo-not-found",
          productId: product.id,
          reason: result.rejectedReason,
          candidateCount: result.candidateCount,
        }),
      );
    }
  }

  await writeSnapshot({ ...snapshot, generatedAt: new Date().toISOString(), projects: nextProjects });
  console.log(
    JSON.stringify(
      {
        event: "youtube-search-complete",
        searched: selected.length,
        found,
        skipped,
        totalWithVideos: Object.values(nextProjects).filter((record) => record.youtubeVideoId).length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "youtube-search-failed", error: formatSafeError(error) }));
  process.exitCode = 1;
});
