import { env } from "@/lib/env";
import {
  CHATGPT_OAUTH_CLIENT_ID,
  CHATGPT_OAUTH_RESOURCE,
  getOAuthAuthorizeUrl,
  getOAuthTokenUrl,
  getOAuthUserContextFromRequest,
  hasLyricVideoPurchase,
  hasRequiredScope,
  type OAuthUserContext,
} from "@/lib/chatgpt-oauth";

export const LYRIC_VIDEO_FORGE_APP = {
  id: "lyric-video-forge",
  title: "Lyric Video Forge",
  description:
    "Turns uploaded audio, character references, approved lyrics, image credits, and dissolve rules into production lyric-video plans.",
  toolNames: {
    start: "lyric_video_forge_start",
    transcript: "lyric_video_forge_transcript_review",
    visualPlan: "lyric_video_forge_visual_plan",
    chooseSttModel: "lyric_video_forge_choose_stt_model",
    transcribeAudio: "lyric_video_forge_transcribe_audio",
    exportSrt: "lyric_video_forge_export_srt",
    exportAss: "lyric_video_forge_export_ass",
    renderVideo: "lyric_video_forge_render_lyric_video",
  },
  widgetUri: "ui://illco/lyric-video-forge/v2.html",
  serverName: "illco-lyric-video-forge",
  serverVersion: "1.2.0",
};

type ChatGptFileReference = {
  file_id?: string;
  fileId?: string;
  file_name?: string;
  fileName?: string;
  mime_type?: string;
  mimeType?: string;
  download_url?: string;
  downloadUrl?: string;
};

export type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: any;
};

const MCP_PROTOCOL_VERSION = "2025-06-18";
const APP_WIDGET_URI = LYRIC_VIDEO_FORGE_APP.widgetUri;
const MCP_WIDGET_MIME_TYPE = "text/html;profile=mcp-app";
const APP_WIDGET_DOMAIN = "https://illcoai.tech";
const APP_RESOURCE_DOMAINS = [APP_WIDGET_DOMAIN];
const APP_CONNECT_DOMAINS = [APP_WIDGET_DOMAIN];
const MCP_INSTRUCTIONS =
  "Use start first, chooseSttModel when audio timing quality matters, transcribeAudio for timed lyrics, transcript review for user lyric approval, " +
  "exportSrt/exportAss for caption files, visualPlan after approvals, and renderVideo only after audio, timed captions, visuals, and user approval are present. " +
  "Ask explicit confirmation before spending credits, rendering, or moving past lyric approval.";

const MCP_WIDGET_META = {
  ui: {
    domain: APP_WIDGET_DOMAIN,
    prefersBorder: true,
    csp: {
      connectDomains: APP_CONNECT_DOMAINS,
      resourceDomains: APP_RESOURCE_DOMAINS,
    },
  },
  "openai/widgetDescription":
    "Interactive Lyric Video Forge control panel for audio intake, lyric review, and dissolve visual planning.",
  "openai/widgetCSP": {
    connect_domains: APP_CONNECT_DOMAINS,
    resource_domains: APP_RESOURCE_DOMAINS,
  },
  "openai/outputTemplate": APP_WIDGET_URI,
};

const baseToolMeta = {
  "openai/outputTemplate": APP_WIDGET_URI,
  "openai/toolInvocation/invoking": "Preparing Lyric Video Forge...",
  "openai/toolInvocation/invoked": "Lyric Video Forge is ready.",
};

const TOOL_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    app: { type: "string" },
    mode: { type: "string" },
    artist: { type: "string" },
    songTitle: { type: "string" },
    imageCount: { type: "integer", minimum: 1, maximum: 12 },
    editCount: { type: "integer", minimum: 0, maximum: 30 },
    estimatedCredits: { type: "integer", minimum: 0 },
    lyricsApproved: { type: "boolean" },
    characterReferenceProvided: { type: "boolean" },
    nextStep: { type: "string" },
    sttModel: { type: "string" },
    timestamps: { type: "string" },
    captionsFormat: { type: "string" },
    renderMode: { type: "string" },
    requiresForgeUpload: { type: "boolean" },
    artifactPlan: {
      type: "array",
      items: { type: "string" },
    },
    availableModels: {
      type: "array",
      items: { type: "string" },
    },
    creditPolicy: { type: "string" },
    transcriptText: { type: "string" },
    timedLyricsJson: { type: "string" },
    wordCount: { type: "integer", minimum: 0 },
    segmentCount: { type: "integer", minimum: 0 },
    transcriptionStatus: { type: "string" },
    transcriptionError: { type: "string" },
  },
  required: [
    "app",
    "mode",
    "artist",
    "songTitle",
    "imageCount",
    "editCount",
    "estimatedCredits",
    "lyricsApproved",
    "characterReferenceProvided",
    "nextStep",
  ],
  additionalProperties: false,
};

