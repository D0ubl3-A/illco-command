import {
  AUTOTUBE_TOOL_NAME,
  AUTOTUBE_WIDGET_URI,
  normalizeAutoTubeRequest,
  type AutoTubeRenderRequest,
} from "@/lib/autotube/contracts";
import { AutoTubeServiceError } from "@/lib/autotube/server";
import {
  submitAutoTubeRenderV4,
  type AutoTubeV4ProductionPackage,
} from "@/lib/autotube/server-v4";
import {
  AUTOTUBE_STANDARD_VERSION,
  AUTOTUBE_STYLES,
  buildAutoTubeMasterPrompt,
  buildAutoTubePipeline,
  getAutoTubeStyle,
  scoreAutoTubeVideoPlan,
  type AnimationPreset,
  type AnimationTarget,
  type AnimationTrack,
  type AutoTubeScene,
  type AutoTubeStyleId,
  type AutoTubeVideoPlan,
  type EasingPreset,
  type SceneKind,
  type VideoIntent,
  type VisualMode,
} from "@/lib/chatgpt-apps/autotube/index";
import {
  autoTubeHealth as legacyAutoTubeHealth,
  handleAutoTubeRpc as handleLegacyAutoTubeRpc,
} from "@/lib/chatgpt-apps/autotube";

const SUPPORTED_RENDERER_PRESETS = new Set<AnimationPreset>([
  "none",
  "fade",
  "slide",
  "scale",
  "spring",
  "reveal",
  "mask-wipe",
  "typewriter",
  "word-pop",
  "letter-build",
  "counter",
  "draw-path",
  "cursor-demo",
  "tap-demo",
  "scroll-demo",
  "parallax",
  "orbit",
  "float",
  "pulse",
  "glitch",
  "morph",
  "camera-pan",
  "camera-push",
  "camera-pull",
  "camera-orbit",
  "music-reactive",
]);

const VIDEO_INTENTS: VideoIntent[] = [
  "cold-outreach",
  "follow-up",
  "product-demo",
  "explainer",
  "brand-film",
  "social-ad",
  "case-study",
  "proposal",
  "tutorial",
  "story",
  "music-visual",
  "internal-update",
];

const SCENE_KINDS: SceneKind[] = [
  "hook",
  "current-state",
  "problem",
  "website",
  "intake",
  "qualification",
  "workflow",
  "product",
  "scheduling",
  "follow-up",
  "handoff",
  "dashboard",
  "integration",
  "character",
  "environment",
  "data",
  "testimonial",
  "before",
  "after",
  "outcome",
  "offer",
  "cta",
  "transition",
];

const VISUAL_MODES: VisualMode[] = [
  "website-capture",
  "live-ui",
  "workflow-diagram",
  "dashboard",
  "message-thread",
  "calendar",
  "document-view",
  "product-view",
  "character-animation",
  "cinematic-scene",
  "kinetic-type",
  "chart-animation",
  "before-after",
  "photo-collage",
  "abstract-motion",
  "music-reactive",
  "brand-transition",
];

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maximum: number, fallback = "") {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, maximum);
}

function list(value: unknown, maximum = 40) {
  return Array.isArray(value) ? value.slice(0, maximum) : [];
}

