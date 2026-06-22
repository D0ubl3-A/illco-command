import { NextResponse } from "next/server";

import { appendAccountBridgeGrant } from "@/lib/account-bridge";
import { safeAccountReturnTo } from "@/lib/account-return";
import { getProductById } from "@/lib/deployments";
import { getAccountDatabaseStatus, getCurrentUser } from "@/lib/user-accounts";
import { YOUTUBE_OPS_APP_URL, YOUTUBE_OPS_PRODUCT_ID } from "@/lib/youtube-ops-integration";

function safeBridgeReturnTo(value: string | null) {
  return safeAccountReturnTo(value) || YOUTUBE_OPS_APP_URL;
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

  const returnTo = safeBridgeReturnTo(requestUrl.searchParams.get("returnTo"));
  const bridged = new URL(await appendAccountBridgeGrant(returnTo, user));
  bridged.searchParams.set("illco_product", product.id);
  bridged.searchParams.set("illco_source", "illco-command");

  return NextResponse.redirect(bridged);
}