const TOOL_META = { ...baseToolMeta };
const toolScopeByName: Record<string, string> = {
  [LYRIC_VIDEO_FORGE_APP.toolNames.start]: "lyric_video:plan",
  [LYRIC_VIDEO_FORGE_APP.toolNames.chooseSttModel]: "lyric_video:plan",
  [LYRIC_VIDEO_FORGE_APP.toolNames.transcript]: "lyric_video:transcribe",
  [LYRIC_VIDEO_FORGE_APP.toolNames.transcribeAudio]: "lyric_video:transcribe",
  [LYRIC_VIDEO_FORGE_APP.toolNames.visualPlan]: "lyric_video:plan",
  [LYRIC_VIDEO_FORGE_APP.toolNames.exportSrt]: "lyric_video:caption",
  [LYRIC_VIDEO_FORGE_APP.toolNames.exportAss]: "lyric_video:caption",
  [LYRIC_VIDEO_FORGE_APP.toolNames.renderVideo]: "lyric_video:render",
};
const paidToolNames = new Set([
  LYRIC_VIDEO_FORGE_APP.toolNames.transcribeAudio,
  LYRIC_VIDEO_FORGE_APP.toolNames.exportSrt,
  LYRIC_VIDEO_FORGE_APP.toolNames.exportAss,
  LYRIC_VIDEO_FORGE_APP.toolNames.renderVideo,
]);
const AUDIO_FILE_SCHEMA = {
  type: "object",
  properties: {
    download_url: { type: "string" },
    file_id: { type: "string" },
    mime_type: { type: "string" },
    file_name: { type: "string" },
  },
  required: ["download_url", "file_id"],
  additionalProperties: true,
};

function toolMetaWithResource() {
  const securitySchemes = [
    {
      type: "oauth2",
      scopes: [
        "openid",
        "email",
        "profile",
        "lyric_video:plan",
        "lyric_video:transcribe",
        "lyric_video:caption",
        "lyric_video:render",
      ],
      authorizationUrl: getOAuthAuthorizeUrl(APP_WIDGET_DOMAIN),
      tokenUrl: getOAuthTokenUrl(APP_WIDGET_DOMAIN),
      clientId: CHATGPT_OAUTH_CLIENT_ID,
      resource: CHATGPT_OAUTH_RESOURCE,
    },
  ];
  return {
    ...TOOL_META,
    securitySchemes,
    "openai/securitySchemes": securitySchemes,
    ui: { resourceUri: APP_WIDGET_URI, visibility: ["model", "app"] },
  };
}

function toolSecuritySchemes() {
  return toolMetaWithResource().securitySchemes;
}

function estimateCredits(mode: string, imageCount: number, editCount: number) {
  const selectedImageCredits = 2 + imageCount * 5;
  const selectedEditCredits = editCount * 3;

  if (mode === LYRIC_VIDEO_FORGE_APP.toolNames.start) return 4;
  if (mode === LYRIC_VIDEO_FORGE_APP.toolNames.chooseSttModel) return 0;
  if (mode === LYRIC_VIDEO_FORGE_APP.toolNames.transcribeAudio) return 4;
  if (mode === LYRIC_VIDEO_FORGE_APP.toolNames.exportSrt) return 1;
  if (mode === LYRIC_VIDEO_FORGE_APP.toolNames.exportAss) return 2;
  if (mode === LYRIC_VIDEO_FORGE_APP.toolNames.renderVideo) return 8 + selectedImageCredits + selectedEditCredits;
  if (mode === LYRIC_VIDEO_FORGE_APP.toolNames.visualPlan) return selectedImageCredits + selectedEditCredits;

  return selectedImageCredits;
}

