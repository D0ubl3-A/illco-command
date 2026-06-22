import type { FunnelPlanId } from "@/lib/env";

export const YOUTUBE_OPS_PRODUCT_ID = "youtube-ops-vercel";
export const YOUTUBE_OPS_PLAN_ID = "studio" satisfies FunnelPlanId;
export const YOUTUBE_OPS_APP_URL = "https://youtubeopsvercel.vercel.app/";

function normalizeBaseUrl(baseUrl: string) {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");
  return normalized || "https://illcoai.tech";
}

export function getYoutubeOpsBridgeStartHref(baseUrl = "https://illcoai.tech", returnTo = YOUTUBE_OPS_APP_URL) {
  const url = new URL("/api/account/bridge/start", normalizeBaseUrl(baseUrl));
  url.searchParams.set("productId", YOUTUBE_OPS_PRODUCT_ID);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export function getYoutubeOpsCheckoutHref(baseUrl = "https://illcoai.tech", returnTo = YOUTUBE_OPS_APP_URL) {
  const url = new URL("/api/youtube-ops/checkout", normalizeBaseUrl(baseUrl));
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}