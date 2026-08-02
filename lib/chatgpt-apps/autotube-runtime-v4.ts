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
  type AutoTubeScene,
  type AutoTubeStyleId,
  type AutoTubeVideoPlan,
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

const SCENE_KINDS = new Set<SceneKind>([
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
]);

const VISUAL_MODES = new Set<VisualMode>([
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
]);

const VIDEO_INTENTS = new Set<VideoIntent>([
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
]);

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
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function styleId(value: unknown): AutoTubeStyleId {
  const candidate = text(value, 80) as AutoTubeStyleId;
  return candidate in AUTOTUBE_STYLES ? candidate : "animated-explainer";
}

function intent(value: unknown, selectedStyle: AutoTubeStyleId): VideoIntent {
  const candidate = text(value, 80) as VideoIntent;
  if (VIDEO_INTENTS.has(candidate)) return candidate;
  return getAutoTubeStyle(selectedStyle).bestFor[0] ?? "explainer";
}

function sceneKind(value: unknown, fallback: SceneKind): SceneKind {
  const candidate = text(value, 60) as SceneKind;
  return SCENE_KINDS.has(candidate) ? candidate : fallback;
}

function visualMode(value: unknown, fallback: VisualMode): VisualMode {
  const candidate = text(value, 80) as VisualMode;
  return VISUAL_MODES.has(candidate) ? candidate : fallback;
}

function animationPreset(value: unknown): AnimationPreset | null {
  const candidate = text(value, 80) as AnimationPreset;
  return candidate ? candidate : null;
}

function isAdvancedRequest(input: unknown) {
  const source = objectValue(input);
  if (source.style_id || source.styleId || source.intent || source.standard_version) return true;
  return list(source.scenes).some((entry) => {
    const scene = objectValue(entry);
    return Boolean(
      scene.id ||
        scene.kind ||
        scene.visual ||
        scene.animations ||
        scene.camera ||
        scene.character_actions ||
        scene.audio ||
        scene.claims,
    );
  });
}

function defaultKind(index: number, count: number, styleGrammar: SceneKind[], selectedIntent: VideoIntent) {
  if (index === 0) return "hook" as SceneKind;
  if (index === count - 1) {
    return ["cold-outreach", "follow-up", "product-demo", "social-ad", "proposal", "case-study"].includes(
      selectedIntent,
    )
      ? ("cta" as SceneKind)
      : ("outcome" as SceneKind);
  }
  return styleGrammar[index % Math.max(1, styleGrammar.length)] ?? "workflow";
}

function generatedAnimations(
  sceneId: string,
  durationSeconds: number,
  selectedStyle: AutoTubeStyleId,
) {
  const style = getAutoTubeStyle(selectedStyle);
  const supported = style.animationLanguage.filter((preset) => SUPPORTED_RENDERER_PRESETS.has(preset));
  const fallback: AnimationPreset[] = ["fade", "camera-push", "parallax", "reveal"];
  const vocabulary = supported.length ? supported : fallback;
  const required = Math.max(1, style.minimumAnimationTracksPerScene);
  const trackDuration = Math.max(0.35, Math.min(1.4, durationSeconds / Math.max(2, required + 1)));
  return Array.from({ length: required }, (_, index) => {
    const startSeconds = Math.min(
      Math.max(0, durationSeconds - trackDuration),
      Number((index * Math.min(0.7, trackDuration)).toFixed(2)),
    );
    return {
      id: `${sceneId}-motion-${index + 1}`,
      target: index === 0 ? ("scene" as const) : index === 1 ? ("headline" as const) : ("image" as const),
      preset: vocabulary[index % vocabulary.length],
      startSeconds,
      durationSeconds: trackDuration,
      easing: index % 2 ? ("ease-in-out" as const) : ("ease-out" as const),
    };
  });
}

