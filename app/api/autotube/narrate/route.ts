import {
  authorizeAutoTubeSession,
  autoTubeAccessResponse,
} from "@/lib/autotube/access";
import {
  AutoTubeServiceError,
  createNarrationAudio,
  getAutoTubeConfigurationStatus,
} from "@/lib/autotube/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function errorResponse(error: unknown) {
  const serviceError =
    error instanceof AutoTubeServiceError
      ? error
      : new AutoTubeServiceError("AutoTube narration failed.", 500, "narration_failed");
  return Response.json(
    { ok: false, error: serviceError.code, message: serviceError.message },
    { status: serviceError.status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const status = getAutoTubeConfigurationStatus();
  return Response.json(
    {
      ok: status.narration,
      narration: status.narration,
      browserFetchRequired: false,
      access: "authorized-illco-account",
    },
    { status: status.narration ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const access = await authorizeAutoTubeSession();
  if (!access.ok) return autoTubeAccessResponse(access);

  try {
    const body = await request.json().catch(() => ({}));
    const narration = await createNarrationAudio(body);
    const audioBody = new Uint8Array(narration.bytes.byteLength);
    audioBody.set(narration.bytes);
    return new Response(audioBody.buffer, {
      status: 200,
      headers: {
        "Content-Type": narration.mimeType,
        "Content-Disposition": 'inline; filename="autotube-narration.mp3"',
        "Cache-Control": "private, no-store, max-age=0",
        "X-AutoTube-Narration-Source": narration.source,
        "X-AutoTube-Account": access.user.email,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
