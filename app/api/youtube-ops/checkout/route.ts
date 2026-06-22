import { NextResponse } from "next/server";

import { safeAccountReturnTo } from "@/lib/account-return";
import { recordCheckoutSession } from "@/lib/checkout-store";
import { hasDatabase } from "@/lib/db";
import { getProductById } from "@/lib/deployments";
import { getMonetizationPlan } from "@/lib/monetization";
import { canDirectCheckoutPublicProduct } from "@/lib/public-checkout";
import { createCheckoutSession } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/user-accounts";
import { YOUTUBE_OPS_APP_URL, YOUTUBE_OPS_PLAN_ID, YOUTUBE_OPS_PRODUCT_ID } from "@/lib/youtube-ops-integration";

function safeYoutubeOpsReturnTo(value: string | null) {
  return safeAccountReturnTo(value) || YOUTUBE_OPS_APP_URL;
}

function buildCheckoutReturnPath(returnTo: string) {
  const params = new URLSearchParams({
    checkout: "success",
    productId: YOUTUBE_OPS_PRODUCT_ID,
    returnTo,
  });
  return `/account?${params.toString()}`;
}

export async function GET(request: Request) {
  const product = getProductById(YOUTUBE_OPS_PRODUCT_ID);
  if (!product) {
    return NextResponse.json({ detail: "YouTube Ops is not registered in ILLCO Command." }, { status: 500 });
  }

  const monetization = getMonetizationPlan(YOUTUBE_OPS_PRODUCT_ID);
  if (!monetization?.publicInFunnel || monetization.funnelPlanId !== YOUTUBE_OPS_PLAN_ID) {
    return NextResponse.json({ detail: "YouTube Ops is not configured for public checkout." }, { status: 409 });
  }
  if (monetization.healthGate.behavior !== "allow-checkout" || !canDirectCheckoutPublicProduct(YOUTUBE_OPS_PRODUCT_ID)) {
    return NextResponse.json({ detail: "YouTube Ops checkout is locked until proof and health gates pass." }, { status: 409 });
  }

  const requestUrl = new URL(request.url);
  const returnTo = safeYoutubeOpsReturnTo(requestUrl.searchParams.get("returnTo"));
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;
  if (hasDatabase()) {
    try {
      currentUser = await getCurrentUser();
    } catch {
      currentUser = null;
    }
  }

  const session = await createCheckoutSession({
    email: currentUser?.email || null,
    productId: YOUTUBE_OPS_PRODUCT_ID,
    planId: YOUTUBE_OPS_PLAN_ID,
    returnPath: buildCheckoutReturnPath(returnTo),
  });
  if (!session.url) {
    return NextResponse.json({ detail: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  if (hasDatabase()) {
    try {
      await recordCheckoutSession({
        stripeSessionId: session.id,
        planId: YOUTUBE_OPS_PLAN_ID,
        productId: YOUTUBE_OPS_PRODUCT_ID,
        userId: currentUser?.id || null,
        email: currentUser?.email || null,
        checkoutUrl: session.url,
      });
    } catch {
      // Do not strand a buyer after Stripe has already created a checkout session.
    }
  }

  return NextResponse.redirect(session.url, 303);
}