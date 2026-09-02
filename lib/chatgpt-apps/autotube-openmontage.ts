export const AUTOTUBE_OPENMONTAGE_TOOL_NAME = "autotube_openmontage_reference";
const OPENMONTAGE_REPOSITORY = "https://github.com/calesthio/OpenMontage";

function text(value: unknown, max: number, fallback = "") {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, max);
}

function safeUrl(value: unknown) {
  const candidate = text(value, 2048);
  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function workerConfig() {
  const base = String(
    process.env.OPENMONTAGE_WORKER_URL ||
    process.env.AUTOTUBE_RENDER_SERVICE_URL ||
    "",
  ).trim();
  const token = String(
    process.env.OPENMONTAGE_WORKER_TOKEN ||
    process.env.AUTOTUBE_RENDER_SERVICE_TOKEN ||
    "",
  ).trim();
  return {
    base: base ? (base.endsWith("/") ? base : base + "/") : "",
    token,
    source:
      process.env.OPENMONTAGE_WORKER_URL || process.env.OPENMONTAGE_WORKER_TOKEN
        ? "openmontage-env"
        : "autotube-renderer-fallback",
  };
}

export function openMontageToolDefinition() {
  return {
    name: AUTOTUBE_OPENMONTAGE_TOOL_NAME,
    title: "Ingest reference video with OpenMontage",
    description:
      "Use the real OpenMontage worker to download a permitted reference video for analysis, extract audio and subtitles, and prepare it for complete-argument segmentation, source-backed fact checking, visual evidence sprites, and AutoTube clip rendering.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        reference_video_url: { type: "string", format: "uri" },
        reference_video_date: { type: "string", maxLength: 32 },
        target_topic: { type: "string", maxLength: 500 },
        creative_goal: { type: "string", maxLength: 700 },
        max_resolution: {
          type: "string",
          enum: ["360p", "480p", "720p", "1080p"],
          default: "720p",
        },
        max_duration_seconds: {
          type: "integer",
          minimum: 30,
          maximum: 21600,
          default: 7200,
        },
        download_subtitles: { type: "boolean", default: true },
      },
      required: ["reference_video_url"],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  };
}

export function buildOpenMontageReferenceBrief(input: unknown) {
  const source = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const url = safeUrl(source.reference_video_url);
  if (!url) throw new Error("A valid HTTP(S) reference_video_url is required.");
  return {
    integration: "OpenMontage real-worker reference ingest",
    repository: OPENMONTAGE_REPOSITORY,
    reference: {
      url,
      suppliedDate: text(source.reference_video_date, 32) || null,
    },
    target: {
      topic: text(source.target_topic, 500) || null,
      creativeGoal: text(
        source.creative_goal,
        700,
        "Capture complete arguments, preserve rebuttals, fact-check claims, and add evidence-driven visual sprites.",
      ),
    },
    downstreamPlan: [
      "download reference video",
      "extract analysis audio and subtitles",
      "diarize or identify speakers",
      "detect complete argument boundaries including rebuttals",
      "extract checkable claims",
      "verify claims against current authoritative sources",
      "build evidence cards and visual sprites",
      "cut platform-native clips without truncating the argument",
      "render captions, labels, citations, and fact-check overlays",
      "validate final playable media",
    ],
  };
}

export async function openMontageToolOutput(input: unknown, origin: string) {
  try {
    const brief = buildOpenMontageReferenceBrief(input);
    const source = input as Record<string, unknown>;
    const config = workerConfig();
    if (!config.base || !config.token) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: "The OpenMontage worker is integrated, but neither the OpenMontage-specific variables nor the existing AutoTube render-service URL/token are configured.",
        }],
        _meta: { autotubeOpenMontage: brief, executionMode: "real-worker-unconfigured" },
      };
    }

    const response = await fetch(new URL("v1/reference-jobs", config.base), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: brief.reference.url,
        reference_video_date: brief.reference.suppliedDate,
        target_topic: brief.target.topic,
        creative_goal: brief.target.creativeGoal,
        max_resolution: text(source.max_resolution, 16, "720p"),
        max_duration_seconds: Math.min(21600, Math.max(30, Number(source.max_duration_seconds) || 7200)),
        download_subtitles: source.download_subtitles !== false,
      }),
      signal: AbortSignal.timeout(120000),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 1200);
      throw new Error(`OpenMontage worker rejected the job: ${detail || response.status}`);
    }
    const result = await response.json() as Record<string, unknown>;
    const jobId = text(result.job_id ?? result.jobId, 180);
    if (!jobId) throw new Error("OpenMontage worker returned no job id.");

    const baseOrigin = origin.replace(/\/$/, "");
    const structuredContent = {
      app: "autotube",
      integration: "openmontage",
      executionMode: "real-worker",
      jobId,
      status: text(result.status, 40, "queued"),
      progress: Number(result.progress || 0),
      referenceVideoUrl: brief.reference.url,
      statusUrl: `${baseOrigin}/api/autotube/openmontage/status/${encodeURIComponent(jobId)}`,
      videoUrl: `${baseOrigin}/api/autotube/openmontage/artifact/${encodeURIComponent(jobId)}/video`,
      audioUrl: `${baseOrigin}/api/autotube/openmontage/artifact/${encodeURIComponent(jobId)}/audio`,
      subtitlesUrl: `${baseOrigin}/api/autotube/openmontage/artifact/${encodeURIComponent(jobId)}/subtitles`,
      manifestUrl: `${baseOrigin}/api/autotube/openmontage/artifact/${encodeURIComponent(jobId)}/manifest`,
      nextStage: "argument-segmentation-and-fact-check",
    };

    return {
      structuredContent,
      content: [{
        type: "text",
        text: `OpenMontage accepted the reference video. Job ${jobId} is ${structuredContent.status}. After ingest is ready, use the media for complete-argument clipping, fact checking, and visual evidence sprites.`,
      }],
      _meta: { autotubeOpenMontage: { ...brief, ...structuredContent } },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenMontage reference ingest failed.";
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

export function openMontageWorkerHealth() {
  const config = workerConfig();
  return {
    available: Boolean(config.base && config.token),
    mode: config.base && config.token ? "real-worker" : "real-worker-unconfigured",
    repository: OPENMONTAGE_REPOSITORY,
    configurationSource: config.source,
  };
}
