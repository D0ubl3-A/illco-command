import {
  AutoTubeServiceError,
  getAutoTubeRenderStatus,
} from "@/lib/autotube/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    const status = await getAutoTubeRenderStatus(jobId, requestOrigin(request));
    return Response.json(
      { ok: true, ...status },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const serviceError =
      error instanceof AutoTubeServiceError
        ? error
        : new AutoTubeServiceError("Unable to read AutoTube status.", 500, "status_failed");
    return Response.json(
      { ok: false, error: serviceError.code, message: serviceError.message },
      { status: serviceError.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
