import {
  AutoTubeServiceError,
  fetchAutoTubeArtifact,
  verifyArtifactToken,
} from "@/lib/autotube/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    if (!verifyArtifactToken(jobId, token)) {
      return Response.json(
        { ok: false, error: "invalid_download_token", message: "This AutoTube video link is invalid or expired." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const upstream = await fetchAutoTubeArtifact(jobId, request.headers.get("range") || "");
    const disposition = url.searchParams.get("disposition") === "attachment" ? "attachment" : "inline";
    const headers = new Headers();
    for (const name of [
      "accept-ranges",
      "content-length",
      "content-range",
      "content-type",
      "etag",
      "last-modified",
    ]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("Content-Type", headers.get("Content-Type") || "video/mp4");
    headers.set("Content-Disposition", `${disposition}; filename="autotube-${jobId}.mp4"`);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    const serviceError =
      error instanceof AutoTubeServiceError
        ? error
        : new AutoTubeServiceError("Unable to deliver AutoTube video.", 500, "delivery_failed");
    return Response.json(
      { ok: false, error: serviceError.code, message: serviceError.message },
      { status: serviceError.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
