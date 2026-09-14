import { NextResponse } from "next/server";

import { runNexoraVenturePipeline } from "@/lib/nexora-agent-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    goal?: unknown;
    budgetUsd?: unknown;
    evidence?: unknown;
    constraints?: unknown;
  };

  const goal = String(body.goal || "").trim();
  if (!goal) {
    return NextResponse.json({ ok: false, detail: "goal is required" }, { status: 400 });
  }

  const parsedBudget = Number(body.budgetUsd ?? 100);
  const budgetUsd = Number.isFinite(parsedBudget) ? parsedBudget : 100;
  const evidence = typeof body.evidence === "string" ? body.evidence.trim() : "";
  const constraints = Array.isArray(body.constraints)
    ? body.constraints.map((value) => String(value).trim()).filter(Boolean).slice(0, 25)
    : [];

  try {
    const result = await runNexoraVenturePipeline({ goal, budgetUsd, evidence, constraints });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown venture-agent failure";
    const missingKey = /api[_ -]?key|OPENAI_API_KEY|authentication/i.test(message);

    return NextResponse.json(
      {
        ok: false,
        detail: missingKey
          ? "The Nexora venture agent requires OPENAI_API_KEY in this deployment."
          : "The Nexora venture pipeline could not complete this run.",
        error: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: missingKey ? 503 : 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Nexora Autonomous Venture Agent",
    model: "gpt-5.6-sol",
    stages: ["demand-scout", "offer-architect", "growth-operator", "auditor", "ceo-allocator"],
    approvalGates: ["external spending", "production deployment", "refunds", "legal/tax commitments", "destructive changes", "banking/debt"],
  });
}
