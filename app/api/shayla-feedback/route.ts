import { Agent, run } from "@openai/agents";
import { NextResponse } from "next/server";

import { addShaylaFeedback, getShaylaFeedbackSnapshot } from "@/lib/shayla-feedback";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const shaylaAgent = new Agent({
  name: "Shayla Creative Feedback Agent",
  instructions: [
    "You convert Shayla's feedback into precise production notes for ILLCO videos and product visuals.",
    "Be decisive and practical. Focus on whether the asset pops, whether text is centered, whether backing panels help readability, and whether the next render should change mic, boombox, portrait, or CTA placement.",
    "Return one short diagnosis and 2-5 concrete action items.",
  ].join(" "),
});

function parseActionItems(reply: string) {
  return reply
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => /^(make|move|center|increase|reduce|replace|add|remove|check|render|tighten|fix|use)\b/i.test(line))
    .slice(0, 5);
}

export async function GET() {
  return NextResponse.json(getShaylaFeedbackSnapshot());
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    message?: string;
    productId?: string;
  };
  const message = String(payload.message || "").trim();
  const productId = String(payload.productId || "vault-select-exclusive-trap-beat").trim();

  if (!message) {
    return NextResponse.json({ detail: "Feedback message is required." }, { status: 400 });
  }

  let agentReply = "";
  if (env.codexApiKey) {
    const result = await run(
      shaylaAgent,
      [
        `Target: ${productId}`,
        `Shayla feedback: ${message}`,
        "Return a diagnosis and production action items for the next render/deploy.",
      ].join("\n"),
    );
    agentReply = String(result.finalOutput || "").trim();
  } else {
    agentReply = [
      "Diagnosis: the asset needs a stronger music object and more dimensional pop.",
      "Action items:",
      "- Replace flat text-heavy visuals with a mic or boombox pop-up scene.",
      "- Make the music object larger and more dimensional.",
      "- Keep text centered and only use backing panels where they improve readability.",
    ].join("\n");
  }

  const actionItems = parseActionItems(agentReply);
  const item = addShaylaFeedback({
    productId,
    message,
    agentReply,
    actionItems: actionItems.length ? actionItems : ["Review Shayla feedback and apply the next visual polish pass."],
  });

  return NextResponse.json({ item, snapshot: getShaylaFeedbackSnapshot() });
}

