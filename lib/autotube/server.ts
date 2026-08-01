import { createHmac, timingSafeEqual } from "node:crypto";

import {
  frameSize,
  normalizeAutoTubeRequest,
  permittedRemoteMediaUrl,
  type AutoTubeRenderJob,
  type AutoTubeRenderRequest,
} from "@/lib/autotube/contracts";

const MAX_NARRATION_BYTES = 12 * 1024 * 1024;
const JOB_ID = /^[A-Za-z0-9_-]{6,160}$/;

export class AutoTubeServiceError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status = 500, code = "autotube_error", details?: unknown) {
    super(message);
    this.name = "AutoTubeServiceError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function envValue(...names: string[]) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

function renderConfiguration() {
  return {
    renderServiceUrl: envValue("AUTOTUBE_RENDER_SERVICE_URL"),
    renderServiceToken: envValue("AUTOTUBE_RENDER_SERVICE_TOKEN"),
    downloadSigningSecret: envValue(
      "AUTOTUBE_DOWNLOAD_SIGNING_SECRET",
      "AUTOTUBE_RENDER_SERVICE_TOKEN",
    ),
    elevenLabsApiKey: envValue("ELEVENLABS_API_KEY", "ELEVENLABS_SECRET_KEY"),
    elevenLabsVoiceId: envValue(
      "AUTOTUBE_ELEVENLABS_VOICE_ID",
      "ELEVENLABS_VOICE_ID",
      "ELEVENLABS_M3NTALLY_ILL_VOICE_ID",
    ),
    elevenLabsModelId: envValue("AUTOTUBE_ELEVENLABS_MODEL_ID", "ELEVENLABS_MODEL_ID") ||
      "eleven_multilingual_v2",
    extraMediaHosts: envValue("AUTOTUBE_MEDIA_HOSTS")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  };
}

export function getAutoTubeConfigurationStatus() {
  const config = renderConfiguration();
  return {
    configured: Boolean(
      config.renderServiceUrl &&
        config.renderServiceToken &&
        config.downloadSigningSecret &&
        config.elevenLabsApiKey &&
        config.elevenLabsVoiceId,
    ),
    renderService: Boolean(config.renderServiceUrl && config.renderServiceToken),
    narration: Boolean(config.elevenLabsApiKey && config.elevenLabsVoiceId),
    signedDelivery: Boolean(config.downloadSigningSecret),
    browserEncodingDisabled: true,
    output: {
      container: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      fps: 30,
      fastStart: true,
    },
  };
}

function serviceUrl(path: string) {
  const config = renderConfiguration();
  if (!config.renderServiceUrl) {
    throw new AutoTubeServiceError(
      "AutoTube render service is not configured.",
      503,
      "render_service_not_configured",
    );
  }
  const base = config.renderServiceUrl.endsWith("/")
    ? config.renderServiceUrl
    : `${config.renderServiceUrl}/`;
  return new URL(path.replace(/^\/+/, ""), base).toString();
}

function serviceHeaders(extra: Record<string, string> = {}) {
  const token = renderConfiguration().renderServiceToken;
  if (!token) {
    throw new AutoTubeServiceError(
      "AutoTube render-service authentication is not configured.",
      503,
      "render_service_token_not_configured",
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function providerError(response: Response) {
  const payload = await response.text().catch(() => "");
  const safe = payload.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 1_000);
  return safe || `${response.status} ${response.statusText}`;
}

async function readLimitedAudio(response: Response) {
  if (!response.ok) {
    throw new AutoTubeServiceError(
      `Narration source failed: ${await providerError(response)}`,
      502,
      "narration_source_failed",
    );
  }
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_NARRATION_BYTES) {
    throw new AutoTubeServiceError(
      "Narration audio is larger than the 12 MB production limit.",
      413,
      "narration_too_large",
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength) {
    throw new AutoTubeServiceError("Narration provider returned an empty file.", 502, "empty_narration");
  }
  if (bytes.byteLength > MAX_NARRATION_BYTES) {
    throw new AutoTubeServiceError(
      "Narration audio is larger than the 12 MB production limit.",
      413,
      "narration_too_large",
    );
  }
  return {
    bytes,
    mimeType: response.headers.get("content-type")?.split(";")[0] || "audio/mpeg",
  };
}

export async function createNarrationAudio(
  requestInput: unknown,
): Promise<{ bytes: Uint8Array; mimeType: string; source: string }> {
  const request = normalizeAutoTubeRequest(requestInput);
  const config = renderConfiguration();

  if (request.narrationAudioUrl) {
    if (!permittedRemoteMediaUrl(request.narrationAudioUrl, config.extraMediaHosts)) {
      throw new AutoTubeServiceError(
        "The supplied narration URL is not on the AutoTube media allowlist.",
        400,
        "narration_url_not_allowed",
      );
    }
    const response = await fetch(request.narrationAudioUrl, {
      headers: { Accept: "audio/*", "User-Agent": "iLLCoAI-AutoTube/5.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    return { ...(await readLimitedAudio(response)), source: "remote" };
  }

  if (!config.elevenLabsApiKey || !(request.voiceId || config.elevenLabsVoiceId)) {
    throw new AutoTubeServiceError(
      "Automatic narration requires ELEVENLABS_API_KEY and an AutoTube voice ID.",
      503,
      "narration_not_configured",
    );
  }

  const voiceId = encodeURIComponent(request.voiceId || config.elevenLabsVoiceId);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": config.elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: request.narrationScript,
        model_id: config.elevenLabsModelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.18,
          use_speaker_boost: true,
          speed: 0.98,
        },
      }),
      signal: AbortSignal.timeout(90_000),
      cache: "no-store",
    },
  );
  return { ...(await readLimitedAudio(response)), source: "elevenlabs" };
}

function validJobId(value: unknown) {
  const jobId = String(value || "").trim();
  if (!JOB_ID.test(jobId)) {
    throw new AutoTubeServiceError("Invalid AutoTube render job ID.", 400, "invalid_job_id");
  }
  return jobId;
}

function signingSecret() {
  const secret = renderConfiguration().downloadSigningSecret;
  if (!secret) {
    throw new AutoTubeServiceError(
      "AutoTube signed delivery is not configured.",
      503,
      "download_signing_not_configured",
    );
  }
  return secret;
}

export function createArtifactToken(jobIdInput: unknown, expiresAt: number) {
  const jobId = validJobId(jobIdInput);
  const payload = `${jobId}.${Math.floor(expiresAt)}`;
  const signature = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  return `${Math.floor(expiresAt)}.${signature}`;
}

export function verifyArtifactToken(jobIdInput: unknown, token: string) {
  const jobId = validJobId(jobIdInput);
  const [expiresRaw, signature] = String(token || "").split(".", 2);
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;
  const expected = createHmac("sha256", signingSecret())
    .update(`${jobId}.${Math.floor(expiresAt)}`)
    .digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function buildDeliveryUrls(origin: string, jobId: string, expiresAt: number) {
  const token = createArtifactToken(jobId, expiresAt);
  const encodedJobId = encodeURIComponent(jobId);
  const encodedToken = encodeURIComponent(token);
  return {
    statusUrl: `${origin}/api/autotube/status/${encodedJobId}`,
    videoUrl: `${origin}/api/autotube/artifact/${encodedJobId}?token=${encodedToken}&disposition=inline`,
    downloadUrl: `${origin}/api/autotube/artifact/${encodedJobId}?token=${encodedToken}&disposition=attachment`,
  };
}

export async function submitAutoTubeRender(
  requestInput: unknown,
  origin: string,
): Promise<AutoTubeRenderJob> {
  const request: AutoTubeRenderRequest = normalizeAutoTubeRequest(requestInput);
  const narration = await createNarrationAudio(request);
  const size = frameSize(request.aspectRatio);
  const payload = {
    schemaVersion: 1,
    source: "illco-command-autotube-v5",
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
    },
  };

  const response = await fetch(serviceUrl("v1/render-jobs"), {
    method: "POST",
    headers: serviceHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": createHmac("sha256", signingSecret())
        .update(JSON.stringify({
          prospect: request.prospect,
          title: request.videoTitle,
          narration: request.narrationScript,
          scenes: request.scenes,
        }))
        .digest("hex"),
    }),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AutoTubeServiceError(
      `Render service rejected the job: ${await providerError(response)}`,
      502,
      "render_submission_failed",
    );
  }
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const jobId = validJobId(result.jobId ?? result.job_id ?? result.id);
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1_000;
  const urls = buildDeliveryUrls(origin, jobId, expiresAt);
  return {
    jobId,
    status: String(result.status || "queued"),
    progress: Math.min(100, Math.max(0, Number(result.progress || 0))),
    expiresAt,
    ...urls,
  };
}

