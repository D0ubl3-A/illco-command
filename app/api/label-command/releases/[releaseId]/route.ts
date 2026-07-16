import { NextResponse } from "next/server";
import { z } from "zod";

import { hasDatabase } from "@/lib/db";
import { labelReleaseStages } from "@/lib/label-command-domain";
import { updateLabelReleaseStage } from "@/lib/label-command-release-stage";
import { archiveLabelRelease } from "@/lib/label-command-store";
import { isSameOriginRequest } from "@/lib/same-origin-request";
import { getCurrentUser } from "@/lib/user-accounts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ releaseId: string }>;
};

const releaseIdSchema = z.string().uuid();
const stageUpdateSchema = z.object({
  workspaceId: z.string().uuid(),
  stage: z.enum(labelReleaseStages),
});

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Cross-origin write rejected." }, { status: 403 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, error: "Database setup is required." }, { status: 503 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to update a release.", accountUrl: "/account" }, { status: 401 });
    }

    const { releaseId: rawReleaseId } = await context.params;
    const releaseId = releaseIdSchema.parse(rawReleaseId);
    const body = stageUpdateSchema.parse(await request.json());
    const release = await updateLabelReleaseStage(user.id, body.workspaceId, releaseId, body.stage);
    return NextResponse.json({ ok: true, release });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Release stage update is invalid.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Release stage update failed." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Cross-origin write rejected." }, { status: 403 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, error: "Database setup is required." }, { status: 503 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to archive a release.", accountUrl: "/account" }, { status: 401 });
    }

    const { releaseId: rawReleaseId } = await context.params;
    const releaseId = releaseIdSchema.parse(rawReleaseId);
    const workspaceId = z.string().uuid().parse(new URL(request.url).searchParams.get("workspaceId"));
    const result = await archiveLabelRelease(user.id, workspaceId, releaseId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Release archive request is invalid.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Release archive failed." },
      { status: 400 },
    );
  }
}