function normalizeAnimations(raw: unknown, sceneId: string, durationSeconds: number, selectedStyle: AutoTubeStyleId) {
  const parsed = list(raw, 24)
    .map((entry, index) => {
      const item = objectValue(entry);
      const preset = animationPreset(item.preset);
      if (!preset) return null;
      const duration = numberBetween(
        item.durationSeconds ?? item.duration_seconds,
        0.1,
        durationSeconds,
        Math.min(1, durationSeconds),
      );
      const start = numberBetween(
        item.startSeconds ?? item.start_seconds,
        0,
        Math.max(0, durationSeconds - duration),
        0,
      );
      return {
        id: text(item.id, 120, `${sceneId}-motion-${index + 1}`),
        target: text(item.target, 60, "scene") as AutoTubeScene["animations"][number]["target"],
        preset,
        startSeconds: start,
        durationSeconds: duration,
        easing: text(item.easing, 40, "ease-in-out") as AutoTubeScene["animations"][number]["easing"],
        delaySeconds: numberBetween(item.delaySeconds ?? item.delay_seconds, 0, durationSeconds, 0),
        parameters: objectValue(item.parameters) as Record<string, string | number | boolean>,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  return parsed.length ? parsed : generatedAnimations(sceneId, durationSeconds, selectedStyle);
}

function normalizeEvidence(value: unknown) {
  return list(value, 60)
    .map((entry, index) => {
      const item = objectValue(entry);
      const sourceUrl = text(item.sourceUrl ?? item.source_url, 2_048);
      const observedFact = text(item.observedFact ?? item.observed_fact, 1_000);
      if (!sourceUrl || !observedFact) return null;
      return {
        id: text(item.id, 120, `evidence-${index + 1}`),
        sourceUrl,
        observedFact,
        capturedAt: text(item.capturedAt ?? item.captured_at, 80, new Date().toISOString()),
        confidence: ["high", "medium", "low"].includes(text(item.confidence, 20))
          ? (text(item.confidence, 20) as "high" | "medium" | "low")
          : ("medium" as const),
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
    riskProfile: (["standard", "regulated", "sensitive"].includes(risk) ? risk : "standard") as
      | "standard"
      | "regulated"
      | "sensitive",
    location: text(source.location, 180) || undefined,
    audience: text(source.audience, 300) || undefined,
    services: list(source.services, 30).map((item) => text(item, 180)).filter(Boolean),
    differentiators: list(source.differentiators, 30).map((item) => text(item, 240)).filter(Boolean),
    approvedTerms: list(source.approvedTerms ?? source.approved_terms, 30)
      .map((item) => text(item, 120))
      .filter(Boolean),
    prohibitedClaims: list(source.prohibitedClaims ?? source.prohibited_claims, 30)
      .map((item) => text(item, 180))
      .filter(Boolean),
  };
}

function normalizeClaims(value: unknown) {
  return list(value, 20)
    .map((entry) => {
      const item = objectValue(entry);
      const claimText = text(item.text, 500);
      if (!claimText) return null;
      const kindCandidate = text(item.kind, 30, "proposed");
      const kind = ["observed", "proposed", "measured", "creative"].includes(kindCandidate)
        ? (kindCandidate as "observed" | "proposed" | "measured" | "creative")
        : ("proposed" as const);
      return {
        text: claimText,
        kind,
        evidenceIds: list(item.evidenceIds ?? item.evidence_ids, 20)
          .map((id) => text(id, 120))
          .filter(Boolean),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

export function compileAutoTubeV4Request(input: unknown) {
  const source = objectValue(input);
  const legacy = normalizeAutoTubeRequest(input);
  const selectedStyle = styleId(source.styleId ?? source.style_id);
  const selectedIntent = intent(source.intent, selectedStyle);
  const style = getAutoTubeStyle(selectedStyle);
  const rawScenes = list(source.scenes, 24);
  const sceneCount = legacy.scenes.length;
  const requestedDuration = numberBetween(
    source.durationSeconds ?? source.duration_seconds,
    6,
    180,
    legacy.durationSeconds,
  );
  const durationPerScene = Number(Math.max(1.5, requestedDuration / Math.max(1, sceneCount)).toFixed(2));

  const scenes: AutoTubeScene[] = legacy.scenes.map((legacyScene, index) => {
    const raw = objectValue(rawScenes[index]);
    const rawVisual = objectValue(raw.visual);
    const id = text(raw.id, 120, `scene-${index + 1}`);
    const kind = sceneKind(raw.kind, defaultKind(index, sceneCount, style.sceneGrammar, selectedIntent));
    const mode = visualMode(rawVisual.mode, style.visualModes[index % style.visualModes.length]);
    const sceneDuration = numberBetween(
      raw.durationSeconds ?? raw.duration_seconds,
      1.5,
      30,
      durationPerScene,
    );
    return {
      id,
      kind,
      title: legacyScene.title,
      onScreenText: legacyScene.onScreenText,
      narration: legacyScene.narration,
      durationSeconds: sceneDuration,
      visual: {
        mode,
        uniqueKey: text(rawVisual.uniqueKey ?? rawVisual.unique_key, 160, `${selectedStyle}-${id}-${mode}`),
        assetUrl: text(rawVisual.assetUrl ?? rawVisual.asset_url, 2_048, legacyScene.imageUrl) || undefined,
        videoUrl: text(rawVisual.videoUrl ?? rawVisual.video_url, 2_048) || undefined,
        prompt: text(rawVisual.prompt, 2_000) || undefined,
        interactionSteps: list(rawVisual.interactionSteps ?? rawVisual.interaction_steps, 20)
          .map((step) => text(step, 240))
          .filter(Boolean),
        layout: text(rawVisual.layout, 160) || undefined,
      },
      animations: normalizeAnimations(raw.animations, id, sceneDuration, selectedStyle),
      transitionOut: (text(raw.transitionOut ?? raw.transition_out, 60) ||
        style.transitionLanguage[index % style.transitionLanguage.length]) as AutoTubeScene["transitionOut"],
      claims: normalizeClaims(raw.claims),
    };
  });

  const totalDuration = scenes.reduce((total, scene) => total + (scene.durationSeconds ?? 0), 0);
  const plan: AutoTubeVideoPlan = {
    standardVersion: AUTOTUBE_STANDARD_VERSION,
    title: legacy.videoTitle,
    intent: selectedIntent,
    styleId: selectedStyle,
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
      ? [
          {
            id: "master-narration",
            type: "narration",
            startSeconds: 0,
            durationSeconds: totalDuration,
            text: legacy.narrationScript,
            volume: 1,
          },
        ]
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
  const unsupported = Array.from(
    new Set(
      scenes
        .flatMap((scene) => scene.animations ?? [])
        .map((track) => track.preset)
        .filter((preset) => !SUPPORTED_RENDERER_PRESETS.has(preset)),
    ),
  );

  const production: AutoTubeV4ProductionPackage = {
    standardVersion: AUTOTUBE_STANDARD_VERSION,
    styleId: selectedStyle,
    intent: selectedIntent,
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
    "Create a style-directed, quality-gated AutoTube video. Legacy prospect payloads remain supported. Supplying style_id, intent, or advanced scene fields activates AutoTube 4 planning, animation, and publication gates.";
  tool.inputSchema.properties.style_id = {
    type: "string",
    enum: Object.keys(AUTOTUBE_STYLES),
    description: "AutoTube 4 production style. Activates the style engine and quality gate.",
  };
  tool.inputSchema.properties.intent = {
    type: "string",
    enum: Array.from(VIDEO_INTENTS),
  };
  tool.inputSchema.properties.captions = { type: "boolean", default: true };
  tool.inputSchema.properties.business = { type: "object", additionalProperties: true };
  tool.inputSchema.properties.evidence = {
    type: "array",
    maxItems: 60,
    items: { type: "object", additionalProperties: true },
  };
  const scene = tool.inputSchema.properties.scenes?.items;
  if (scene?.properties) {
    scene.properties.id = { type: "string", maxLength: 120 };
    scene.properties.kind = { type: "string", enum: Array.from(SCENE_KINDS) };
    scene.properties.duration_seconds = { type: "number", minimum: 1.5, maximum: 30 };
    scene.properties.visual = { type: "object", additionalProperties: true };
    scene.properties.animations = {
      type: "array",
      maxItems: 24,
      items: { type: "object", additionalProperties: true },
    };
    scene.properties.camera = {
      type: "array",
      maxItems: 12,
      items: { type: "object", additionalProperties: true },
    };
    scene.properties.character_actions = {
      type: "array",
      maxItems: 12,
      items: { type: "object", additionalProperties: true },
    };
    scene.properties.audio = {
      type: "array",
      maxItems: 12,
      items: { type: "object", additionalProperties: true },
    };
    scene.properties.transition_out = { type: "string" };
    scene.properties.claims = {
      type: "array",
      maxItems: 20,
      items: { type: "object", additionalProperties: true },
    };
  }
  return result;
}

function v4SuccessOutput(
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
    content: [
      {
        type: "text",
        text: `AutoTube 4 approved ${request.videoTitle} at ${compiled.qualityReport.score}/${compiled.qualityReport.threshold} and submitted render job ${job.jobId}. Completion is not verified until status is ready and the MP4 is playable.`,
      },
    ],
    _meta: {
      ui: { resourceUri: AUTOTUBE_WIDGET_URI },
      autotube: structuredContent,
      qualityReport: compiled.qualityReport,
      verificationRule:
        "Queued, processing, and rendering are incomplete. Only ready/completed plus a playable verified MP4 counts as complete.",
    },
  };
}

function v4FailureOutput(error: unknown) {
  const serviceError =
    error instanceof AutoTubeServiceError
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
        "Use autotube_render_video. Legacy requests remain compatible. Supply style_id or advanced scene fields for AutoTube 4 style planning, animation manifests, an 85-point publication threshold, and structured blockers. Never claim completion before the status is ready and the MP4 is playable.";
    }
    return result;
  }

  if (method === "tools/list") {
    return extendToolDefinition(await handleLegacyAutoTubeRpc(body, origin));
  }

  if (method !== "tools/call") return handleLegacyAutoTubeRpc(body, origin);

  const name = String(body?.params?.name || "");
  if (name !== AUTOTUBE_TOOL_NAME) return handleLegacyAutoTubeRpc(body, origin);
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
    return { jsonrpc: "2.0", id, result: v4SuccessOutput(compiled.legacy, compiled, job) };
  } catch (error) {
    return { jsonrpc: "2.0", id, result: v4FailureOutput(error) };
  }
}
