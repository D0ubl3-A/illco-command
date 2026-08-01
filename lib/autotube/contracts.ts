export const AUTOTUBE_TOOL_NAME = "autotube_render_video";
export const AUTOTUBE_WIDGET_URI = "ui://illcoai.tech/autotube/render-video-v3.html";

export type AutoTubeAspectRatio = "landscape" | "vertical" | "square";

export type AutoTubeScene = {
  title: string;
  onScreenText: string;
  narration: string;
  imageUrl: string;
};

export type AutoTubeRenderRequest = {
  prospect: string;
  offer: string;
  videoTitle: string;
  painPoint: string;
  callToAction: string;
  aspectRatio: AutoTubeAspectRatio;
  durationSeconds: number;
  brandColors: [string, string];
  narrationScript: string;
  narrationAudioUrl: string;
  voiceId: string;
  scenes: AutoTubeScene[];
};

export type AutoTubeRenderJob = {
  jobId: string;
  status: string;
  progress: number;
  statusUrl: string;
  videoUrl: string;
  downloadUrl: string;
  expiresAt: number;
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const HTTP_URL = /^https?:\/\//i;

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maximum: number, fallback = "") {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, maximum);
}

function multilineText(value: unknown, maximum: number, fallback = "") {
  const normalized = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return (normalized || fallback).slice(0, maximum);
}

function numberBetween(value: unknown, minimum: number, maximum: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function color(value: unknown, fallback: string) {
  const candidate = text(value, 7);
  return HEX_COLOR.test(candidate) ? candidate.toUpperCase() : fallback;
}

function safeHttpUrl(value: unknown) {
  const candidate = text(value, 2_048);
  if (!candidate || !HTTP_URL.test(candidate)) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function defaultScenes(
  prospect: string,
  offer: string,
  painPoint: string,
  callToAction: string,
): AutoTubeScene[] {
  return [
    {
      title: "The friction",
      onScreenText: painPoint,
      narration: `${prospect} is losing time and opportunities because ${painPoint.toLowerCase()}.`,
      imageUrl: "",
    },
    {
      title: "The workflow",
      onScreenText: offer,
      narration: `iLLCo AI can replace that friction with ${offer.toLowerCase()}.`,
      imageUrl: "",
    },
    {
      title: "Automatic follow-through",
      onScreenText: "Capture. Qualify. Respond. Track.",
      narration:
        "The workflow captures each request, qualifies what matters, responds immediately, and keeps the result visible.",
      imageUrl: "",
    },
    {
      title: "Built for the real operation",
      onScreenText: `Configured for ${prospect}`,
      narration: `This is not a generic demo. The sequence is configured around how ${prospect} actually serves customers.`,
      imageUrl: "",
    },
    {
      title: "Next step",
      onScreenText: callToAction,
      narration: callToAction,
      imageUrl: "",
    },
  ];
}

export function normalizeAutoTubeRequest(input: unknown): AutoTubeRenderRequest {
  const source = objectValue(input);
  const prospect = text(source.prospect, 140, "Prospect");
  const offer = text(source.offer, 500, "an automated customer-response workflow");
  const painPoint = text(
    source.painPoint ?? source.pain_point,
    500,
    "manual follow-up is slow and inconsistent",
  );
  const callToAction = text(
    source.callToAction ?? source.call_to_action,
    220,
    "Book a short workflow review with iLLCo AI.",
  );
  const videoTitle = text(
    source.videoTitle ?? source.video_title,
    180,
    `${prospect} — AI workflow opportunity`,
  );
  const aspectCandidate = text(source.aspectRatio ?? source.aspect_ratio, 20, "landscape");
  const aspectRatio: AutoTubeAspectRatio =
    aspectCandidate === "vertical" || aspectCandidate === "square" ? aspectCandidate : "landscape";
  const durationSeconds = numberBetween(
    source.durationSeconds ?? source.duration_seconds,
    6,
    120,
    30,
  );

  const rawColors = Array.isArray(source.brandColors ?? source.brand_colors)
    ? ((source.brandColors ?? source.brand_colors) as unknown[])
    : [];
  const brandColors: [string, string] = [
    color(rawColors[0], "#061A17"),
    color(rawColors[1], "#16E0A5"),
  ];

  const rawScenes = Array.isArray(source.scenes) ? source.scenes.slice(0, 12) : [];
  const scenes = rawScenes
    .map((entry, index): AutoTubeScene | null => {
      const scene = objectValue(entry);
      const title = text(scene.title, 140, `Scene ${index + 1}`);
      const onScreenText = text(scene.onScreenText ?? scene.on_screen_text, 260);
      if (!onScreenText) return null;
      return {
        title,
        onScreenText,
        narration: multilineText(scene.narration, 900),
        imageUrl: safeHttpUrl(scene.imageUrl ?? scene.image_url),
      };
    })
    .filter((scene): scene is AutoTubeScene => Boolean(scene));

  const finalScenes = scenes.length
    ? scenes
    : defaultScenes(prospect, offer, painPoint, callToAction);
  const combinedNarration = finalScenes
    .map((scene) => scene.narration)
    .filter(Boolean)
    .join("\n\n");
  const narrationScript = multilineText(
    source.narrationScript ?? source.narration_script,
    6_000,
    combinedNarration,
  );

  return {
    prospect,
    offer,
    videoTitle,
    painPoint,
    callToAction,
    aspectRatio,
    durationSeconds,
    brandColors,
    narrationScript,
    narrationAudioUrl: safeHttpUrl(source.narrationAudioUrl ?? source.narration_audio_url),
    voiceId: text(source.voiceId ?? source.voice_id, 160),
    scenes: finalScenes,
  };
}

export function frameSize(aspectRatio: AutoTubeAspectRatio) {
  if (aspectRatio === "vertical") return { width: 1080, height: 1920 };
  if (aspectRatio === "square") return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}

export function permittedRemoteMediaUrl(value: string, extraHosts: string[] = []) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    const allowed = [
      "illcoai.tech",
      "www.illcoai.tech",
      "resource2.heygen.ai",
      "images.unsplash.com",
      ...extraHosts.map((entry) => entry.trim().toLowerCase()).filter(Boolean),
    ];
    return allowed.some(
      (entry) => host === entry || (entry.startsWith("*.") && host.endsWith(entry.slice(1))),
    ) || host.endsWith(".oaiusercontent.com");
  } catch {
    return false;
  }
}