function buildToolOutputShape(mode: string, args: any) {
  const imageCount = Math.min(12, Math.max(1, Number(args?.imageCount || 4)));
  const editCount = Math.min(30, Math.max(0, Number(args?.editCount || 0)));
  const estimatedCredits = estimateCredits(mode, imageCount, editCount);
  const lyricsApproved = Boolean(args?.lyricsApproved || args?.lyricsStatus === "approved");
  const sttModel = args?.model || args?.sttModel || "groq-whisper-large-v3-turbo";
  const timestamps = args?.timestamps || "word";
  const captionsFormat = mode === LYRIC_VIDEO_FORGE_APP.toolNames.exportSrt ? "srt" : mode === LYRIC_VIDEO_FORGE_APP.toolNames.exportAss ? "ass" : "";
  const renderMode = args?.timingMode || "word_timestamps";
  const availableModels = [
    "groq-whisper-large-v3",
    "groq-whisper-large-v3-turbo",
    "openai-whisper-1",
    "openai-gpt-4o-transcribe",
    "local-faster-whisper",
  ];
  const actionNextSteps: Record<string, string> = {
    [LYRIC_VIDEO_FORGE_APP.toolNames.chooseSttModel]:
      "Use the selected STT model for the next transcription call; prefer word timestamps for lyric videos.",
    [LYRIC_VIDEO_FORGE_APP.toolNames.transcribeAudio]:
      "Return word-timed lyric rows, then require the user to review and approve the transcript before rendering.",
    [LYRIC_VIDEO_FORGE_APP.toolNames.exportSrt]:
      "Export a platform-compatible SRT caption file from the approved timed lyrics.",
    [LYRIC_VIDEO_FORGE_APP.toolNames.exportAss]:
      "Export a styled ASS subtitle file from the approved timed lyrics for FFmpeg burn-in.",
    [LYRIC_VIDEO_FORGE_APP.toolNames.renderVideo]:
      "Render the lyric video with uploaded audio, approved timed captions, selected images, dissolves, watermark, and QC pass.",
    [LYRIC_VIDEO_FORGE_APP.toolNames.visualPlan]:
      "Open the Forge page, upload the reference, and generate the selected dissolve image plan.",
  };

  const structuredContent = {
    app: LYRIC_VIDEO_FORGE_APP.id,
    mode,
    artist: args?.artist || "M3ntally-iLL",
    songTitle: args?.songTitle || "Untitled",
    imageCount,
    editCount,
    estimatedCredits,
    lyricsApproved,
    characterReferenceProvided: Boolean(args?.characterReferenceProvided),
    nextStep: actionNextSteps[mode] || "Collect audio and character reference, transcribe, then require user lyric approval before visuals.",
    sttModel,
    timestamps,
    captionsFormat,
    renderMode,
    requiresForgeUpload: true,
    artifactPlan:
      mode === LYRIC_VIDEO_FORGE_APP.toolNames.renderVideo
        ? ["timed transcript json", "ASS captions", "SRT captions", "watermarked MP4", "QC contact sheet"]
        : mode === LYRIC_VIDEO_FORGE_APP.toolNames.transcribeAudio
          ? ["timed transcript json", "reviewable lyrics text"]
          : captionsFormat
            ? [`${captionsFormat.toUpperCase()} captions`]
            : [],
    availableModels,
    creditPolicy:
      "Credits are charged by action: transcription, caption export, selected image count, edit passes, and final render. Ad-earned credits only apply when payout remains profitable.",
  };

  return {
    structuredContent,
    content: [
      {
        type: "text",
        text: `Lyric Video Forge action ready: ${mode}. ${structuredContent.artist} - ${structuredContent.songTitle}. Estimated credits: ${estimatedCredits}.`,
      },
    ],
    _meta: {
      ui: { resourceUri: APP_WIDGET_URI },
      forge: structuredContent,
      securityBoundary:
        "MCP exposes production workflow actions. File upload, credit spend, rendering, purchases, and external writes still require the normal Forge UI/account confirmation.",
      locale: args?._meta?.["openai/locale"] || "en",
    },
  };
}

function unauthorizedToolOutput(scope: string) {
  return {
    content: [
      {
        type: "text",
        text: "Sign in to ILLCO AI before using Lyric Video Forge credits from ChatGPT.",
      },
    ],
    _meta: {
      "mcp/www_authenticate": `Bearer resource_metadata="${APP_WIDGET_DOMAIN}/.well-known/oauth-protected-resource", scope="${scope}"`,
    },
  };
}

function paymentRequiredToolOutput(context: OAuthUserContext, scope: string) {
  return {
    structuredContent: {
      app: LYRIC_VIDEO_FORGE_APP.id,
      mode: "payment_required",
      artist: "M3ntally-iLL",
      songTitle: "Untitled",
      imageCount: 4,
      editCount: 0,
      estimatedCredits: 0,
      lyricsApproved: false,
      characterReferenceProvided: false,
      nextStep: "Buy Lyric Video Forge credits from ILLCO AI, then reconnect this ChatGPT app.",
      sttModel: "groq-whisper-large-v3-turbo",
      timestamps: "word",
      captionsFormat: "",
      renderMode: "word_timestamps",
      requiresForgeUpload: false,
      artifactPlan: [],
      availableModels: ["groq-whisper-large-v3-turbo"],
      creditPolicy: "Paid Forge actions require a purchase or credit balance tied to the signed-in ILLCO account.",
      transcriptionStatus: "payment-required",
    },
    content: [
      {
        type: "text",
        text: `${context.user.email} is signed in, but no Lyric Video Forge purchase or credit balance is attached yet. Buy credits before running paid Forge actions.`,
      },
    ],
    _meta: {
      account: {
        email: context.user.email,
        purchases: context.purchases.length,
      },
      requiredScope: scope,
      checkoutUrl: "https://www.illcoai.tech/ads/lyric-video-forge#checkout-products",
    },
  };
}

