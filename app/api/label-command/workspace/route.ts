import { NextResponse } from "next/server";

import { hasDatabase } from "@/lib/db";
import { requireLabelCommandAccess } from "@/lib/label-command-access";
import { getLabelOperationsSnapshot } from "@/lib/label-command-operations-store";
import { getLabelWorkspaceSnapshot } from "@/lib/label-command-store";
import { getCurrentUser } from "@/lib/user-accounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = requireLabelCommandAccess(request);
  if (!access.ok) return access.response;

  if (!hasDatabase()) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      databaseReady: false,
      detail: "Connect the account database to save label records.",
    });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        databaseReady: true,
        accountUrl: "/account",
      });
    }

    const snapshot = await getLabelWorkspaceSnapshot(user);
    if (!snapshot) {
      return NextResponse.json({
        ok: true,
        authenticated: true,
        databaseReady: true,
        onboardingRequired: true,
        onboardingUrl: "/label-command/onboarding",
      });
    }
    const operations = await getLabelOperationsSnapshot(user.id, snapshot.workspace.id);

    return NextResponse.json(
      {
        ok: true,
        authenticated: true,
        databaseReady: true,
        access: {
          active: true,
          source: access.result.source,
          expiresAt: access.result.expiresAt || null,
        },
        syncedAt: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        ...snapshot,
        operations,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        databaseReady: false,
        error: error instanceof Error ? error.message : "Label workspace is temporarily unavailable.",
      },
      { status: 503 },
    );
  }
}
