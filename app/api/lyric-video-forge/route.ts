import { Agent, run } from "@openai/agents";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LyricVideoForgeAction = "brief" | "transcribe" | "image-plan" | "full-run";

type LyricVideoForgePayload = {
  artist?: string;
  songTitle?: string;
  audioPath?: string;
  visualDirection?: string;
  lyricIssues?: string;
  timingStatus?: string;
  requestedAction?: LyricVideoForgeAction;
  imageCount?: number;
  lyricsApproved?: boolean;
  characterReferenceName?: string;
  audioFileName?: string;
};

type ValidationResult = {
  errors: string[];
  warnings: string[];
};

const defaultAgentModel = process.env.LYRIC_VIDEO_FORGE_AGENT_MODEL || "gpt-5-nano";
const defaultImageModel = process.env.LYRIC_VIDEO_FORGE_IMAGE_MODEL || "gpt-image-1";
const realtimeTranscriptionModel = process.env.LYRIC_VIDEO_FORGE_REALTIME_TRANSCRIBE_MODEL || "gpt-4o-transcribe";
const wordTimestampFallbackModel = process.env.LYRIC_VIDEO_FORGE_WORD_TIMESTAMP_MODEL || "whisper-1";

const rapTranscriptPrompt = [
  "You are a master transcription engineer for dense rap lyrics and lyric-video karaoke timing.",
  "Transcribe exactly what is performed, including slang, ad-libs, profanity, repeated words, pauses, punchline wording, and artist-specific spelling.",
  "Do not sanitize, rewrite, summarize, or make the lyrics more grammatically correct.",
  "Preserve rapper cadence and bar phrasing for subtitle timing.",
  "Prioritize exact per-word timestamp alignment for karaoke lyrics.",
  "Known spelling examples: M3ntally-iLL, ILLCO, L.O.E.",
].join(" ");

const lyricVideoForgeAgent = new Agent({
  name: "ILLCO Lyric Video Forge Agent",
  model: defaultAgentModel,
  instructions: [
    "You are the production director for ILLCO lyric videos.",
    "Return production-ready workflow instructions, not generic advice.",
    "The workflow must require audio upload and character reference image upload before render planning.",
    "The workflow must transcribe first and require the user to confirm lyrics are correct before generating images or rendering.",
    "For timing, prefer the newest OpenAI Realtime transcription lane first. If reliable per-word timestamps are not available, fall back to OpenAI whisper-1 verbose_json with timestamp_granularities[]=word.",
    "For image generation, use the uploaded character reference as the identity anchor and generate only the number of images selected by the user and allowed by credits.",
    "For final visuals, dissolve generated images with smooth crossfades, not hard cuts.",
    "Apply these hard subtitle rules: readable wrapped lyrics, max two lines unless requested, no wrong ASR fallback text, preserve spaces around ASS color tags, never call ASR-only timing exact.",
    "For rap rhyme color: use intentional rhyme families, block weak false positives, color meaningful chunks, and prefer manual rhyme maps for final render.",
    "Use the cheapest acceptable model settings by default. Escalate only for paid delivery quality, identity lock, or timing repair.",
  ].join(" "),
});

const creditPacks = [
  { id: "starter", name: "Starter Pack", credits: 25, priceLabel: "$9", bestFor: "1 planning pass plus image prompts" },
  { id: "creator", name: "Creator Pack", credits: 100, priceLabel: "$29", bestFor: "multiple songs and QC rerenders" },
  { id: "studio", name: "Studio Pack", credits: 500, priceLabel: "$99", bestFor: "album batches and client delivery" },
];

const creditCosts = {
  brief: 1,
  transcribe: 4,
  imagePlanBase: 2,
  imagePerGeneratedStill: 5,
  fullRunPlan: 8,
};

function coerceAction(value: unknown): LyricVideoForgeAction {
  if (value === "transcribe" || value === "image-plan" || value === "full-run") return value;
  return "brief";
}

function imageCountToCredits(imageCount: number) {
  return creditCosts.imagePlanBase + Math.max(1, Math.min(12, imageCount)) * creditCosts.imagePerGeneratedStill;
}

function estimateCredits(action: LyricVideoForgeAction, imageCount: number) {
  if (action === "transcribe") return creditCosts.transcribe;
  if (action === "image-plan") return imageCountToCredits(imageCount);
  if (action === "full-run") return creditCosts.fullRunPlan + creditCosts.transcribe + imageCountToCredits(imageCount);
  return creditCosts.brief;
}

