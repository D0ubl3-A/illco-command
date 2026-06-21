import { NextResponse } from "next/server";

import { getCodexSdkEntitlement } from "@/lib/codex-entitlements";
import { getCodexSdkConfiguration, runCodexSdkReadOnlyPrompt } from "@/lib/codex-sdk-provider";
import { getCurrentUser, isAccountsConfigured, listUserPurchases } from "@/lib/user-accounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function readPrompt(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 2000);
}

async function authorizeCodexSdkAccess() {
  if (!isAccountsConfigured()) {
    return { response: json(503, { ok: false, detail: "Account database is required before Codex SDK access can be checked." }) };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { response: json(401, { ok: false, detail: "Sign in before using Codex SDK access.", accountUrl: "/account" }) };
  }

  const purchases = await listUserPurchases(user);
  const entitlement = getCodexSdkEntitlement(purchases);
  if (!entitlement.allowed) {
    return {
      response: json(403, {
        ok: false,
        detail: entitlement.reason,
        entitlement,
        upgradePlan: entitlement.requiredPlan,
      }),
    };
  }

  return { user, entitlement };
}

export async function GET() {
  try {
    const authorized = await authorizeCodexSdkAccess();
    if (authorized.response) return authorized.response;

    const config = getCodexSdkConfiguration();
    return json(200, {
      ok: true,
      codexSdkReady: config.ready,
      missing: config.missing,
      entitlement: authorized.entitlement,
    });
  } catch {
    return json(503, { ok: false, detail: "Codex SDK access could not be checked right now." });
  }
}

export async function POST(request: Request) {
  let body: { prompt?: unknown };
  try {
    body = (await request.json()) as { prompt?: unknown };
  } catch {
    return json(400, { ok: false, detail: "JSON body is required." });
  }

  const prompt = readPrompt(body.prompt);
  if (!prompt) {
    return json(400, { ok: false, detail: "Prompt is required." });
  }

  try {
    const authorized = await authorizeCodexSdkAccess();
    if (authorized.response) return authorized.response;

    const config = getCodexSdkConfiguration();
    if (!config.ready) {
      return json(503, {
        ok: false,
        detail: "Codex SDK credentials are not configured.",
        missing: config.missing,
      });
    }

    const result = await runCodexSdkReadOnlyPrompt(prompt);
    return json(200, {
      ok: true,
      entitlement: authorized.entitlement,
      result,
    });
  } catch (error) {
    return json(500, {
      ok: false,
      detail: error instanceof Error ? error.message : "Codex SDK run failed.",
    });
  }
}
