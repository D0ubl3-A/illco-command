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
  editCount?: number;
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
const AGENT_TIMEOUT_MS = 12_000;

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
  editPerVideoPass: 3,
};

const adRewards = {
  rewardPerImage: 1,
  rewardPerEdit: 2,
  minProfitForPayout: 1,
};

type BriefResult = {
  brief: string;
  briefSource: "agent" | "fallback" | "error";
  briefNote?: string;
};

type AdEarningEstimate = {
  imageCreditReward: number;
  editCreditReward: number;
  grossPotentialCredits: number;
  netCreditGain: number;
  canEarnWithAds: boolean;
  earnedAdCredits: number;
};

function coerceAction(value: unknown): LyricVideoForgeAction {
  if (value === "transcribe" || value === "image-plan" || value === "full-run") return value;
  return "brief";
}

function clampImageCount(value: number) {
  return Math.max(1, Math.min(12, Number(value) || 1));
}

function clampEditCount(value: number) {
  return Math.max(0, Math.min(30, Number(value) || 0));
}

function imageCountToCredits(imageCount: number) {
  const safeImageCount = clampImageCount(imageCount);
  return creditCosts.imagePlanBase + safeImageCount * creditCosts.imagePerGeneratedStill;
}

function editCountToCredits(editCount: number) {
  return clampEditCount(editCount) * creditCosts.editPerVideoPass;
}

function estimateCredits(action: LyricVideoForgeAction, imageCount: number, editCount: number) {
  const selectedImageCredits = imageCountToCredits(imageCount);
  const selectedEditCredits = editCountToCredits(editCount);
  if (action === "transcribe") return creditCosts.transcribe;
  if (action === "image-plan") return selectedImageCredits;
  if (action === "full-run") return creditCosts.fullRunPlan + creditCosts.transcribe + selectedImageCredits + selectedEditCredits;
  return creditCosts.brief;
}

function estimateAdReward(imageCount: number, editCount: number) {
  return clampImageCount(imageCount) * adRewards.rewardPerImage + clampEditCount(editCount) * adRewards.rewardPerEdit;
}

