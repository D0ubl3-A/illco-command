import { NextResponse } from "next/server";
import { z } from "zod";

import { hasDatabase } from "@/lib/db";
import {
  createLabelDistributor,
  createLabelRoyalty,
  createLabelSale,
  getLabelOperationsSnapshot,
} from "@/lib/label-command-operations-store";
import { isSameOriginRequest } from "@/lib/same-origin-request";
import { getCurrentUser } from "@/lib/user-accounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const distributorSchema = z.object({
  kind: z.literal("distributor"),
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  status: z.enum(["active", "paused", "inactive"]).default("active"),
  territories: z.array(z.string().trim().min(1).max(80)).max(250).default([]),
});

const saleSchema = z.object({
  kind: z.literal("sale"),
  workspaceId: z.string().uuid(),
  releaseId: z.string().uuid().nullable().optional(),
  trackId: z.string().uuid().nullable().optional(),
  artistId: z.string().uuid().nullable().optional(),
  distributorId: z.string().uuid().nullable().optional(),
  store: z.string().trim().min(1).max(160),
  territory: z.string().trim().max(80).optional().default(""),
  saleDate: z.string().date(),
  units: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional().default(0),
  streams: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional().default(0),
  grossAmount: z.number().finite().min(-1000000000).max(1000000000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional().default("USD"),
});

const royaltySchema = z.object({
  kind: z.literal("royalty"),
  workspaceId: z.string().uuid(),
  releaseId: z.string().uuid().nullable().optional(),
  trackId: z.string().uuid().nullable().optional(),
  artistId: z.string().uuid().nullable().optional(),
  payeeName: z.string().trim().min(1).max(180),
  periodStart: z.string().date().nullable().optional(),
  periodEnd: z.string().date().nullable().optional(),
  amount: z.number().finite().min(-1000000000).max(1000000000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional().default("USD"),
  status: z.enum(["pending", "approved", "paid", "held", "void"]).optional().default("pending"),
  payoutDate: z.string().date().nullable().optional(),
});

const mutationSchema = z.discriminatedUnion("kind", [distributorSchema, saleSchema, royaltySchema]);

function databaseUnavailable() {
  return NextResponse.json({ ok: false, error: "Database setup is required." }, { status: 503 });
}

export async function GET(request: Request) {
  if (!hasDatabase()) return databaseUnavailable();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to load label operations.", accountUrl: "/account" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = z.string().uuid().parse(searchParams.get("workspaceId"));
    const operations = await getLabelOperationsSnapshot(user.id, workspaceId);
    return NextResponse.json(
      { ok: true, workspaceId, ...operations },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "A valid workspaceId is required.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Label operations could not be loaded." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Cross-origin write rejected." }, { status: 403 });
  }
  if (!hasDatabase()) return databaseUnavailable();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to save label operations.", accountUrl: "/account" }, { status: 401 });
    }

    const body = mutationSchema.parse(await request.json());
    if (body.kind === "distributor") {
      const distributor = await createLabelDistributor(user.id, body.workspaceId, body);
      return NextResponse.json({ ok: true, distributor }, { status: 201 });
    }
    if (body.kind === "sale") {
      const sale = await createLabelSale(user.id, body.workspaceId, body);
      return NextResponse.json({ ok: true, sale }, { status: 201 });
    }
    const royalty = await createLabelRoyalty(user.id, body.workspaceId, body);
    return NextResponse.json({ ok: true, royalty }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Operations record is invalid.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Operations record could not be saved." },
      { status: 400 },
    );
  }
}