async function authorizeToolCall(name: string, request: Request | null | undefined) {
  const requiredScope = toolScopeByName[name] || "lyric_video:plan";
  const context = await getOAuthUserContextFromRequest(request);
  if (!context || !hasRequiredScope(context, requiredScope)) {
    return { ok: false as const, result: unauthorizedToolOutput(requiredScope) };
  }
  if (paidToolNames.has(name) && !hasLyricVideoPurchase(context)) {
    return { ok: false as const, result: paymentRequiredToolOutput(context, requiredScope) };
  }
  return { ok: true as const, context };
}

function getFileReference(args: any): ChatGptFileReference | null {
  const direct = args?.audioFile || args?.file || args?.audio;
  if (direct && typeof direct === "object") return direct as ChatGptFileReference;
  const fromMeta = args?._meta?.audioFile || args?._meta?.file || args?._meta?.["openai/files"]?.[0];
  if (fromMeta && typeof fromMeta === "object") return fromMeta as ChatGptFileReference;
  return null;
}

function getFileDownloadUrl(file: ChatGptFileReference | null) {
  return String(file?.download_url || file?.downloadUrl || "").trim();
}

function getFileName(file: ChatGptFileReference | null, args: any) {
  return String(file?.file_name || file?.fileName || args?.audioFileName || "audio.mp3").trim() || "audio.mp3";
}

function normalizeTimedWords(payload: any) {
  const words = Array.isArray(payload?.words) ? payload.words : [];
  return words
    .map((word: any) => ({
      word: String(word?.word || word?.text || "").trim(),
      start: Number(word?.start ?? 0),
      end: Number(word?.end ?? word?.start ?? 0),
    }))
    .filter((word: { word: string; start: number; end: number }) => word.word && Number.isFinite(word.start) && Number.isFinite(word.end));
}

function normalizeTimedSegments(payload: any) {
  const segments = Array.isArray(payload?.segments) ? payload.segments : [];
  return segments
    .map((segment: any) => ({
      text: String(segment?.text || "").replace(/\s+/g, " ").trim(),
      start: Number(segment?.start ?? 0),
      end: Number(segment?.end ?? segment?.start ?? 0),
    }))
    .filter((segment: { text: string; start: number; end: number }) => segment.text && Number.isFinite(segment.start) && Number.isFinite(segment.end));
}

async function fetchAudioFileBlob(file: ChatGptFileReference | null, args: any) {
  const downloadUrl = getFileDownloadUrl(file) || String(args?.audioFileUrl || "").trim();
  if (!downloadUrl) return null;
  const response = await fetch(downloadUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Audio file could not be fetched (${response.status}).`);
  }
  return await response.blob();
}

async function callOpenAiTranscription(input: {
  audioBlob: Blob;
  fileName: string;
  model: string;
  timestamps: string;
  knownLyrics?: string;
}) {
  if (!env.codexApiKey) throw new Error("OPENAI_API_KEY is not configured for transcription.");
  const form = new FormData();
  form.set("file", input.audioBlob, input.fileName);
  form.set("model", input.model === "openai-gpt-4o-transcribe" ? "gpt-4o-transcribe" : "whisper-1");
  form.set("response_format", "verbose_json");
  if (input.knownLyrics) form.set("prompt", input.knownLyrics);
  if (input.timestamps === "word" && input.model !== "openai-gpt-4o-transcribe") {
    form.append("timestamp_granularities[]", "word");
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.codexApiKey}` },
    body: form,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "OpenAI transcription failed.");
  return payload;
}