function estimateAdEarning(imageCount: number, editCount: number, estimatedCost: number): AdEarningEstimate {
  const safeImageCount = clampImageCount(imageCount);
  const safeEditCount = clampEditCount(editCount);
  const imageCreditReward = safeImageCount * adRewards.rewardPerImage;
  const editCreditReward = safeEditCount * adRewards.rewardPerEdit;
  const grossPotentialCredits = imageCreditReward + editCreditReward;
  const netCreditGain = grossPotentialCredits - estimatedCost;
  const canEarnWithAds = netCreditGain >= adRewards.minProfitForPayout;

  return {
    imageCreditReward,
    editCreditReward,
    grossPotentialCredits,
    netCreditGain,
    canEarnWithAds,
    earnedAdCredits: canEarnWithAds ? Math.max(0, netCreditGain) : 0,
  };
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

function runWithTimeout(actionPrompt: string, timeoutMs = AGENT_TIMEOUT_MS): Promise<{ output: string }> {
  const timeout = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new Error(`Agent SDK timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  return Promise.race([run(lyricVideoForgeAgent, actionPrompt), timeout]).then((result) => {
    if (!result) {
      return { output: "" };
    }
    const output = String((result as any).finalOutput || "").trim();
    return { output };
  });
}

async function buildBrief(payload: Awaited<ReturnType<typeof parseRequest>>["payload"], hasReference: boolean) {
  const estimatedCredits = estimateCredits(payload.requestedAction, payload.imageCount, payload.editCount);
  const adEarning = estimateAdEarning(payload.imageCount, payload.editCount, estimatedCredits);
  const fallback = fallbackBrief(payload, hasReference);

  if (!env.codexApiKey) {
    return {
      brief: fallback,
      briefSource: "fallback" as const,
      briefNote: "Agent SDK disabled: OPENAI_API_KEY is not configured.",
    };
  }

  try {
    const { output } = await runWithTimeout(
      [
        `Artist: ${payload.artist}`,
        `Song title: ${payload.songTitle}`,
        `Uploaded audio: ${payload.audioFileName || "none"}`,
        `Uploaded character reference: ${payload.characterReferenceName || "none"}`,
        `Visual direction: ${payload.visualDirection}`,
        `Known lyric/timing issues: ${payload.lyricIssues}`,
        `Lyrics approved by user: ${payload.lyricsApproved}`,
        `Selected image count: ${payload.imageCount}`,
        `Estimated edit count: ${payload.editCount}`,
        `Credit estimate: ${estimatedCredits}`,
        `Ad reward potential: +${adEarning.imageCreditReward} (images) +${adEarning.editCreditReward} (edits), net ad gain ${adEarning.netCreditGain >= 0 ? "+" : ""}${adEarning.netCreditGain} credits`,
        `Ad reward status: ${adEarning.canEarnWithAds ? "profitable" : "not profitable"}`,
        `Realtime transcription target: ${realtimeTranscriptionModel}`,
        `Word timestamp fallback: ${wordTimestampFallbackModel}`,
        `Image generation model: ${defaultImageModel}`,
        "Create the gated production workflow, transcription plan, image-generation plan, dissolve plan, and QC checklist.",
      ].join("\n"),
    );

    if (output) {
      return { brief: output, briefSource: "agent" as const };
    }
  } catch (error) {
    return {
      brief: fallback,
      briefSource: "error" as const,
      briefNote: error instanceof Error ? error.message : "Agent SDK execution failed.",
    };
  }

  return { brief: fallback, briefSource: "fallback" as const };
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
      editCount: Number(form.get("editCount") || 0),
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
  const imageCount = clampImageCount(Number(body.imageCount || 4));
  const editCount = clampEditCount(Number(body.editCount || 0));
  const payload = {
    artist: String(body.artist || "M3ntally-iLL").trim(),
    songTitle: String(body.songTitle || "Untitled lyric video").trim(),
    audioPath: String(body.audioPath || "Upload audio before rendering.").trim(),
    visualDirection: String(body.visualDirection || "Normal artist identity, attitude-forward, dark studio grade.").trim(),
    lyricIssues: String(body.lyricIssues || "Prevent wrong ASR lyrics, smashed spacing, loose rhyme coloring, and drifting timing.").trim(),
    timingStatus: String(body.timingStatus || "first-pass timing until manually corrected").trim(),
    requestedAction: action,
    imageCount,
    editCount,
    lyricsApproved: Boolean(body.lyricsApproved),
    audioFileName: String(body.audioFileName || "").trim(),
    characterReferenceName: String(body.characterReferenceName || "").trim(),
  };

  return { payload, audioFile, characterReference };
}

async function transcribeUploadedAudio(audioFile: File | null) {
  if (!audioFile) {
    return { status: "missing-media", detail: "Upload an audio or video file before transcription." };
  }

  const runOpenAi = async () => {
    if (!env.codexApiKey) throw new Error("OPENAI_API_KEY is not configured.");
    const formData = new FormData();
    formData.append("file", audioFile, audioFile.name || "media.mp4");
    formData.append("model", wordTimestampFallbackModel);
    formData.append("response_format", "verbose_json");
    formData.append("prompt", rapTranscriptPrompt);
    formData.append("timestamp_granularities[]", "word");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.codexApiKey}` },
      body: formData,
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || "OpenAI transcription failed.");
    return { provider: "openai", model: wordTimestampFallbackModel, result };
  };

  const runGroq = async () => {
    if (!env.groqApiKey) throw new Error("GROQ_API_KEY is not configured.");
    const formData = new FormData();
    formData.append("file", audioFile, audioFile.name || "media.mp4");
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "verbose_json");
    formData.append("prompt", rapTranscriptPrompt);
    formData.append("timestamp_granularities[]", "word");
    let response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.groqApiKey}` },
      body: formData,
      cache: "no-store",
    });
    let result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const retry = new FormData();
      retry.append("file", audioFile, audioFile.name || "media.mp4");
      retry.append("model", "whisper-large-v3");
      retry.append("response_format", "verbose_json");
      retry.append("prompt", rapTranscriptPrompt);
      response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.groqApiKey}` },
        body: retry,
        cache: "no-store",
      });
      result = await response.json().catch(() => ({}));
    }
    if (!response.ok) throw new Error(result?.error?.message || "Groq transcription failed.");
    return { provider: "groq", model: "whisper-large-v3", result };
  };

  if (!env.codexApiKey && !env.groqApiKey) {
    return {
      status: "blocked-no-key",
      detail: "OPENAI_API_KEY or GROQ_API_KEY is required for hosted transcription.",
      primaryModel: wordTimestampFallbackModel,
      fallbackModel: "groq-whisper-large-v3",
      prompt: rapTranscriptPrompt,
    };
  }

  try {
    let output;
    try {
      output = await runOpenAi();
    } catch (openAiError) {
      if (!env.groqApiKey) throw openAiError;
      output = await runGroq();
    }
    return {
      status: "word-timestamps-ready",
      primaryProvider: "openai",
      usedProvider: output.provider,
      usedModel: output.model,
      fallbackProvider: "groq",
      fallbackModel: "whisper-large-v3",
      prompt: rapTranscriptPrompt,
      transcript: output.result,
    };
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : "Transcription failed.",
      primaryProvider: "openai",
      fallbackProvider: "groq",
      prompt: rapTranscriptPrompt,
    };
  }
}

