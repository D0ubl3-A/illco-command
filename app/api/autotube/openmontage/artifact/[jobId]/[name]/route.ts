export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const JOB_ID = /^[A-Za-z0-9_-]{6,180}$/;
const ARTIFACTS = new Set(["video", "audio", "subtitles", "manifest"]);

function config() {
  const base = String(process.env.OPENMONTAGE_WORKER_URL || "").trim();
  const token = String(process.env.OPENMONTAGE_WORKER_TOKEN || "").trim();
  if (!base || !token) throw new Error("OpenMontage worker is not configured");
  return { base: base.endsWith("/") ? base : base + "/", token };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string; name: string }> },
) {
  try {
    const { jobId, name } = await context.params;
    if (!JOB_ID.test(jobId)) return Response.json({ error: "Invalid job id" }, { status: 400 });
    if (!ARTIFACTS.has(name)) return Response.json({ error: "Unknown artifact" }, { status: 404 });

    const worker = config();
    const response = await fetch(
      new URL(
        `v1/reference-jobs/${encodeURIComponent(jobId)}/artifacts/${encodeURIComponent(name)}`,
        worker.base,
      ),
      {
        headers: { Authorization: `Bearer ${worker.token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(240000),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return Response.json(
        { error: detail || `OpenMontage artifact unavailable (${response.status})` },
        { status: response.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    const headers = new Headers();
    for (const key of ["content-type", "content-length", "content-disposition", "accept-ranges"]) {
      const value = response.headers.get(key);
      if (value) headers.set(key, value);
    }
    headers.set("Cache-Control", "private, no-store");
    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "OpenMontage artifact proxy failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
