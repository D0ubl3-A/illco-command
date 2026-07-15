import { NextResponse } from "next/server";

import { recordCheckoutSession } from "@/lib/checkout-store";
import { hasDatabase } from "@/lib/db";
import { getProductById } from "@/lib/deployments";
import { getMonetizationPlan } from "@/lib/monetization";
import { canDirectCheckoutPublicProduct } from "@/lib/public-checkout";
import { createOneTimeCheckoutSession } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/user-accounts";
import { YOUTUBE_OPS_PRODUCT_ID } from "@/lib/youtube-ops-integration";

const offerId = "youtube-rank-revival-ai-pro";
const offerPriceCents = 5000;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const product = getProductById(YOUTUBE_OPS_PRODUCT_ID);
  if (!product) {
    return NextResponse.json({ detail: "YouTube Rank Revival is not registered in ILLCO Command." }, { status: 500 });
  }

  const monetization = getMonetizationPlan(YOUTUBE_OPS_PRODUCT_ID);
  if (
    !monetization?.publicInFunnel ||
    monetization.healthGate.behavior !== "allow-checkout" ||
    !canDirectCheckoutPublicProduct(YOUTUBE_OPS_PRODUCT_ID)
  ) {
    return NextResponse.json({ detail: "Checkout is locked until the YouTube delivery path passes its health gate." }, { status: 409 });
  }

  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;
  if (hasDatabase()) {
    try {
      currentUser = await getCurrentUser();
    } catch {
      currentUser = null;
    }
  }

  const session = await createOneTimeCheckoutSession({
    email: currentUser?.email || null,
    productId: YOUTUBE_OPS_PRODUCT_ID,
    productName: "YouTube Rank Revival AI Pro",
    description: "One-video optimization sprint with titles, description, keyword positioning, thumbnail direction, hook feedback, audience notes, and a relaunch checklist.",
    amountCents: offerPriceCents,
    returnPath: "/youtube-rank-revival?checkout=success#intake",
    cancelPath: "/youtube-rank-revival?checkout=cancelled#pricing",
    metadata: {
      offerId,
      deliveryWindow: "24-72-hours-after-complete-intake",
      revisionRounds: "1",
      videoCount: "1",
    },
  });

  if (hasDatabase()) {
    try {
      await recordCheckoutSession({
        stripeSessionId: session.id,
        planId: "core",
        productId: YOUTUBE_OPS_PRODUCT_ID,
        userId: currentUser?.id || null,
        email: currentUser?.email || null,
        checkoutUrl: session.url,
      });
    } catch {
      // Stripe already created a valid session; do not strand the buyer if internal logging fails.
    }
  }

  return NextResponse.redirect(session.url, 303);
}
