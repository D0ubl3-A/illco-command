import { NextResponse } from "next/server";
import { z } from "zod";

import { hasDatabase } from "@/lib/db";
import { requireLabelCommandAccess } from "@/lib/label-command-access";
import {
  getDistributionSnapshot,
  requestReleaseTakedown,
  runReleaseQc,
  submitReleaseDistribution,
  upsertReleaseRights,
} from "@/lib/label-command-distribution-store";
import { isSameOriginRequest } from "@/lib/same-origin-request";
import { getCurrentUser } from "@/lib/user-accounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const rightsSchema = z.object({
  action: z.literal("rights"),
  workspaceId: z.string().uuid(),
  releaseId: z.string().uuid(),
  masterOwnershipConfirmed: z.boolean(),
  compositionRightsConfirmed: z.boolean(),
  samplesCleared: z.boolean(),
  featuredArtistClearances: z.boolean(),
  coverSong: z.boolean(),
  coverLicenseStatus: z.enum(["not_applicable", "required", "cleared", "blocked"]),
  contentIdEligibility: z.enum(["eligible", "ineligible", "review_required"]),
  territoryRights: z.array(z.string().trim().min(1).max(80)).min(1).max(250),
});

const qcSchema = z.object({
  action: z.literal("qc"),
  workspaceId: z.string().uuid(),
  releaseId: z.string().uuid(),
});

const submitSchema = z.object({
  action: z.literal("submit"),
  workspaceId: z.string().uuid(),
  releaseId: z.string().uuid(),
  provider: z.string().trim().min(1).max(120),
  destinations: z.array(z.string().trim().min(1).max(80)).min(1).max(100),
});

const takedownSchema = z.object({
  action: z.literal("takedown"),
  workspaceId: z.string().uuid(),
  releaseId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
});

const mutationSchema = z.discriminatedUnion("action", [rightsSchema, qcSchema, submitSchema, takedownSchema]);

function databaseUnavailable() {
  return NextResponse.json({ ok: false, error: "Database setup is required." }, { status: 503 });
}

export async function GET(request: Request) {
  const access = requireLabelCommandAccess(request);
  if (!access.ok) return access.response;
  if (!hasDatabase()) return databaseUnavailable();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to load distribution status.", accountUrl: "/account" }, { status: 401 });
    }
    const url = new URL(request.url);
    const workspaceId = z.string().uuid().parse(url.searchParams.get("workspaceId"));
    const releaseIdRaw = url.searchParams.get("releaseId");
    const releaseId = releaseIdRaw ? z.string().uuid().parse(releaseIdRaw) : null;
    const distribution = await getDistributionSnapshot(user.id, workspaceId, releaseId);
    return NextResponse.json({ ok: true, workspaceId, releaseId, ...distribution }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Distribution query is invalid.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Distribution status could not be loaded." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Cross-origin distribution write rejected." }, { status: 403 });
  }
  const access = requireLabelCommandAccess(request);
  if (!access.ok) return access.response;
  if (!hasDatabase()) return databaseUnavailable();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to use distribution.", accountUrl: "/account" }, { status: 401 });
    }
    const body = mutationSchema.parse(await request.json());
    if (body.action === "rights") {
      const rights = await upsertReleaseRights(user.id, body.workspaceId, body.releaseId, body);
      return NextResponse.json({ ok: true, rights });
    }
    if (body.action === "qc") {
      const qc = await runReleaseQc(user.id, body.workspaceId, body.releaseId);
      return NextResponse.json({ ok: true, qc });
    }
    if (body.action === "submit") {
      const job = await submitReleaseDistribution(user.id, body.workspaceId, body.releaseId, body.provider, body.destinations);
      return NextResponse.json({ ok: true, job }, { status: job.idempotent ? 200 : 202 });
    }
    const takedown = await requestReleaseTakedown(user.id, body.workspaceId, body.releaseId, body.reason);
    return NextResponse.json({ ok: true, takedown }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Distribution request is invalid.", issues: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Distribution request failed.";
    const status = message.startsWith("DISTRIBUTION_PROVIDER_DISCONNECTED") ? 409 : message.includes("QC blocker") ? 422 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