export async function getAutoTubeRenderStatus(jobIdInput: unknown, origin: string) {
  const jobId = validJobId(jobIdInput);
  const response = await fetch(serviceUrl(`v1/render-jobs/${encodeURIComponent(jobId)}`), {
    headers: serviceHeaders({ Accept: "application/json" }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AutoTubeServiceError(
      `Unable to read render status: ${await providerError(response)}`,
      response.status === 404 ? 404 : 502,
      "render_status_failed",
    );
  }
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const status = String(result.status || "unknown").toLowerCase();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1_000;
  return {
    jobId,
    status,
    progress: Math.min(100, Math.max(0, Number(result.progress || 0))),
    stage: String(result.stage || ""),
    error: status === "failed" ? String(result.error || result.message || "Render failed") : "",
    ready: ["completed", "complete", "ready", "succeeded"].includes(status),
    ...buildDeliveryUrls(origin, jobId, expiresAt),
    output: result.output && typeof result.output === "object" ? result.output : {},
  };
}

export async function fetchAutoTubeArtifact(jobIdInput: unknown, range = "") {
  const jobId = validJobId(jobIdInput);
  const headers: Record<string, string> = {
    Accept: "video/mp4,application/octet-stream;q=0.9,*/*;q=0.1",
    "Accept-Encoding": "identity",
  };
  if (range) headers.Range = range;
  const response = await fetch(
    serviceUrl(`v1/render-jobs/${encodeURIComponent(jobId)}/artifact`),
    {
      headers: serviceHeaders(headers),
      signal: AbortSignal.timeout(120_000),
      cache: "no-store",
    },
  );
  if (!response.ok && response.status !== 206) {
    throw new AutoTubeServiceError(
      `Unable to retrieve rendered video: ${await providerError(response)}`,
      response.status === 404 ? 404 : 502,
      "artifact_fetch_failed",
    );
  }
  return response;
}