function imageGenerationPlan(payload: Awaited<ReturnType<typeof parseRequest>>["payload"], hasReference: boolean) {
  const imageCost = imageCountToCredits(payload.imageCount);
  const editCost = editCountToCredits(payload.editCount);
  return {
    status: payload.lyricsApproved ? "ready-after-credit-check" : "blocked-until-lyrics-approved",
    imageModel: defaultImageModel,
    selectedImageCount: payload.imageCount,
    estimatedImageCredits: imageCost,
    estimatedEditCredits: editCost,
    selectedEditCount: payload.editCount,
    characterReferenceRequired: true,
    characterReferenceReceived: hasReference,
    dissolveRule: "Generate the selected number of identity-locked stills, then cross-dissolve between them. No hard cuts.",
    promptRules: [
      "Use the uploaded character reference as the strongest identity anchor.",
      "Preserve face, eyes, nose, mouth, jaw, skin detail, posture, and artist attitude.",
      "Generate only the selected image count allowed by credits.",
      "Do not start image generation until the user confirms the transcript lyrics are correct.",
      "Only bill edit credits when user-selected edits are executed in the final timeline.",
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
    "6. Estimate edit passes and cross-dissolve generated images into the lyric video.",
    "",
    "## Render Target",
    `Artist: ${payload.artist}`,
    `Song: ${payload.songTitle}`,
    `Audio: ${payload.audioFileName || payload.audioPath}`,
    `Character reference: ${hasReference ? payload.characterReferenceName || "uploaded" : "missing"}`,
    `Requested edits: ${payload.editCount}`,
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
  try {
    const { payload, audioFile, characterReference } = await parseRequest(request);
    const estimatedCredits = estimateCredits(payload.requestedAction, payload.imageCount, payload.editCount);
    const adEarning = estimateAdEarning(payload.imageCount, payload.editCount, estimatedCredits);
    const hasAudio = Boolean(audioFile);
    const hasReference = Boolean(characterReference);
    const validation = validateRequestInputs(payload, hasAudio, hasReference);
    const transcription =
      payload.requestedAction === "transcribe" || payload.requestedAction === "full-run" ? await transcribeUploadedAudio(audioFile) : null;
    const images = imageGenerationPlan(payload, Boolean(characterReference));
    const { brief, briefSource, briefNote } = await buildBrief(payload, Boolean(characterReference));

    if (!brief && validation.errors.length) {
      return NextResponse.json(
        {
          brief: `Cannot run workflow: ${validation.errors.join(" ")}`,
          usedAgentSdk: Boolean(env.codexApiKey),
          modelDefaults: {
            agent: defaultAgentModel,
            image: defaultImageModel,
            realtimeTranscription: realtimeTranscriptionModel,
            wordTimestampFallback: wordTimestampFallbackModel,
          },
          credits: {
            estimatedCost: estimatedCredits,
            adEarning,
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
          serverNote: `Lyric Video Forge completed via ${briefSource}. ${briefNote || ""}`.trim(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      brief,
      usedAgentSdk: Boolean(env.codexApiKey) && briefSource !== "fallback",
      modelDefaults: {
        agent: defaultAgentModel,
        image: defaultImageModel,
        realtimeTranscription: realtimeTranscriptionModel,
        wordTimestampFallback: wordTimestampFallbackModel,
      },
      credits: {
        estimatedCost: estimatedCredits,
        adEarning,
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
      serverNote: briefSource === "agent" ? "Workflow completed." : `Workflow completed with fallback: ${briefNote || "Agent output unavailable."}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process Lyric Video Forge request.";
    return NextResponse.json(
      {
        brief: "The workflow did not complete. Please retry with smaller files and a valid OPENAI_API_KEY.",
        usedAgentSdk: false,
        modelDefaults: {
          agent: defaultAgentModel,
          image: defaultImageModel,
          realtimeTranscription: realtimeTranscriptionModel,
          wordTimestampFallback: wordTimestampFallbackModel,
        },
        credits: {
          estimatedCost: 0,
          adEarning: null,
          packs: creditPacks,
          costs: creditCosts,
        },
        validation: {
          errors: [message],
          warnings: [],
        },
        serverNote: `Lyric Video Forge request failed: ${message}`,
      },
      { status: 500 },
    );
  }
}
