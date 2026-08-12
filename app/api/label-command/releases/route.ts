import { NextResponse } from "next/server";
import { z } from "zod";

import { hasDatabase } from "@/lib/db";
import { requireLabelCommandAccess } from "@/lib/label-command-access";
import { createLabelRelease } from "@/lib/label-command-store";
import { isSameOriginRequest } from "@/lib/same-origin-request";
import { getCurrentUser } from "@/lib/user-accounts";

export const runtime = "nodejs";

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string(),
  artistId: z.string().uuid().nullable().optional(),
  releaseType: z.string().optional(),
  stage: z.string().optional(),
  targetDate: z.string().nullable().optional(),
  explicit: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Cross-origin write rejected." }, { status: 403 });
  }
  const access = requireLabelCommandAccess(request);
  if (!access.ok) return access.response;

  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, error: "Database setup is required." }, { status: 503 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to create a release.", accountUrl: "/account" }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());
    const release = await createLabelRelease(user.id, body.workspaceId, body);
    return NextResponse.json({ ok: true, release }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Release information is invalid.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Release creation failed." },
      { status: 400 },
    );
  }
}
