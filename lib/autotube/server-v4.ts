import { createHmac } from "node:crypto";

import {
  frameSize,
  type AutoTubeRenderJob,
  type AutoTubeRenderRequest,
} from "@/lib/autotube/contracts";
import {
  AutoTubeServiceError,
  createArtifactToken,
  createNarrationAudio,
} from "@/lib/autotube/server";

const JOB_ID = /^[A-Za-z0-9_-]{6,160}$/;

export type AutoTubeV4ProductionPackage = {
  standardVersion: string;
  styleId: string;
  intent: string;
  plan: unknown;
  pipeline: unknown;
  masterPrompt: string;
  qualityReport: unknown;
  rendererScenes: unknown[];
  supportedRendererPresets: string[];
};

function envValue(...names: string[]) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

function renderServiceUrl(path: string) {
  const configured = envValue("AUTOTUBE_RENDER_SERVICE_URL");
  if (!configured) {
    throw new AutoTubeServiceError(
      "AutoTube render service is not configured.",
      503,
      "render_service_not_configured",
    );
  }
  const base = configured.endsWith("/") ? configured : `${configured}/`;
  return new URL(path.replace(/^\/+/, ""), base).toString();
}

function renderServiceHeaders(extra: Record<string, string> = {}) {
  const token = envValue("AUTOTUBE_RENDER_SERVICE_TOKEN");
  if (!token) {
    throw new AutoTubeServiceError(
      "AutoTube render-service authentication is not configured.",
      503,
      "render_service_token_not_configured",
    );
  }
  return { Authorization: `Bearer ${token}`, ...extra };
}

function signingSecret() {
  const value = envValue(
    "AUTOTUBE_DOWNLOAD_SIGNING_SECRET",
    "AUTOTUBE_ARTIFACT_SIGNING_SECRET",
    "AUTOTUBE_RENDER_SERVICE_TOKEN",
  );
  if (!value) {
    throw new AutoTubeServiceError(
      "AutoTube signed delivery is not configured.",
      503,
      "download_signing_not_configured",
    );
  }
  return value;
}

async function providerError(response: Response) {
  const payload = await response.text().catch(() => "");
  return payload.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 1_000) ||
    `${response.status} ${response.statusText}`;
}

function validJobId(value: unknown) {
  const jobId = String(value || "").trim();
  if (!JOB_ID.test(jobId)) {
    throw new AutoTubeServiceError("Invalid AutoTube render job ID.", 502, "invalid_render_job_id");
  }
  return jobId;
}

function deliveryUrls(origin: string, jobId: string, expiresAt: number) {
  const token = createArtifactToken(jobId, expiresAt);
  const encodedJobId = encodeURIComponent(jobId);
  const encodedToken = encodeURIComponent(token);
  return {
    statusUrl: `${origin}/api/autotube/status/${encodedJobId}`,
    videoUrl: `${origin}/api/autotube/artifact/${encodedJobId}?token=${encodedToken}&disposition=inline`,
    downloadUrl: `${origin}/api/autotube/artifact/${encodedJobId}?token=${encodedToken}&disposition=attachment`,
  };
}

export async function submitAutoTubeRenderV4(
  request: AutoTubeRenderRequest,
  production: AutoTubeV4ProductionPackage,
  origin: string,
): Promise<AutoTubeRenderJob> {
  const narration = await createNarrationAudio(request);
  const size = frameSize(request.aspectRatio);
  const payload = {
    schemaVersion: 1,
    source: "illco-command-autotube-v4-style-engine",
    prospect: request.prospect,
    offer: request.offer,
    painPoint: request.painPoint,
    callToAction: request.callToAction,
    video: {
      title: request.videoTitle,
      aspectRatio: request.aspectRatio,
      width: size.width,
      height: size.height,
      fps: 30,
      durationSeconds: request.durationSeconds,
      container: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      audioSampleRate: 48_000,
      fastStart: true,
      brandColors: request.brandColors,
    },
    narration: {
      script: request.narrationScript,
      source: narration.source,
      mimeType: narration.mimeType,
      base64: Buffer.from(narration.bytes).toString("base64"),
    },
    scenes: request.scenes,
    delivery: {
      mode: "durable-artifact",
      requireRangeRequests: true,
      minimumRetentionSeconds: 604_800,
      autotubeV4: production,
    },
  };

  const idempotencyKey = createHmac("sha256", signingSecret())
    .update(
      JSON.stringify({
        prospect: request.prospect,
        title: request.videoTitle,
        styleId: production.styleId,
        intent: production.intent,
        plan: production.plan,
      }),
    )
    .digest("hex");

  const response = await fetch(renderServiceUrl("v1/render-jobs"), {
    method: "POST",
    headers: renderServiceHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    }),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AutoTubeServiceError(
      `Render service rejected the AutoTube 4 job: ${await providerError(response)}`,
      502,
      "render_submission_failed",
    );
  }

  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const jobId = validJobId(result.jobId ?? result.job_id ?? result.id);
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1_000;
  return {
    jobId,
    status: String(result.status || "queued"),
    progress: Math.min(100, Math.max(0, Number(result.progress || 0))),
    expiresAt,
    ...deliveryUrls(origin, jobId, expiresAt),
  };
}
