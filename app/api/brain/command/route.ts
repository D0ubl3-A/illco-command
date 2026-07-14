import { NextRequest, NextResponse } from "next/server";

import { isTrustedAdminEmail } from "@/lib/admin-identities";
import { executeBrainCommand } from "@/lib/brain-store";
import { getCurrentUser } from "@/lib/user-accounts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isTrustedAdminEmail(user.email)) {
      return NextResponse.json({ error: "Brain OS admin authentication is required." }, { status: 401 });
    }

    const body = (await request.json()) as { command?: unknown };
    const command = String(body.command || "").trim();
    if (!command) {
      return NextResponse.json({ error: "Enter a Brain OS command." }, { status: 400 });
    }

    const result = await executeBrainCommand(user.email, command);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Brain command failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
