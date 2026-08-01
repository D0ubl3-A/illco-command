import {
  authorizeAutoTubeSession,
  autoTubeAccessResponse,
} from "@/lib/autotube/access";
import {
  AutoTubeServiceError,
  getAutoTubeConfigurationStatus,
  submitAutoTubeRender,
} from "@/lib/autotube/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function errorResponse(error: unknown) {
  const serviceError =
    error instanceof AutoTubeServiceError
      ? error
      : new AutoTubeServiceError("AutoTube render submission failed.", 500, "render_failed");
  return Response.json(
    { ok: false, error: serviceError.code, message: serviceError.message },
    { status: serviceError.status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const configuration = getAutoTubeConfigurationStatus();
  return Response.json(
    {
      ok: configuration.configured,
      service: "illco-autotube-production",
      version: "5.0.0",
      configuration,
      access: "authorized-illco-account",
    },
    {
      status: configuration.configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(request: Request) {
  const access = await authorizeAutoTubeSession();
  if (!access.ok) return autoTubeAccessResponse(access);

  try {
    const body = await request.json().catch(() => ({}));
    const job = await submitAutoTubeRender(body, requestOrigin(request));
    return Response.json(
      {
        ok: true,
        ...job,
        account: { email: access.user.email },
      },
      {
        status: 202,
        headers: {
          "Cache-Control": "no-store",
          Location: job.statusUrl,
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