function validateRequestInputs(
  payload: LyricVideoForgePayload,
  hasAudio: boolean,
  hasReference: boolean,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if ((payload.requestedAction === "transcribe" || payload.requestedAction === "full-run") && !hasAudio) {
    errors.push("Upload an audio file before transcription.");
  }

  if ((payload.requestedAction === "image-plan" || payload.requestedAction === "full-run") && !hasReference) {
    warnings.push("Upload a character reference before image generation.");
  }

  if ((payload.requestedAction === "image-plan" || payload.requestedAction === "full-run") && !payload.lyricsApproved) {
    const gate = payload.requestedAction === "full-run" ? "Approve lyrics before running the full plan." : "Approve lyrics before image rendering.";
    warnings.push(gate);
  }

  if (payload.requestedAction === "full-run" && !hasReference) {
    errors.push("Upload a character reference before the full run plan.");
  }

  if (payload.requestedAction === "full-run" && !hasAudio) {
    errors.push("Upload an audio file before the full run plan.");
  }

  if (payload.requestedAction === "full-run" && !payload.lyricsApproved) {
    errors.push("Approve lyrics before the full run plan.");
  }

  return { errors, warnings };
}

async function parseRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let body: LyricVideoForgePayload = {};
  let audioFile: File | null = null;
  let characterReference: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    body = {
      artist: String(form.get("artist") || ""),
      songTitle: String(form.get("songTitle") || ""),
      audioPath: String(form.get("audioPath") || ""),
      visualDirection: String(form.get("visualDirection") || ""),
      lyricIssues: String(form.get("lyricIssues") || ""),
      timingStatus: String(form.get("timingStatus") || ""),
      requestedAction: coerceAction(form.get("requestedAction")),
      imageCount: Number(form.get("imageCount") || 4),
      lyricsApproved: String(form.get("lyricsApproved") || "false") === "true",
    };
    const maybeAudio = form.get("audio");
    const maybeReference = form.get("characterReference");
    audioFile = maybeAudio instanceof File && maybeAudio.size > 0 ? maybeAudio : null;
    characterReference = maybeReference instanceof File && maybeReference.size > 0 ? maybeReference : null;
    body.audioFileName = audioFile?.name || "";
    body.characterReferenceName = characterReference?.name || "";
  } else {
    body = (await request.json().catch(() => ({}))) as LyricVideoForgePayload;
  }

  const action = coerceAction(body.requestedAction);
  const imageCount = Math.max(1, Math.min(12, Number(body.imageCount || 4)));
  const payload = {
    artist: String(body.artist || "M3ntally-iLL").trim(),
    songTitle: String(body.songTitle || "Untitled lyric video").trim(),
    audioPath: String(body.audioPath || "Upload audio before rendering.").trim(),
    visualDirection: String(body.visualDirection || "Normal artist identity, attitude-forward, dark studio grade.").trim(),
    lyricIssues: String(body.lyricIssues || "Prevent wrong ASR lyrics, smashed spacing, loose rhyme coloring, and drifting timing.").trim(),
    timingStatus: String(body.timingStatus || "first-pass timing until manually corrected").trim(),
    requestedAction: action,
    imageCount,
    lyricsApproved: Boolean(body.lyricsApproved),
    audioFileName: String(body.audioFileName || "").trim(),
    characterReferenceName: String(body.characterReferenceName || "").trim(),
  };

  return { payload, audioFile, characterReference };
}

