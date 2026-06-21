import { NextResponse } from "next/server";

import { verifyCheckoutAccessGrant } from "@/lib/checkout-success";
import { createPortalSession, retrieveCheckoutSession } from "@/lib/stripe";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? ((await request.json().catch(() => ({}))) as { sessionId?: string; grant?: string })
    : Object.fromEntries(await request.formData()) as { sessionId?: string; grant?: string };

  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ detail: "A valid Stripe checkout session id is required." }, { status: 400 });
  }

  try {
    verifyCheckoutAccessGrant(String(body.grant || ""), sessionId);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Checkout access could not be verified." },
      { status: 401 },
    );
  }

  try {
    const session = await retrieveCheckoutSession(sessionId);
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";

    if (!stripeCustomerId.startsWith("cus_")) {
      return NextResponse.json({ detail: "This checkout session does not have a Stripe customer yet." }, { status: 409 });
    }

    const portal = await createPortalSession({
      stripeCustomerId,
      returnPath: `/account?portal=return&session_id=${encodeURIComponent(sessionId)}`,
    });

    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ url: portal.url });
    }

    return NextResponse.redirect(portal.url, 303);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Billing portal session could not be created." },
      { status: 500 },
    );
  }
}
