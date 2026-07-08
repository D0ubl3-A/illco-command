import { safeAccountReturnTo } from "@/lib/account-return";
import { getProductById } from "@/lib/deployments";
import { GET as startGoogleOAuth } from "@/app/api/account/google/start/route";

function normalizeAppId(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveReturnTarget(rawAppId: string) {
  const appId = normalizeAppId(rawAppId);
  if (!appId) {
    return "";
  }

  const product = getProductById(appId);
  const target = product ? `/apps/${product.id}` : `/apps/${appId}`;
  return safeAccountReturnTo(target);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  if (!requestUrl.searchParams.has("returnTo")) {
    const appId = requestUrl.searchParams.get("appId") || "";
    const returnTo = resolveReturnTarget(appId);
    if (returnTo) {
      requestUrl.searchParams.set("returnTo", returnTo);
    }
  }

  const proxiedRequest = new Request(requestUrl.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: request.redirect,
  });

  return startGoogleOAuth(proxiedRequest);
}


