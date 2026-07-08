import { getProductById, products } from "@/lib/deployments";
import { YOUTUBE_OPS_APP_URL, YOUTUBE_OPS_PRODUCT_ID } from "@/lib/youtube-ops-integration";

function getAccountBridgeHref(productId: string, returnTo: string) {
  const params = new URLSearchParams({ productId, returnTo });
  return `/api/account/bridge/start?${params.toString()}`;
}

const localToolRoutes: Record<string, string> = {
  "ai-companions-recovered": "/tools",
  "illco-ai-video": "/apps/illco-ai-video",
  "illcoai-video-generator-deploy": "/apps/illcoai-video-generator-deploy",
  "think-for-me-mode": "/tools/think-for-me-mode",
  "lyric-video-forge": "/tools/lyric-video-forge",
  [YOUTUBE_OPS_PRODUCT_ID]: getAccountBridgeHref(YOUTUBE_OPS_PRODUCT_ID, YOUTUBE_OPS_APP_URL),
};

export function getProductLandingHref(productId: string) {
  const normalized = encodeURIComponent(productId.trim());
  return normalized ? `/apps/${normalized}` : "/";
}

export function getProductModuleHref(productId: string) {
  const rawProductId = productId.trim();
  const normalized = encodeURIComponent(rawProductId);
  if (!normalized) return "/";

  const localRoute = localToolRoutes[rawProductId];
  if (localRoute) return localRoute;

  const product = getProductById(rawProductId);
  if (product?.loginUrl && (product.requiresLogin || product.ssoConnected)) return product.loginUrl;

  const productionUrl = product?.productionUrl?.trim();
  if (productionUrl) return productionUrl;

  return `/apps/${normalized}`;
}

export function getProductDisplayHref(productId: string) {
  const href = getProductModuleHref(productId);
  if (/^https?:\/\//i.test(href)) {
    return href.replace(/^https?:\/\//i, "");
  }
  return `illcoai.tech${href}`;
}

function isKnownProductProductionHref(value: string) {
  return products.some((product) => {
    const productionUrl = product.productionUrl?.trim();
    return Boolean(productionUrl && (value === productionUrl || value.startsWith(`${productionUrl}/`)));
  });
}

export function isPublicProductLaunchHref(href: string | null | undefined) {
  const value = String(href || "").trim();
  if (!value) return false;
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    return [
      "illcoai.tech",
      "www.illcoai.tech",
    ].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isInAppProductHref(href: string | null | undefined) {
  const value = String(href || "").trim();
  if (!value) return false;
  return (
    value.startsWith("/") ||
    value.startsWith("https://illcoai.tech/") ||
    isKnownProductProductionHref(value)
  );
}
