import { NextResponse } from "next/server";
import { normalizeFactCheck } from "@/lib/debate-fact-check";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { claim } = await request.json().catch(() => ({ claim: "" }));
  const cleanClaim = String(claim || "").replace(/\s+/g, " ").trim().slice(0, 1800);
  if (cleanClaim.length < 8) return NextResponse.json({ error: "A complete factual claim is required." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Live fact-checking is not configured." }, { status: 503 });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.DEBATE_FACT_CHECK_MODEL || "gpt-5-mini",
      tools: [{ type: "web_search_preview" }],
      input: [
        { role: "system", content: "Fact-check the speaker's exact claim using current reliable web sources. Return JSON only with claim, verdict (true, false, or unverified), explanation (one short sentence), confidence (0-100), and sources (up to 3 objects with title and url). Use unverified whenever evidence is insufficient or the claim is opinion/mixed; never guess." },
        { role: "user", content: cleanClaim },
      ],
      text: { format: { type: "json_object" } },
    }),
  });
  const payload = await response.json();
  if (!response.ok) return NextResponse.json({ error: payload?.error?.message || "Fact-check failed." }, { status: 502 });
  const raw = payload.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).find((item: { text?: string }) => item.text)?.text;
  try {
    return NextResponse.json(normalizeFactCheck(JSON.parse(raw || "{}")));
  } catch {
    return NextResponse.json({ error: "The fact-check result could not be read." }, { status: 502 });
  }
}