async function callGroqTranscription(input: {
  audioBlob: Blob;
  fileName: string;
  model: string;
  timestamps: string;
  knownLyrics?: string;
}) {
  if (!env.groqApiKey) throw new Error("GROQ_API_KEY is not configured for transcription.");

  async function request(includeWordGranularity: boolean) {
    const form = new FormData();
    form.set("file", input.audioBlob, input.fileName);
    form.set("model", input.model.replace(/^groq-/, ""));
    form.set("response_format", "verbose_json");
    if (input.knownLyrics) form.set("prompt", input.knownLyrics);
    if (includeWordGranularity && input.timestamps === "word") {
      form.append("timestamp_granularities[]", "word");
    }

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.groqApiKey}` },
      body: form,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || "Groq transcription failed.");
    return payload;
  }

  try {
    return await request(true);
  } catch (error) {
    if (input.timestamps !== "word") throw error;
    return await request(false);
  }
}

async function buildTranscribeAudioOutput(args: any) {
  const base = buildToolOutputShape(LYRIC_VIDEO_FORGE_APP.toolNames.transcribeAudio, args);
  const file = getFileReference(args);
  const fileName = getFileName(file, args);
  const model = String(args?.model || args?.sttModel || "groq-whisper-large-v3-turbo");
  const timestamps = String(args?.timestamps || "word");

  try {
    const audioBlob = await fetchAudioFileBlob(file, args);
    if (!audioBlob) {
      return {
        ...base,
        structuredContent: {
          ...base.structuredContent,
          requiresForgeUpload: true,
          transcriptionStatus: "missing-file",
          transcriptionError: "Attach an audio file to the ChatGPT tool call or upload it inside Forge.",
        },
        content: [
          {
            type: "text",
            text: "Forge can transcribe now, but this call did not include an audio file reference. Attach the MP3 to the transcribe_audio action.",
          },
        ],
      };
    }

    const payload = model.startsWith("groq-")
      ? await callGroqTranscription({ audioBlob, fileName, model, timestamps, knownLyrics: args?.knownLyrics })
      : await callOpenAiTranscription({ audioBlob, fileName, model, timestamps, knownLyrics: args?.knownLyrics });
    const words = normalizeTimedWords(payload);
    const segments = normalizeTimedSegments(payload);
    const transcriptText = String(payload?.text || segments.map((segment: { text: string }) => segment.text).join(" ")).replace(/\s+/g, " ").trim();
    const timedLyrics = {
      sourceFile: fileName,
      model,
      timestamps,
      text: transcriptText,
      words,
      segments,
      status: words.length ? "word-timestamps-ready" : segments.length ? "segment-timestamps-ready" : "text-only",
    };

    return {
      ...base,
      structuredContent: {
        ...base.structuredContent,
        requiresForgeUpload: false,
        transcriptionStatus: timedLyrics.status,
        transcriptText,
        timedLyricsJson: JSON.stringify(timedLyrics),
        wordCount: words.length,
        segmentCount: segments.length,
        nextStep: "Review and approve the timed transcript, then export ASS/SRT captions before rendering.",
      },
      content: [
        {
          type: "text",
          text: `Transcription complete for ${fileName}. Words: ${words.length}. Segments: ${segments.length}. Review the lyrics before rendering.`,
        },
      ],
      _meta: {
        ...base._meta,
        forge: timedLyrics,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed.";
    return {
      ...base,
      structuredContent: {
        ...base.structuredContent,
        requiresForgeUpload: true,
        transcriptionStatus: "error",
        transcriptionError: message,
      },
      content: [
        {
          type: "text",
          text: `Transcription failed for ${fileName}: ${message}`,
        },
      ],
    };
  }
}

export function getLyricVideoForgeTools() {
  return [
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.start,
      title: "Start Lyric Video Forge",
      description:
        "Use this when the user wants to create a lyric video from audio, a character reference, artist/song details, credits, and visual direction.",
      inputSchema: {
        type: "object",
      properties: {
          artist: { type: "string", default: "M3ntally-iLL" },
          songTitle: { type: "string", default: "Untitled" },
          visualDirection: { type: "string" },
          imageCount: { type: "integer", minimum: 1, maximum: 12, default: 4 },
          editCount: { type: "integer", minimum: 0, maximum: 30 },
          lyricsStatus: {
            type: "string",
            enum: ["needs_transcription", "user_supplied", "approved"],
            default: "needs_transcription",
          },
        },
        required: ["artist", "songTitle"],
        additionalProperties: false,
      },
      outputSchema: TOOL_OUTPUT_SCHEMA,
      securitySchemes: toolSecuritySchemes(),
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      _meta: toolMetaWithResource(),
    },
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.transcript,
      title: "Review Rap Transcript",
      description:
        "Use this when lyrics or transcription text need to be reviewed before image generation or rendering is unlocked.",
      inputSchema: {
        type: "object",
        properties: {
          transcript: { type: "string" },
          knownIssues: { type: "string" },
          requireUserApproval: { type: "boolean", default: true },
        },
        required: ["transcript"],
        additionalProperties: false,
      },
      outputSchema: TOOL_OUTPUT_SCHEMA,
      securitySchemes: toolSecuritySchemes(),
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      _meta: toolMetaWithResource(),
    },
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.visualPlan,
      title: "Plan Dissolve Visuals",
      description:
        "Use this after lyrics are confirmed to plan the selected number of images, character lock, dissolve pacing, and render requirements.",
      inputSchema: {
        type: "object",
        properties: {
          artist: { type: "string" },
          songTitle: { type: "string" },
          imageCount: { type: "integer", minimum: 1, maximum: 12 },
          editCount: { type: "integer", minimum: 0, maximum: 30 },
          lyricsApproved: { type: "boolean" },
          characterReferenceProvided: { type: "boolean" },
          visualDirection: { type: "string" },
        },
        required: ["artist", "songTitle", "imageCount", "lyricsApproved", "characterReferenceProvided"],
        additionalProperties: false,
      },
      outputSchema: TOOL_OUTPUT_SCHEMA,
      securitySchemes: toolSecuritySchemes(),
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      _meta: toolMetaWithResource(),
    },
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.chooseSttModel,
      title: "Choose STT Model",
      description:
        "Use this when ChatGPT needs to select the speech-to-text model and timestamp granularity before transcribing a lyric video.",
      inputSchema: {
        type: "object",
        properties: {
          audioFileName: { type: "string" },
          model: {
            type: "string",
            enum: [
              "groq-whisper-large-v3",
              "groq-whisper-large-v3-turbo",
              "openai-whisper-1",
              "openai-gpt-4o-transcribe",
              "local-faster-whisper",
            ],
            default: "groq-whisper-large-v3-turbo",
          },
          timestamps: {
            type: "string",
            enum: ["word", "segment"],
            default: "word",
          },
          priority: {
            type: "string",
            enum: ["fast", "accurate", "low_cost", "best_timing"],
            default: "best_timing",
          },
        },
        required: ["model", "timestamps"],
        additionalProperties: false,
      },
      outputSchema: TOOL_OUTPUT_SCHEMA,
      securitySchemes: toolSecuritySchemes(),
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false, idempotentHint: true },
      _meta: toolMetaWithResource(),
    },
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.transcribeAudio,
      title: "Transcribe Audio",
      description:
        "Use this when ChatGPT needs Forge to transcribe uploaded audio and return timed lyric data for review before rendering.",
      inputSchema: {
        type: "object",
        properties: {
          audioFile: AUDIO_FILE_SCHEMA,
          audioFileName: { type: "string" },
          model: {
            type: "string",
            enum: [
              "groq-whisper-large-v3",
              "groq-whisper-large-v3-turbo",
              "openai-whisper-1",
              "openai-gpt-4o-transcribe",
              "local-faster-whisper",
            ],
            default: "groq-whisper-large-v3-turbo",
          },
          timestamps: {
            type: "string",
            enum: ["word", "segment"],
            default: "word",
          },
          artist: { type: "string", default: "M3ntally-iLL" },
          songTitle: { type: "string" },
          knownLyrics: { type: "string" },
          knownIssues: { type: "string" },
        },
        required: ["audioFile", "model", "timestamps"],
        additionalProperties: false,
      },
      outputSchema: TOOL_OUTPUT_SCHEMA,
      securitySchemes: toolSecuritySchemes(),
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false, idempotentHint: true },
      _meta: {
        ...toolMetaWithResource(),
        "openai/fileParams": ["audioFile"],
      },
    },
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.exportSrt,
      title: "Export SRT Captions",
      description:
        "Use this when approved timed lyrics need to be exported as an SRT caption file for platforms or review.",
      inputSchema: {
        type: "object",
        properties: {
          timedLyricsJson: { type: "string" },
          maxCharsPerLine: { type: "integer", minimum: 24, maximum: 60, default: 42 },
          maxLines: { type: "integer", minimum: 1, maximum: 3, default: 2 },
          lyricsApproved: { type: "boolean" },
        },
        required: ["timedLyricsJson", "lyricsApproved"],
        additionalProperties: false,
      },
      outputSchema: TOOL_OUTPUT_SCHEMA,
      securitySchemes: toolSecuritySchemes(),
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false, idempotentHint: true },
      _meta: toolMetaWithResource(),
    },
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.exportAss,
      title: "Export ASS Captions",
      description:
        "Use this when approved timed lyrics need styled ASS captions for FFmpeg lyric-video burn-in.",
      inputSchema: {
        type: "object",
        properties: {
          timedLyricsJson: { type: "string" },
          stylePreset: {
            type: "string",
            enum: ["clean", "rgb_glow", "holy_gold", "hell_red", "chrome", "graffiti"],
            default: "rgb_glow",
          },
          watermarkText: { type: "string", default: "Video Forge iLLCoAI.Tech" },
          maxCharsPerLine: { type: "integer", minimum: 24, maximum: 60, default: 42 },
          maxLines: { type: "integer", minimum: 1, maximum: 3, default: 2 },
          lyricsApproved: { type: "boolean" },
        },
        required: ["timedLyricsJson", "lyricsApproved"],
        additionalProperties: false,
      },
      outputSchema: TOOL_OUTPUT_SCHEMA,
      securitySchemes: toolSecuritySchemes(),
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false, idempotentHint: true },
      _meta: toolMetaWithResource(),
    },
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.renderVideo,
      title: "Render Lyric Video",
      description:
        "Use this when audio, approved timed captions, selected images, and render settings are ready for a watermarked lyric-video render.",
      inputSchema: {
        type: "object",
        properties: {
          audioFileName: { type: "string" },
          captionsFileName: { type: "string" },
          captionsFormat: {
            type: "string",
            enum: ["ass", "srt"],
            default: "ass",
          },
          images: {
            type: "array",
            items: { type: "string" },
          },
          imageCount: { type: "integer", minimum: 1, maximum: 12, default: 4 },
          editCount: { type: "integer", minimum: 0, maximum: 30, default: 0 },
          timingMode: {
            type: "string",
            enum: ["word_timestamps", "segment_timestamps", "manual_cues"],
            default: "word_timestamps",
          },
          transition: {
            type: "string",
            enum: ["dissolve", "flash_dissolve", "slow_zoom_dissolve"],
            default: "dissolve",
          },
          watermarkText: { type: "string", default: "Video Forge iLLCoAI.Tech" },
          lyricsApproved: { type: "boolean" },
          userConfirmedRender: { type: "boolean" },
        },
        required: ["captionsFileName", "images", "lyricsApproved", "userConfirmedRender"],
        additionalProperties: false,
      },
      outputSchema: TOOL_OUTPUT_SCHEMA,
      securitySchemes: toolSecuritySchemes(),
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
      _meta: toolMetaWithResource(),
    },
  ];
}

function ok(id: JsonRpcRequest["id"], result: any) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function error(id: JsonRpcRequest["id"], code: number, message: string) {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status: code === -32601 ? 404 : 400 }
  );
}

function normalizeOrigin(origin: string) {
  return typeof origin === "string" && origin.length > 0 ? origin : APP_WIDGET_DOMAIN;
}

export function buildWidgetHtml(origin = "") {
  const safeOrigin = normalizeOrigin(origin);
  const apiBase = safeOrigin ? `${safeOrigin}/tools/lyric-video-forge` : "/tools/lyric-video-forge";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Lyric Video Forge</title>
<style>
:root{color-scheme:dark;--gold:#ffd66b;--ink:#07080c;--panel:#11141d;--line:rgba(255,255,255,.16);--text:#f9f3e3;--muted:#b7ad96;--red:#ff425e}*{box-sizing:border-box}body{margin:0;font-family:Georgia,'Times New Roman',serif;background:radial-gradient(circle at 20% 0%,rgba(255,214,107,.18),transparent 28%),linear-gradient(145deg,#06070b,#17100d 58%,#07080c);color:var(--text)}main{min-height:100vh;padding:22px;display:grid;gap:16px}.hero{border:1px solid var(--line);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.03));padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.45)}h1{font-size:clamp(32px,8vw,64px);line-height:.9;margin:8px 0 12px;letter-spacing:-.06em}.pill{display:inline-flex;border:1px solid rgba(255,214,107,.5);color:var(--gold);border-radius:999px;padding:7px 10px;font-size:12px;text-transform:uppercase;letter-spacing:.16em}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.card{border:1px solid var(--line);border-radius:18px;background:rgba(0,0,0,.26);padding:14px}.card strong{display:block;color:var(--gold);font-size:22px}button,a.button{appearance:none;text-decoration:none;border:0;border-radius:14px;padding:13px 15px;background:var(--gold);color:#171009;font-weight:900;cursor:pointer}.secondary{background:rgba(255,255,255,.1)!important;color:var(--text)!important;border:1px solid var(--line)!important}.actions{display:flex;gap:10px;flex-wrap:wrap}.muted{color:var(--muted)}pre{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#050609;border:1px solid var(--line);border-radius:16px;padding:14px;max-height:240px;overflow:auto}@media(max-width:720px){.grid{grid-template-columns:1fr}main{padding:14px}}
</style>
</head>
<body>
<main>
<section class="hero">
<span class="pill">ChatGPT App</span>
<h1>Lyric Video Forge</h1>
<p class="muted">Upload audio and a character reference in the ILLCO page, transcribe rap lyrics, confirm the words, then spend credits on generated images and dissolve visuals.</p>
<div class="actions">
<a class="button" href="${apiBase}" target="_blank" rel="noreferrer">Open full ILLCO Forge</a>
<button class="secondary" id="ask">Ask ChatGPT to start</button>
</div>
</section>
<section class="grid">
<div class="card"><strong>1</strong><p>Transcribe first with rap-specialist instructions and word-timing fallback.</p></div>
<div class="card"><strong>2</strong><p>User confirms lyrics before any render/image generation plan unlocks.</p></div>
<div class="card"><strong>3</strong><p>Credits choose image count; stills dissolve instead of hard cutting.</p></div>
</section>
<section class="card">
<strong>Current tool output</strong>
<pre id="out">Waiting for ChatGPT tool output...</pre>
</section>
</main>
<script>
const out = document.getElementById('out');
function paint(event) {
  const data = event?.data?.params || window.openai?.toolOutput || window.openai?.toolResponseMetadata || window.openai?.toolInput;
  if (data) out.textContent = JSON.stringify(data, null, 2);
}
paint();
document.getElementById('ask').onclick = () => {
  if (window.openai?.sendFollowUpMessage) {
    window.openai.sendFollowUpMessage({
      prompt:
        "Start a Lyric Video Forge run. Ask me for the song audio, character reference, artist name, song title, and image count."
    });
  } else {
    out.textContent = "Open this inside ChatGPT to use the Apps bridge.";
  }
};
window.addEventListener('message', paint);
</script>
</body>
</html>`;
}

