import { NextResponse } from "next/server";

import { recordCheckoutSession } from "@/lib/checkout-store";
import { hasDatabase } from "@/lib/db";
import { getProductById } from "@/lib/deployments";
import { getLeadReference } from "@/lib/lead-store";
import { getMonetizationPlan } from "@/lib/monetization";
import { canDirectCheckoutPublicProduct } from "@/lib/public-checkout";
import { createOneTimeCheckoutSession } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/user-accounts";
import { YOUTUBE_OPS_PRODUCT_ID } from "@/lib/youtube-ops-integration";

const offerId = "youtube-rank-revival-ai-pro";
const offerPriceCents = 5000;

export const dynamic = "force-dynamic";

function returnToSalesPage(request: Request, checkout: "error" | "cancelled", reason?: string) {
  const url = new URL("/youtube-rank-revival", request.url);
  url.searchParams.set("checkout", checkout);
  if (reason) url.searchParams.set("reason", reason);
  url.hash = checkout === "cancelled" ? "pricing" : "intake";
  return url;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json(
    { detail: "Checkout sessions are created only by an intentional POST after a saved intake." },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "Cross-origin checkout requests are not allowed." }, { status: 403 });
  }

  if (!hasDatabase()) {
    return NextResponse.redirect(returnToSalesPage(request, "error", "intake-storage"), 303);
  }

  const formData = await request.formData().catch(() => null);
  const intakeId = String(formData?.get("intakeId") || "").trim();
  const lead = intakeId ? await getLeadReference(intakeId).catch(() => null) : null;
  if (!lead || lead.planId !== offerId) {
    return NextResponse.redirect(returnToSalesPage(request, "error", "invalid-intake"), 303);
  }

  const product = getProductById(YOUTUBE_OPS_PRODUCT_ID);
  if (!product) {
    return NextResponse.redirect(returnToSalesPage(request, "error", "product"), 303);
  }

  const monetization = getMonetizationPlan(YOUTUBE_OPS_PRODUCT_ID);
  if (
    !monetization?.publicInFunnel ||
    monetization.healthGate.behavior !== "allow-checkout" ||
    !canDirectCheckoutPublicProduct(YOUTUBE_OPS_PRODUCT_ID)
  ) {
    return NextResponse.redirect(returnToSalesPage(request, "error", "health-gate"), 303);
  }

  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    currentUser = await getCurrentUser();
  } catch {
    currentUser = null;
  }

  try {
    const metadata = {
      offerId,
      intakeId: lead.id,
      deliveryWindow: "24-72-hours-after-complete-intake",
      revisionRounds: "1",
      videoCount: "1",
    };
    const checkoutEmail = currentUser?.email || lead.email;
    const session = await createOneTimeCheckoutSession({
      email: checkoutEmail,
      productId: YOUTUBE_OPS_PRODUCT_ID,
      productName: "YouTube Rank Revival AI Pro",
      description:
        "One-video optimization sprint with titles, description, keyword positioning, thumbnail direction, hook feedback, audience notes, and a relaunch checklist.",
      amountCents: offerPriceCents,
      returnPath: "/youtube-rank-revival?checkout=success#intake",
      cancelPath: "/youtube-rank-revival?checkout=cancelled#pricing",
      metadata,
    });

    try {
      await recordCheckoutSession({
        stripeSessionId: session.id,
        planId: "core",
        productId: YOUTUBE_OPS_PRODUCT_ID,
        userId: currentUser?.id || null,
        email: checkoutEmail,
        checkoutUrl: session.url,
        metadata,
      });
    } catch (error) {
      console.error("Failed to record Rank Revival checkout session", error);
    }

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Failed to create Rank Revival checkout", error);
    return NextResponse.redirect(returnToSalesPage(request, "error", "checkout"), 303);
  }
}
