export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const JOB_ID = /^[A-Za-z0-9_-]{6,180}$/;

function config() {
  const base = String(process.env.OPENMONTAGE_WORKER_URL || "").trim();
  const token = String(process.env.OPENMONTAGE_WORKER_TOKEN || "").trim();
  if (!base || !token) throw new Error("OpenMontage worker is not configured");
  return { base: base.endsWith("/") ? base : base + "/", token };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    if (!JOB_ID.test(jobId)) return Response.json({ error: "Invalid job id" }, { status: 400 });
    const worker = config();
    const response = await fetch(
      new URL(`v1/reference-jobs/${encodeURIComponent(jobId)}`, worker.base),
      {
        headers: { Authorization: `Bearer ${worker.token}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      },
    );
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "OpenMontage status failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
