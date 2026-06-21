import { NextResponse } from "next/server";

import { accountBridgeCorsHeaders, verifyAccountBridgeGrant } from "@/lib/account-bridge";

export function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: accountBridgeCorsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  const headers = accountBridgeCorsHeaders(request.headers.get("origin"));

  try {
    const body = (await request.json().catch(() => ({}))) as { grant?: string };
    const payload = verifyAccountBridgeGrant(body.grant);
    return NextResponse.json(
      {
        ok: true,
        authenticated: true,
        user: payload.user,
        purchases: payload.purchases,
        access: payload.access,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        detail: error instanceof Error ? error.message : "Account grant could not be verified.",
      },
      { status: 401, headers },
    );
  }
}