async function transcribeUploadedAudio(audioFile: File | null) {
  if (!audioFile) {
    return { status: "missing-audio", detail: "Upload an audio file before transcription." };
  }
  if (!env.codexApiKey) {
    return {
      status: "blocked-no-key",
      detail: "OPENAI_API_KEY is required for hosted transcription.",
      preferredRealtimeModel: realtimeTranscriptionModel,
      fallbackWordTimestampModel: wordTimestampFallbackModel,
      prompt: rapTranscriptPrompt,
    };
  }

  const formData = new FormData();
  formData.append("file", audioFile, audioFile.name || "audio.mp3");
  formData.append("model", wordTimestampFallbackModel);
  formData.append("response_format", "verbose_json");
  formData.append("prompt", rapTranscriptPrompt);
  formData.append("timestamp_granularities[]", "word");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.codexApiKey}` },
    body: formData,
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      status: "error",
      detail: result?.error?.message || "OpenAI transcription failed.",
      preferredRealtimeModel: realtimeTranscriptionModel,
      fallbackWordTimestampModel: wordTimestampFallbackModel,
      prompt: rapTranscriptPrompt,
    };
  }

  return {
    status: "word-timestamps-ready",
    preferredRealtimeModel: realtimeTranscriptionModel,
    usedModel: wordTimestampFallbackModel,
    note: "Realtime transcription is preferred for live capture; this upload endpoint uses whisper-1 verbose_json word timestamps for karaoke alignment fallback.",
    prompt: rapTranscriptPrompt,
    transcript: result,
  };
}

function imageGenerationPlan(payload: Awaited<ReturnType<typeof parseRequest>>["payload"], hasReference: boolean) {
  return {
    status: payload.lyricsApproved ? "ready-after-credit-check" : "blocked-until-lyrics-approved",
    imageModel: defaultImageModel,
    selectedImageCount: payload.imageCount,
    estimatedImageCredits: imageCountToCredits(payload.imageCount),
    characterReferenceRequired: true,
    characterReferenceReceived: hasReference,
    dissolveRule: "Generate the selected number of identity-locked stills, then cross-dissolve between them. No hard cuts.",
    promptRules: [
      "Use the uploaded character reference as the strongest identity anchor.",
      "Preserve face, eyes, nose, mouth, jaw, skin detail, posture, and artist attitude.",
      "Generate only the selected image count allowed by credits.",
      "Do not start image generation until the user confirms the transcript lyrics are correct.",
    ],
  };
}

function fallbackBrief(payload: Awaited<ReturnType<typeof parseRequest>>["payload"], hasReference: boolean) {
  return [
    "## Render Gate",
    "1. Upload audio.",
    "2. Upload character reference image.",
    "3. Transcribe lyrics and word timings.",
    "4. Show transcript to user and require approval before image generation.",
    "5. Generate selected image count based on credits.",
    "6. Cross-dissolve generated images into the lyric video.",
    "",
    "## Render Target",
    `Artist: ${payload.artist}`,
    `Song: ${payload.songTitle}`,
    `Audio: ${payload.audioFileName || payload.audioPath}`,
    `Character reference: ${hasReference ? payload.characterReferenceName || "uploaded" : "missing"}`,
    "",
    "## Transcription",
    `Realtime-first model target: ${realtimeTranscriptionModel}`,
    `Word timestamp fallback: ${wordTimestampFallbackModel}`,
    `Prompt: ${rapTranscriptPrompt}`,
    "",
    "## User Confirmation",
    "Do not generate images or render the final video until the user confirms the lyrics are correct.",
  ].join("\n");
}

export async function POST(request: Request) {
  const { payload, audioFile, characterReference } = await parseRequest(request);
  const estimatedCredits = estimateCredits(payload.requestedAction, payload.imageCount);
  const hasAudio = Boolean(audioFile);
  const hasReference = Boolean(characterReference);
  const validation = validateRequestInputs(payload, hasAudio, hasReference);
  const transcription = payload.requestedAction === "transcribe" || payload.requestedAction === "full-run" ? await transcribeUploadedAudio(audioFile) : null;
  const images = imageGenerationPlan(payload, Boolean(characterReference));

  let brief = "";
  if (env.codexApiKey) {
    const result = await run(
      lyricVideoForgeAgent,
      [
        `Artist: ${payload.artist}`,
        `Song title: ${payload.songTitle}`,
        `Uploaded audio: ${payload.audioFileName || "none"}`,
        `Uploaded character reference: ${payload.characterReferenceName || "none"}`,
        `Visual direction: ${payload.visualDirection}`,
        `Known lyric/timing issues: ${payload.lyricIssues}`,
        `Lyrics approved by user: ${payload.lyricsApproved}`,
        `Selected image count: ${payload.imageCount}`,
        `Credit estimate: ${estimatedCredits}`,
        `Realtime transcription target: ${realtimeTranscriptionModel}`,
        `Word timestamp fallback: ${wordTimestampFallbackModel}`,
        `Image generation model: ${defaultImageModel}`,
        "Create the gated production workflow, transcription plan, image-generation plan, dissolve plan, and QC checklist.",
      ].join("\n"),
    );
    brief = String(result.finalOutput || "").trim();
  }

  if (!brief) brief = fallbackBrief(payload, Boolean(characterReference));

  return NextResponse.json({
    brief,
    usedAgentSdk: Boolean(env.codexApiKey),
    modelDefaults: {
      agent: defaultAgentModel,
      image: defaultImageModel,
      realtimeTranscription: realtimeTranscriptionModel,
      wordTimestampFallback: wordTimestampFallbackModel,
    },
    credits: {
      estimatedCost: estimatedCredits,
      packs: creditPacks,
      costs: creditCosts,
    },
    validation,
    uploadInputs: {
      audioReceived: hasAudio,
      audioFileName: payload.audioFileName,
      characterReferenceReceived: hasReference,
      characterReferenceName: payload.characterReferenceName,
    },
    transcription,
    images,
    payload,
  });
}


