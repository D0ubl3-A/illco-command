import { NextResponse } from "next/server";

import { runMasterAgent, type MasterAgentMode } from "@/lib/master-agent";

function parseMode(value: unknown): MasterAgentMode | undefined {
  return value === "route" || value === "sell" || value === "support" || value === "build" || value === "admin" ? value : undefined;
}

export async function GET() {
  return NextResponse.json(
    runMasterAgent({
      message: "Show the best ILLCO apps and tools for a buyer.",
      mode: "route",
      limit: 6,
    }),
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    message?: unknown;
    mode?: unknown;
    limit?: unknown;
  };
  const message = String(body.message || "").trim();

  if (!message) {
    return NextResponse.json({ detail: "Message is required." }, { status: 400 });
  }

  return NextResponse.json(
    runMasterAgent({
      message,
      mode: parseMode(body.mode),
      limit: Number.isFinite(body.limit) ? Number(body.limit) : undefined,
    }),
  );
}
