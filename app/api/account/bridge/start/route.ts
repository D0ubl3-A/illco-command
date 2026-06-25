import { NextResponse } from "next/server";

import { appendAccountBridgeGrant } from "@/lib/account-bridge";
import { safeAccountReturnTo } from "@/lib/account-return";
import { getProductById } from "@/lib/deployments";
import { getAccountDatabaseStatus, getCurrentUser } from "@/lib/user-accounts";
import { YOUTUBE_OPS_APP_URL, YOUTUBE_OPS_PRODUCT_ID } from "@/lib/youtube-ops-integration";

function normalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  if (url.pathname === "") url.pathname = "/";
  return url.toString();
}

function allowedBridgeReturnTo(productId: string) {
  if (productId === YOUTUBE_OPS_PRODUCT_ID) return YOUTUBE_OPS_APP_URL;
  return "";
}

function safeBridgeReturnTo(productId: string, value: string | null) {
  const allowed = allowedBridgeReturnTo(productId);
  if (!allowed) return "";

  const safe = safeAccountReturnTo(value);
  if (!safe) return allowed;

  try {
    return normalizeUrl(safe) === normalizeUrl(allowed) ? safe : allowed;
  } catch {
    return allowed;
  }
}

function currentRequestPath(requestUrl: URL) {
  return `${requestUrl.pathname}${requestUrl.search}`;
}

function accountRedirect(request: Request, requestUrl: URL, authState?: string) {
  const url = new URL("/account", request.url);
  url.searchParams.set("returnTo", currentRequestPath(requestUrl));
  if (authState) url.searchParams.set("auth", authState);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const productId = String(requestUrl.searchParams.get("productId") || YOUTUBE_OPS_PRODUCT_ID).trim();
  const product = getProductById(productId);
  if (!product) {
    return NextResponse.json({ ok: false, detail: "Unknown productId." }, { status: 400 });
  }

  const dbStatus = await getAccountDatabaseStatus();
  if (!dbStatus.ready) {
    return accountRedirect(request, requestUrl, "accounts-unavailable");
  }

  const user = await getCurrentUser();
  if (!user) {
    return accountRedirect(request, requestUrl);
  }

  const returnTo = safeBridgeReturnTo(product.id, requestUrl.searchParams.get("returnTo"));
  if (!returnTo) {
    return NextResponse.json({ ok: false, detail: "This product does not support account bridge launch yet." }, { status: 403 });
  }

  const bridged = new URL(await appendAccountBridgeGrant(returnTo, user, { productId: product.id, audience: returnTo }));
  bridged.searchParams.set("illco_product", product.id);
  bridged.searchParams.set("illco_source", "illco-command");

  return NextResponse.redirect(bridged);
}