export async function handleLyricVideoForgeRpc(request: JsonRpcRequest, origin = "", httpRequest?: Request) {
  const id = request.id ?? null;
  const method = request.method || "";
  const safeOrigin = normalizeOrigin(origin);

  if (method === "initialize") {
    return ok(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {}, resources: {} },
      instructions: MCP_INSTRUCTIONS,
      serverInfo: { name: LYRIC_VIDEO_FORGE_APP.serverName, version: LYRIC_VIDEO_FORGE_APP.serverVersion },
    });
  }

  if (method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }

  if (method === "tools/list") {
    return ok(id, { tools: getLyricVideoForgeTools() });
  }

  if (method === "resources/list") {
    const connectDomains = Array.from(new Set([safeOrigin, ...APP_CONNECT_DOMAINS]));
    const resourceDomains = Array.from(new Set([safeOrigin, ...APP_RESOURCE_DOMAINS]));
    return ok(id, {
      resources: [
        {
          uri: APP_WIDGET_URI,
          name: LYRIC_VIDEO_FORGE_APP.title,
          title: LYRIC_VIDEO_FORGE_APP.title,
          description: LYRIC_VIDEO_FORGE_APP.description,
          mimeType: MCP_WIDGET_MIME_TYPE,
          _meta: {
            ...MCP_WIDGET_META,
            ui: {
              ...MCP_WIDGET_META.ui,
              csp: {
                connectDomains,
                resourceDomains,
              },
            },
          },
        },
      ],
    });
  }

  if (method === "resources/read") {
    const uri = request.params?.uri;
    if (uri !== APP_WIDGET_URI) return error(id, -32602, "Unknown resource URI.");
    return ok(id, {
      contents: [
        {
          uri,
          mimeType: MCP_WIDGET_MIME_TYPE,
          text: buildWidgetHtml(safeOrigin),
          _meta: {
            ...MCP_WIDGET_META,
          },
        },
      ],
    });
  }

  if (method === "tools/call") {
    const name = request.params?.name;
    const args = request.params?.arguments || {};
    if (!Object.values(LYRIC_VIDEO_FORGE_APP.toolNames).includes(name))
      return error(id, -32602, "Unknown Lyric Video Forge tool.");
    const authorization = await authorizeToolCall(name, httpRequest);
    if (!authorization.ok) return ok(id, authorization.result);
    if (name === LYRIC_VIDEO_FORGE_APP.toolNames.transcribeAudio) {
      return ok(id, await buildTranscribeAudioOutput(args));
    }
    return ok(id, buildToolOutputShape(name, args));
  }

  return error(id, -32601, `Unsupported MCP method: ${method}`);
}
