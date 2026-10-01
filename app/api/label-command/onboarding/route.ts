import { NextResponse } from "next/server";

import { hasDatabase } from "@/lib/db";
import { requireLabelCommandAccess } from "@/lib/label-command-access";
import { createLabelAccount } from "@/lib/label-command-store";
import { isSameOriginRequest } from "@/lib/same-origin-request";
import { getCurrentUser } from "@/lib/user-accounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Cross-origin onboarding rejected." }, { status: 403 });
  }
  const access = requireLabelCommandAccess(request);
  if (!access.ok) return access.response;
  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, error: "The account database is required." }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/account", request.url), 303);
  const form = await request.formData();
  try {
    await createLabelAccount(user, {
      accountType: form.get("accountType"),
      displayName: form.get("displayName"),
      labelName: form.get("labelName"),
      artistName: form.get("artistName"),
      genre: form.get("genre"),
    });
    return NextResponse.redirect(new URL("/label-command?onboarding=complete", request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onboarding failed.";
    return NextResponse.redirect(new URL(`/label-command/onboarding?error=${encodeURIComponent(message)}`, request.url), 303);
  }
}
