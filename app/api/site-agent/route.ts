import { Agent, run } from "@openai/agents";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { runMasterAgent, type MasterAgentMode } from "@/lib/master-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_AGENT_TIMEOUT_MS = 12_000;

const siteAgent = new Agent({
  name: "ILLCO Site Sales Agent",
  model: process.env.SITE_AGENT_MODEL || "gpt-5-nano",
  instructions: [
    "You are the ILLCO AI website sales and routing agent.",
    "Route visitors to the best ILLCO app, product page, account path, Helloskip proof lane, or custom quote lane.",
    "Do not invent products, prices, URLs, guarantees, or checkout readiness.",
    "Use the provided deterministic catalog recommendations as the source of truth.",
    "Keep answers direct, buyer-focused, and ready to display inside a compact site assistant.",
    "Return strict JSON only with keys summary and nextSteps. nextSteps must be 2-4 short strings.",
  ].join(" "),
});

function parseMode(value: unknown): MasterAgentMode | undefined {
  return value === "route" || value === "sell" || value === "support" || value === "build" || value === "admin" ? value : undefined;
}

function ensureOpenAiKey() {
  if (!process.env.OPENAI_API_KEY && env.codexApiKey) {
    process.env.OPENAI_API_KEY = env.codexApiKey;
  }
  return Boolean(process.env.OPENAI_API_KEY);
}

function parseAgentJson(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const raw = fenced || trimmed;
  try {
    const parsed = JSON.parse(raw) as { summary?: unknown; nextSteps?: unknown };
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      nextSteps: Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps.map((step) => String(step || "").trim()).filter(Boolean).slice(0, 4)
        : [],
    };
  } catch {
    return { summary: "", nextSteps: [] };
  }
}

async function runSiteAgentPrompt(prompt: string) {
  const timeout = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new Error(`Site Agent SDK timed out after ${SITE_AGENT_TIMEOUT_MS}ms.`));
    }, SITE_AGENT_TIMEOUT_MS);
  });

  const result = await Promise.race([run(siteAgent, prompt), timeout]);
  return String((result as { finalOutput?: unknown })?.finalOutput || "").trim();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    message?: unknown;
    mode?: unknown;
    limit?: unknown;
    petId?: unknown;
  };
  const message = String(body.message || "").trim();

  if (!message) {
    return NextResponse.json({ detail: "Message is required." }, { status: 400 });
  }

  const deterministic = runMasterAgent({
    message,
    mode: parseMode(body.mode),
    limit: Number.isFinite(body.limit) ? Number(body.limit) : 5,
  });

  if (!ensureOpenAiKey()) {
    return NextResponse.json({
      ...deterministic,
      siteAgent: {
        source: "fallback",
        note: "Agent SDK disabled because OPENAI_API_KEY is not configured.",
      },
    });
  }

  const topRecommendations = deterministic.recommendations.slice(0, 4).map((item) => ({
    name: item.name,
    category: item.category,
    summary: item.summary,
    detailsHref: item.detailsHref,
    requestHref: item.requestHref,
    openHref: item.openHref,
    canOpen: item.canOpen,
    canCheckout: item.canCheckout,
    reason: item.reason,
  }));

  try {
    const output = await runSiteAgentPrompt(
      [
        `Visitor message: ${message}`,
        `Active assistant character: ${String(body.petId || "site-agent")}`,
        `Detected mode: ${deterministic.mode}`,
        `Inventory: ${JSON.stringify(deterministic.inventory)}`,
        `Recommended catalog routes: ${JSON.stringify(topRecommendations)}`,
        `Deterministic summary: ${deterministic.summary}`,
        "Write one compact buyer-facing summary and next steps. Return JSON only.",
      ].join("\n"),
    );
    const parsed = parseAgentJson(output);

    return NextResponse.json({
      ...deterministic,
      summary: parsed.summary || deterministic.summary,
      nextSteps: parsed.nextSteps.length ? parsed.nextSteps : deterministic.nextSteps,
      siteAgent: {
        source: parsed.summary ? "agent-sdk" : "agent-sdk-unparsed",
      },
    });
  } catch (error) {
    return NextResponse.json({
      ...deterministic,
      siteAgent: {
        source: "fallback",
        note: error instanceof Error ? error.message : "Site Agent SDK failed.",
      },
    });
  }
}
