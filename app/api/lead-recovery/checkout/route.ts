import { NextResponse } from "next/server";

import { recordCheckoutSession } from "@/lib/checkout-store";
import { hasDatabase } from "@/lib/db";
import { getLeadReference } from "@/lib/lead-store";
import { createSetupPlusSubscriptionCheckoutSession } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/user-accounts";

const productId = "lead-recovery-system";
const setupAmountCents = 75_000;
const recurringAmountCents = 19_900;

export const dynamic = "force-dynamic";

function salesPage(request: Request, checkout: "error" | "cancelled", reason?: string) {
  const url = new URL("/lead-rescue", request.url);
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
    { detail: "Checkout sessions are created only by an intentional POST after a saved Lead Recovery intake." },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "Cross-origin checkout requests are not allowed." }, { status: 403 });
  }
  if (!hasDatabase()) {
    return NextResponse.redirect(salesPage(request, "error", "intake-storage"), 303);
  }

  const formData = await request.formData().catch(() => null);
  const intakeId = String(formData?.get("intakeId") || "").trim();
  const lead = intakeId ? await getLeadReference(intakeId).catch(() => null) : null;
  if (!lead || lead.planId !== productId) {
    return NextResponse.redirect(salesPage(request, "error", "invalid-intake"), 303);
  }

  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    currentUser = await getCurrentUser();
  } catch {
    currentUser = null;
  }

  try {
    const metadata = {
      offerId: productId,
      intakeId: lead.id,
      setupAmountCents: String(setupAmountCents),
      recurringAmountCents: String(recurringAmountCents),
      launchTarget: "7-business-days-after-access-and-approval",
    };
    const checkoutEmail = currentUser?.email || lead.email;
    const session = await createSetupPlusSubscriptionCheckoutSession({
      email: checkoutEmail,
      productId,
      setupName: "ILLCO Lead Recovery System Setup",
      setupDescription:
        "One-time installation covering missed-call text-back, qualification, booking, confirmation, routing, testing, handoff, and launch.",
      setupAmountCents,
      recurringName: "ILLCO Lead Recovery Management",
      recurringDescription:
        "Monthly monitoring, failure review, in-scope optimization, booking-path checks, and performance reporting.",
      recurringAmountCents,
      returnPath: "/delivery/checkout?offer=lead-recovery-system",
      cancelPath: "/lead-rescue?checkout=cancelled#pricing",
      metadata,
    });

    try {
      await recordCheckoutSession({
        stripeSessionId: session.id,
        planId: "suite",
        productId,
        userId: currentUser?.id || null,
        email: checkoutEmail,
        checkoutUrl: session.url,
        metadata,
      });
    } catch (error) {
      console.error("Failed to record Lead Recovery checkout session", error);
    }

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Failed to create Lead Recovery checkout", error);
    return NextResponse.redirect(salesPage(request, "error", "checkout"), 303);
  }
}