function numberBetween(value: unknown, minimum: number, maximum: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function selectedStyleId(value: unknown): AutoTubeStyleId {
  const candidate = text(value, 80) as AutoTubeStyleId;
  return candidate in AUTOTUBE_STYLES ? candidate : "animated-explainer";
}

function selectedIntent(value: unknown, styleId: AutoTubeStyleId): VideoIntent {
  const candidate = text(value, 80) as VideoIntent;
  return VIDEO_INTENTS.includes(candidate)
    ? candidate
    : getAutoTubeStyle(styleId).bestFor[0] ?? "explainer";
}

function isAdvancedRequest(input: unknown) {
  const source = objectValue(input);
  if (source.style_id || source.styleId || source.intent || source.standard_version) return true;
  return list(source.scenes).some((entry) => {
    const scene = objectValue(entry);
    return Boolean(
      scene.id || scene.kind || scene.visual || scene.animations || scene.camera ||
        scene.character_actions || scene.audio || scene.claims,
    );
  });
}

function defaultKind(
  index: number,
  count: number,
  grammar: SceneKind[],
  intent: VideoIntent,
): SceneKind {
  if (index === 0) return "hook";
  if (index === count - 1) {
    return ["cold-outreach", "follow-up", "product-demo", "social-ad", "proposal", "case-study"].includes(intent)
      ? "cta"
      : "outcome";
  }
  return grammar[index % Math.max(1, grammar.length)] ?? "workflow";
}

function normalizeKind(value: unknown, fallback: SceneKind): SceneKind {
  const candidate = text(value, 60) as SceneKind;
  return SCENE_KINDS.includes(candidate) ? candidate : fallback;
}

function normalizeVisualMode(value: unknown, fallback: VisualMode): VisualMode {
  const candidate = text(value, 80) as VisualMode;
  return VISUAL_MODES.includes(candidate) ? candidate : fallback;
}

function generatedAnimations(
  sceneId: string,
  durationSeconds: number,
  styleId: AutoTubeStyleId,
): AnimationTrack[] {
  const style = getAutoTubeStyle(styleId);
  const available = style.animationLanguage.filter((preset) => SUPPORTED_RENDERER_PRESETS.has(preset));
  const vocabulary: AnimationPreset[] = available.length
    ? available
    : ["fade", "camera-push", "parallax", "reveal"];
  const required = Math.max(1, style.minimumAnimationTracksPerScene);
  const trackDuration = Math.max(0.35, Math.min(1.4, durationSeconds / Math.max(2, required + 1)));
  return Array.from({ length: required }, (_, index): AnimationTrack => ({
    id: `${sceneId}-motion-${index + 1}`,
    target: index === 0 ? "scene" : index === 1 ? "headline" : "image",
    preset: vocabulary[index % vocabulary.length],
    startSeconds: Math.min(
      Math.max(0, durationSeconds - trackDuration),
      Number((index * Math.min(0.7, trackDuration)).toFixed(2)),
    ),
    durationSeconds: trackDuration,
    easing: index % 2 ? "ease-in-out" : "ease-out",
  }));
}

function normalizeAnimations(
  raw: unknown,
  sceneId: string,
  durationSeconds: number,
  styleId: AutoTubeStyleId,
): AnimationTrack[] {
  const parsed = list(raw, 24)
    .map((entry, index): AnimationTrack | null => {
      const item = objectValue(entry);
      const preset = text(item.preset, 80) as AnimationPreset;
      if (!preset) return null;
      const duration = numberBetween(
        item.durationSeconds ?? item.duration_seconds,
        0.1,
        durationSeconds,
        Math.min(1, durationSeconds),
      );
      return {
        id: text(item.id, 120, `${sceneId}-motion-${index + 1}`),
        target: text(item.target, 60, "scene") as AnimationTarget,
        preset,
        startSeconds: numberBetween(
          item.startSeconds ?? item.start_seconds,
          0,
          Math.max(0, durationSeconds - duration),
          0,
        ),
        durationSeconds: duration,
        easing: text(item.easing, 40, "ease-in-out") as EasingPreset,
        delaySeconds: numberBetween(
          item.delaySeconds ?? item.delay_seconds,
          0,
          durationSeconds,
          0,
        ),
        parameters: objectValue(item.parameters) as Record<string, string | number | boolean>,
      };
    })
    .filter((entry): entry is AnimationTrack => Boolean(entry));
  return parsed.length ? parsed : generatedAnimations(sceneId, durationSeconds, styleId);
}

function normalizeEvidence(value: unknown) {
  return list(value, 60)
    .map((entry, index) => {
      const item = objectValue(entry);
      const sourceUrl = text(item.sourceUrl ?? item.source_url, 2_048);
      const observedFact = text(item.observedFact ?? item.observed_fact, 1_000);
      if (!sourceUrl || !observedFact) return null;
      const confidenceValue = text(item.confidence, 20, "medium");
      return {
        id: text(item.id, 120, `evidence-${index + 1}`),
        sourceUrl,
        observedFact,
        capturedAt: text(item.capturedAt ?? item.captured_at, 80, new Date().toISOString()),
        confidence: (["high", "medium", "low"].includes(confidenceValue)
          ? confidenceValue
          : "medium") as "high" | "medium" | "low",
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

function normalizeBusiness(value: unknown, prospect: string) {
  const source = objectValue(value);
  const risk = text(source.riskProfile ?? source.risk_profile, 30, "standard");
  return {
    name: text(source.name, 180, prospect),
    website: text(source.website, 2_048) || undefined,
    industry: text(source.industry, 160) || undefined,
    businessModel: text(source.businessModel ?? source.business_model, 80) as any,
    riskProfile: (["standard", "regulated", "sensitive"].includes(risk)
      ? risk
      : "standard") as "standard" | "regulated" | "sensitive",
    location: text(source.location, 180) || undefined,
    audience: text(source.audience, 300) || undefined,
    services: list(source.services, 30).map((item) => text(item, 180)).filter(Boolean),
    differentiators: list(source.differentiators, 30).map((item) => text(item, 240)).filter(Boolean),
    approvedTerms: list(source.approvedTerms ?? source.approved_terms, 30)
      .map((item) => text(item, 120)).filter(Boolean),
    prohibitedClaims: list(source.prohibitedClaims ?? source.prohibited_claims, 30)
      .map((item) => text(item, 180)).filter(Boolean),
  };
}

function normalizeClaims(value: unknown) {
  return list(value, 20)
    .map((entry) => {
      const item = objectValue(entry);
      const claimText = text(item.text, 500);
      if (!claimText) return null;
      const candidate = text(item.kind, 30, "proposed");
      const kind = (["observed", "proposed", "measured", "creative"].includes(candidate)
        ? candidate
        : "proposed") as "observed" | "proposed" | "measured" | "creative";
      return {
        text: claimText,
        kind,
        evidenceIds: list(item.evidenceIds ?? item.evidence_ids, 20)
          .map((id) => text(id, 120)).filter(Boolean),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

export function compileAutoTubeV4Request(input: unknown) {
  const source = objectValue(input);
  const legacy = normalizeAutoTubeRequest(input);
  const styleId = selectedStyleId(source.styleId ?? source.style_id);
  const intent = selectedIntent(source.intent, styleId);
  const style = getAutoTubeStyle(styleId);
  const rawScenes = list(source.scenes, 24);
  const requestedDuration = numberBetween(
    source.durationSeconds ?? source.duration_seconds,
    6,
    180,
    legacy.durationSeconds,
  );
  const sceneDurationDefault = Number(
    Math.max(1.5, requestedDuration / Math.max(1, legacy.scenes.length)).toFixed(2),
  );

  const scenes: AutoTubeScene[] = legacy.scenes.map((legacyScene, index) => {
    const raw = objectValue(rawScenes[index]);
    const visual = objectValue(raw.visual);
    const id = text(raw.id, 120, `scene-${index + 1}`);
    const durationSeconds = numberBetween(
      raw.durationSeconds ?? raw.duration_seconds,
      1.5,
      30,
      sceneDurationDefault,
    );
    const mode = normalizeVisualMode(
      visual.mode,
      style.visualModes[index % style.visualModes.length],
    );
    return {
      id,
      kind: normalizeKind(
        raw.kind,
        defaultKind(index, legacy.scenes.length, style.sceneGrammar, intent),
      ),
      title: legacyScene.title,
      onScreenText: legacyScene.onScreenText,
      narration: legacyScene.narration,
      durationSeconds,
      visual: {
        mode,
        uniqueKey: text(
          visual.uniqueKey ?? visual.unique_key,
          160,
          `${styleId}-${id}-${mode}`,
        ),
        assetUrl: text(visual.assetUrl ?? visual.asset_url, 2_048, legacyScene.imageUrl) || undefined,
        videoUrl: text(visual.videoUrl ?? visual.video_url, 2_048) || undefined,
        prompt: text(visual.prompt, 2_000) || undefined,
        interactionSteps: list(visual.interactionSteps ?? visual.interaction_steps, 20)
          .map((step) => text(step, 240)).filter(Boolean),
        layout: text(visual.layout, 160) || undefined,
      },
      animations: normalizeAnimations(raw.animations, id, durationSeconds, styleId),
      transitionOut: (text(raw.transitionOut ?? raw.transition_out, 60) ||
        style.transitionLanguage[index % style.transitionLanguage.length]) as any,
      claims: normalizeClaims(raw.claims),
    };
  });

  const totalDuration = scenes.reduce((total, scene) => total + (scene.durationSeconds ?? 0), 0);
  const plan: AutoTubeVideoPlan = {
    standardVersion: AUTOTUBE_STANDARD_VERSION,
    title: legacy.videoTitle,
    intent,
    styleId,
    business: normalizeBusiness(source.business, legacy.prospect),
    offer: legacy.offer,
    painPoint: legacy.painPoint,
    callToAction: legacy.callToAction,
    aspectRatio: legacy.aspectRatio,
    targetDurationSeconds: requestedDuration,
    brandColors: legacy.brandColors,
    captions: source.captions !== false,
    evidence: normalizeEvidence(source.evidence),
    scenes,
    globalAudio: legacy.narrationScript
      ? [{
          id: "master-narration",
          type: "narration",
          startSeconds: 0,
          durationSeconds: totalDuration,
          text: legacy.narrationScript,
          volume: 1,
        }]
      : [],
  };

  const pipeline = buildAutoTubePipeline(plan);
  const masterPrompt = buildAutoTubeMasterPrompt(plan, {
    requireAnimation: true,
    requireAudio: true,
    requireImageGeneration: true,
    requirePlatformVariants: false,
    critiquePasses: 4,
    outputMode: "render-ready",
  });
  const qualityReport = scoreAutoTubeVideoPlan(plan);
  const unsupported = Array.from(new Set(
    scenes.flatMap((scene) => scene.animations ?? [])
      .map((track) => track.preset)
      .filter((preset) => !SUPPORTED_RENDERER_PRESETS.has(preset)),
  ));

  const production: AutoTubeV4ProductionPackage = {
    standardVersion: AUTOTUBE_STANDARD_VERSION,
    styleId,
    intent,
    plan,
    pipeline,
    masterPrompt,
    qualityReport,
    rendererScenes: scenes.map((scene, index) => ({
      id: scene.id,
      kind: scene.kind,
      durationSeconds: scene.durationSeconds,
      visualMode: scene.visual.mode,
      uniqueKey: scene.visual.uniqueKey,
      imageUrl: legacy.scenes[index]?.imageUrl || scene.visual.assetUrl || "",
      animations: scene.animations ?? [],
      camera: scene.camera ?? [],
      transitionOut: scene.transitionOut,
    })),
    supportedRendererPresets: Array.from(SUPPORTED_RENDERER_PRESETS),
  };

  return { legacy, plan, pipeline, masterPrompt, qualityReport, unsupported, production };
}

function extendToolDefinition(result: any) {
  const tool = result?.result?.tools?.[0];
  if (!tool?.inputSchema?.properties) return result;
  tool.title = "Render AutoTube 4 video";
  tool.description =
    "Create a style-directed, quality-gated AutoTube video. Legacy prospect payloads remain supported. Supplying style_id, intent, or advanced scene fields activates AutoTube 4.";
  tool.inputSchema.properties.style_id = {
    type: "string",
    enum: Object.keys(AUTOTUBE_STYLES),
  };
  tool.inputSchema.properties.intent = { type: "string", enum: VIDEO_INTENTS };
  tool.inputSchema.properties.captions = { type: "boolean", default: true };
  tool.inputSchema.properties.business = { type: "object", additionalProperties: true };
  tool.inputSchema.properties.evidence = {
    type: "array",
    maxItems: 60,
    items: { type: "object", additionalProperties: true },
  };
  const scene = tool.inputSchema.properties.scenes?.items;
  if (scene?.properties) {
    Object.assign(scene.properties, {
      id: { type: "string", maxLength: 120 },
      kind: { type: "string", enum: SCENE_KINDS },
      duration_seconds: { type: "number", minimum: 1.5, maximum: 30 },
      visual: { type: "object", additionalProperties: true },
      animations: {
        type: "array",
        maxItems: 24,
        items: { type: "object", additionalProperties: true },
      },
      camera: {
        type: "array",
        maxItems: 12,
        items: { type: "object", additionalProperties: true },
      },
      character_actions: {
        type: "array",
        maxItems: 12,
        items: { type: "object", additionalProperties: true },
      },
      audio: {
        type: "array",
        maxItems: 12,
        items: { type: "object", additionalProperties: true },
      },
      transition_out: { type: "string" },
      claims: {
        type: "array",
        maxItems: 20,
        items: { type: "object", additionalProperties: true },
      },
    });
  }
  return result;
}

function successOutput(
  request: AutoTubeRenderRequest,
  compiled: ReturnType<typeof compileAutoTubeV4Request>,
  job: Awaited<ReturnType<typeof submitAutoTubeRenderV4>>,
) {
  const structuredContent = {
    app: "autotube",
    version: "4.0.0-runtime",
    prospect: request.prospect,
    videoTitle: request.videoTitle,
    styleId: compiled.plan.styleId,
    intent: compiled.plan.intent,
    qualityScore: compiled.qualityReport.score,
    qualityThreshold: compiled.qualityReport.threshold,
    publishable: compiled.qualityReport.publishable,
    sceneCount: compiled.plan.scenes.length,
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    statusUrl: job.statusUrl,
    videoUrl: job.videoUrl,
    downloadUrl: job.downloadUrl,
    browserEncoding: false,
    deliveryFormat: "MP4/H.264/AAC",
  };
  return {
    structuredContent,
    content: [{
      type: "text",
      text: `AutoTube 4 approved ${request.videoTitle} at ${compiled.qualityReport.score}/${compiled.qualityReport.threshold} and submitted render job ${job.jobId}. Completion is not verified until status is ready and the MP4 is playable.`,
    }],
    _meta: {
      ui: { resourceUri: AUTOTUBE_WIDGET_URI },
      autotube: structuredContent,
      qualityReport: compiled.qualityReport,
      verificationRule:
        "Queued, processing, and rendering are incomplete. Only ready/completed plus a playable verified MP4 counts as complete.",
    },
  };
}

function failureOutput(error: unknown) {
  const serviceError = error instanceof AutoTubeServiceError
    ? error
    : new AutoTubeServiceError(
        error instanceof Error ? error.message : "AutoTube 4 could not submit the render.",
        400,
        "autotube_v4_failed",
      );
  return {
    isError: true,
    content: [{ type: "text", text: `AutoTube 4 did not start: ${serviceError.message}` }],
    _meta: {
      ui: { resourceUri: AUTOTUBE_WIDGET_URI },
      autotubeError: {
        code: serviceError.code,
        status: serviceError.status,
        message: serviceError.message,
        details: serviceError.details,
      },
    },
  };
}

export function autoTubeHealthV4() {
  return {
    ...legacyAutoTubeHealth(),
    standardVersion: AUTOTUBE_STANDARD_VERSION,
    styleEngineAvailable: true,
    qualityGateAvailable: true,
    supportedStyles: Object.keys(AUTOTUBE_STYLES),
    supportedRendererPresets: Array.from(SUPPORTED_RENDERER_PRESETS),
  };
}

export async function handleAutoTubeRpcV4(body: any, origin: string) {
  const method = String(body?.method || "");
  const id = body?.id ?? null;

  if (method === "initialize") {
    const result: any = await handleLegacyAutoTubeRpc(body, origin);
    if (result?.result?.serverInfo) result.result.serverInfo.version = "5.1.0-autotube4";
    if (result?.result) {
      result.result.instructions =
        "Use autotube_render_video. Legacy requests remain compatible. Supply style_id or advanced scene fields for AutoTube 4 style planning, animation manifests, the 85-point publication threshold, and structured blockers. Never claim completion before status is ready and the MP4 is playable.";
    }
    return result;
  }

  if (method === "tools/list") {
    return extendToolDefinition(await handleLegacyAutoTubeRpc(body, origin));
  }

  if (method !== "tools/call") return handleLegacyAutoTubeRpc(body, origin);
  if (String(body?.params?.name || "") !== AUTOTUBE_TOOL_NAME) {
    return handleLegacyAutoTubeRpc(body, origin);
  }

  const args = body?.params?.arguments || {};
  if (!isAdvancedRequest(args)) return handleLegacyAutoTubeRpc(body, origin);

  try {
    const compiled = compileAutoTubeV4Request(args);
    if (!compiled.qualityReport.publishable) {
      throw new AutoTubeServiceError(
        `AutoTube 4 quality gate failed at ${compiled.qualityReport.score}/${compiled.qualityReport.threshold}.`,
        422,
        "AUTOTUBE_QUALITY_GATE_FAILED",
        compiled.qualityReport,
      );
    }
    if (compiled.unsupported.length) {
      throw new AutoTubeServiceError(
        `The renderer does not yet execute: ${compiled.unsupported.join(", ")}.`,
        422,
        "AUTOTUBE_UNSUPPORTED_ANIMATION",
        {
          unsupported: compiled.unsupported,
          supported: Array.from(SUPPORTED_RENDERER_PRESETS),
        },
      );
    }
    const job = await submitAutoTubeRenderV4(compiled.legacy, compiled.production, origin);
    return { jsonrpc: "2.0", id, result: successOutput(compiled.legacy, compiled, job) };
  } catch (error) {
    return { jsonrpc: "2.0", id, result: failureOutput(error) };
  }
}
