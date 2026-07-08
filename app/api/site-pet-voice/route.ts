import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    petId?: unknown;
    text?: unknown;
  };
  const petId = String(body.petId || "").trim();
  const text = String(body.text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);

  if (petId !== "m3ntally-ill") {
    return NextResponse.json({ detail: "Custom voice is only attached to m3ntally-ill." }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ detail: "Text is required." }, { status: 400 });
  }

  if (!env.elevenLabsApiKey || !env.m3ntallyIllVoiceId) {
    return NextResponse.json(
      { detail: "Set ELEVENLABS_API_KEY and ELEVENLABS_M3NTALLY_ILL_VOICE_ID to enable the custom voice." },
      { status: 503 },
    );
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.m3ntallyIllVoiceId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": env.elevenLabsApiKey,
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: env.elevenLabsModelId,
      voice_settings: {
        stability: 0.42,
        similarity_boost: 0.82,
        style: 0.48,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return NextResponse.json(
      { detail: detail || "ElevenLabs voice generation failed." },
      { status: response.status || 502 },
    );
  }

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": response.headers.get("content-type") || "audio/mpeg",
    },
  });
}
