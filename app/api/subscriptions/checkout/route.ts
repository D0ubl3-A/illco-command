import { NextResponse } from "next/server";

import { hasDatabase } from "@/lib/db";
import { getProductById } from "@/lib/deployments";
import type { FunnelPlanId } from "@/lib/env";
import { getMonetizationPlan } from "@/lib/monetization";
import { recordCheckoutSession } from "@/lib/checkout-store";
import { canDirectCheckoutPublicPlan, canDirectCheckoutPublicProduct } from "@/lib/public-checkout";
import { createCheckoutSession } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/user-accounts";

const planIds = new Set<FunnelPlanId>(["core", "studio", "suite", "agency", "enterprise"]);

function safeReturnTo(value: string) {
  const raw = value.trim();
  if (!raw) return "";

  try {
    if (raw.startsWith("/")) return raw;
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const allowed =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "illcoai.tech" ||
      hostname.endsWith(".illcoai.tech") ||
      hostname.endsWith(".illcoai.tech");

    return allowed && (url.protocol === "https:" || url.protocol === "http:") ? url.toString() : "";
  } catch {
    return "";
  }
}

function buildCheckoutReturnPath(returnTo: string, productId: string) {
  if (!returnTo) return null;
  const params = new URLSearchParams({
    checkout: "success",
    productId,
    returnTo,
  });
  return `/account?${params.toString()}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const productId = String(formData.get("productId") || "illco-command").trim();
  const planId = String(formData.get("planId") || "core").trim() as FunnelPlanId;
  const returnTo = safeReturnTo(String(formData.get("returnTo") || ""));

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ detail: "A valid billing email is required when provided." }, { status: 400 });
  }
  if (!planIds.has(planId)) {
    return NextResponse.json({ detail: "A known planId is required." }, { status: 400 });
  }
  if (productId !== "illco-command") {
    if (!getProductById(productId)) {
      return NextResponse.json({ detail: "Unknown productId." }, { status: 400 });
    }

    const monetization = getMonetizationPlan(productId);
    if (!monetization?.publicInFunnel) {
      return NextResponse.json({ detail: "This product is not available for direct public checkout." }, { status: 403 });
    }
    if (monetization.funnelPlanId !== planId) {
      return NextResponse.json({ detail: "Product and plan do not match." }, { status: 400 });
    }
    if (monetization.healthGate.behavior !== "allow-checkout") {
      return NextResponse.json({ detail: "This product is not available for direct checkout until health gates pass." }, { status: 409 });
    }
    if (!canDirectCheckoutPublicProduct(productId)) {
      return NextResponse.json({ detail: "This product is not available for direct public checkout until proof is ready." }, { status: 409 });
    }
  } else {
    const hasWorkingProductForPlan = canDirectCheckoutPublicPlan(planId);
    if (!hasWorkingProductForPlan) {
      return NextResponse.json({ detail: "This plan is not available for direct checkout until public proof and health gates pass." }, { status: 409 });
    }
  }

  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;
  if (hasDatabase()) {
    try {
      currentUser = await getCurrentUser();
    } catch {
      currentUser = null;
    }
  }

  const checkoutEmail = email || currentUser?.email || null;

  try {
    const session = await createCheckoutSession({
      email: checkoutEmail,
      productId,
      planId,
      returnPath: buildCheckoutReturnPath(returnTo, productId),
    });
    if (!session.url) {
      return NextResponse.json({ detail: "Stripe did not return a checkout URL." }, { status: 502 });
    }
    if (hasDatabase()) {
      try {
        await recordCheckoutSession({
          stripeSessionId: session.id,
          planId,
          productId,
          userId: currentUser?.id || null,
          email: checkoutEmail,
          checkoutUrl: session.url,
        });
      } catch {
        // Do not strand a buyer after Stripe has already created a live checkout session.
      }
    }
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Checkout session could not be created." },
      { status: 500 },
    );
  }
}
