import { NextResponse } from "next/server";

import { assertAdminRequest } from "@/lib/license";
import { createPortalSession } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    assertAdminRequest(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin authorization failed.";
    const status = message.includes("ADMIN_API_KEY is required") ? 503 : 401;
    return NextResponse.json({ detail: message }, { status });
  }

  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? ((await request.json().catch(() => ({}))) as { stripeCustomerId?: string })
    : Object.fromEntries(await request.formData()) as { stripeCustomerId?: string };
  const stripeCustomerId = String(body.stripeCustomerId || "").trim();

  if (!stripeCustomerId.startsWith("cus_")) {
    return NextResponse.json({ detail: "A valid Stripe customer id is required." }, { status: 400 });
  }

  try {
    const session = await createPortalSession({ stripeCustomerId });
    if (!session.url) {
      return NextResponse.json({ detail: "Stripe did not return a billing portal URL." }, { status: 502 });
    }
    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ url: session.url });
    }
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Billing portal session could not be created." },
      { status: 500 },
    );
  }
}
