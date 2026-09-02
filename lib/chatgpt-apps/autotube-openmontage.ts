export const AUTOTUBE_OPENMONTAGE_TOOL_NAME = "autotube_openmontage_reference";

const OPENMONTAGE_REPOSITORY = "https://github.com/calesthio/OpenMontage";

function cleanText(value: unknown, max: number, fallback = "") {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, max);
}

function safeHttpUrl(value: unknown) {
  const candidate = cleanText(value, 2048);
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function safeDate(value: unknown) {
  const candidate = cleanText(value, 32);
  if (!candidate) return "";
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? candidate : parsed.toISOString().slice(0, 10);
}

export function openMontageToolDefinition() {
  return {
    name: AUTOTUBE_OPENMONTAGE_TOOL_NAME,
    title: "Build OpenMontage reference-video brief",
    description:
      "Create an OpenMontage-compatible reference-video production brief for AutoTube. It extracts the creative decisions AutoTube should preserve from a reference video—hook style, pacing, scene rhythm, visual grammar, transitions, audio behavior, and edit density—while requiring an original topic, script, footage plan, and visual treatment. This is a safe handoff/adapter layer; it does not pretend the local OpenMontage agent runtime is executing inside the serverless MCP process.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        reference_video_url: {
          type: "string",
          format: "uri",
          description: "YouTube, Short, Reel, TikTok, or other reference-video URL.",
        },
        reference_video_date: {
          type: "string",
          maxLength: 32,
          description: "Known publication date for the reference, when supplied by the user.",
        },
        target_topic: {
          type: "string",
          maxLength: 500,
          description: "The new, original topic or story AutoTube should create.",
        },
        target_duration_seconds: {
          type: "number",
          minimum: 6,
          maximum: 600,
          default: 60,
        },
        target_aspect_ratio: {
          type: "string",
          enum: ["landscape", "vertical", "square"],
          default: "landscape",
        },
        creative_goal: {
          type: "string",
          maxLength: 700,
          description: "Desired audience effect, tone, or production goal.",
        },
        footage_strategy: {
          type: "string",
          enum: ["auto", "real-footage", "generated-motion", "mixed-media", "motion-graphics"],
          default: "auto",
        },
      },
      required: ["reference_video_url"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  };
}

export function buildOpenMontageReferenceBrief(input: unknown) {
  const source = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
  const referenceVideoUrl = safeHttpUrl(source.reference_video_url);
  if (!referenceVideoUrl) {
    throw new Error("A valid HTTP(S) reference_video_url is required.");
  }
  const referenceVideoDate = safeDate(source.reference_video_date);
  const targetTopic = cleanText(source.target_topic, 500, "Create an original video using the reference only for creative structure and pacing.");
  const targetDurationSeconds = Math.min(600, Math.max(6, Number(source.target_duration_seconds) || 60));
  const targetAspectRatio = ["landscape", "vertical", "square"].includes(String(source.target_aspect_ratio))
    ? String(source.target_aspect_ratio)
    : "landscape";
  const creativeGoal = cleanText(
    source.creative_goal,
    700,
    "Maximize retention and clarity while preserving a distinct, original identity.",
  );
  const footageStrategy = ["auto", "real-footage", "generated-motion", "mixed-media", "motion-graphics"].includes(String(source.footage_strategy))
    ? String(source.footage_strategy)
    : "auto";

  const analysisChecklist = [
    "Download or otherwise lawfully access the reference before visual analysis; do not infer unseen frames.",
    "Analyze transcript and hook construction.",
    "Measure pacing, average shot length, scene rhythm, escalation, and CTA timing.",
    "Sample keyframes to identify composition, typography, motion language, color behavior, and transition grammar.",
    "Separate reusable abstract traits from protected expression: keep pacing/structure/tone, not copied wording, shots, characters, graphics, or music.",
    "Produce 2–3 differentiated concepts before choosing a production path.",
    "Choose the cheapest tool path that can genuinely reproduce the target motion quality; do not fake motion with still-image slideshows when the reference depends on real movement.",
    "Create an original scene plan, script, asset list, narration direction, and audio plan.",
    "Run a short sample or proof scene before committing to a full expensive render.",
    "Verify final duration, audio, captions, frame sampling, and playable delivery before claiming completion.",
  ];

  const brief = {
    integration: "OpenMontage-compatible reference workflow",
    integrationKind: "reference-video-handoff",
    openMontageRepository: OPENMONTAGE_REPOSITORY,
    reference: {
      url: referenceVideoUrl,
      suppliedDate: referenceVideoDate || null,
    },
    target: {
      topic: targetTopic,
      durationSeconds: targetDurationSeconds,
      aspectRatio: targetAspectRatio,
      creativeGoal,
      footageStrategy,
    },
    preserveFromReference: [
      "hook mechanics",
      "pacing envelope",
      "scene-length distribution",
      "information density",
      "transition energy",
      "camera/motion intensity",
      "audio-to-cut relationship",
      "CTA placement",
    ],
    mustRemainOriginal: [
      "script wording",
      "story claims and examples",
      "shot selection",
      "graphics and illustrations",
      "characters and logos",
      "music and sound recording",
      "thumbnail artwork",
      "final scene order when copying would make the new work substantially similar",
    ],
    analysisChecklist,
    acceptanceCriteria: {
      referenceActuallyAnalyzed: true,
      conceptsBeforeFullProduction: 2,
      originalScriptRequired: true,
      originalVisualPlanRequired: true,
      proofSceneBeforeExpensiveRender: true,
      finalMediaValidationRequired: true,
    },
  };

  const prompt = [
    "Use the OpenMontage reference-video workflow as a production-analysis layer for AutoTube.",
    `Reference: ${referenceVideoUrl}`,
    referenceVideoDate ? `Reference date supplied by user: ${referenceVideoDate}` : "Reference date: not supplied.",
    `New target topic: ${targetTopic}`,
    `Target duration: ${targetDurationSeconds}s; aspect ratio: ${targetAspectRatio}; footage strategy: ${footageStrategy}.`,
    `Creative goal: ${creativeGoal}`,
    "Analyze transcript, pacing, scenes, keyframes, transitions, motion, edit density, and audio behavior before planning the new piece.",
    "Keep abstract production traits only. Do not copy the reference's wording, protected imagery, characters, music, graphics, or distinctive sequence of expression.",
    "Return 2–3 differentiated concepts, tool-path and cost assumptions, then a render-ready original scene plan. Test one short sample before a costly full render.",
  ].join("\n");

  return { brief, prompt };
}

export function openMontageToolOutput(input: unknown) {
  try {
    const result = buildOpenMontageReferenceBrief(input);
    return {
      structuredContent: result.brief,
      content: [{
        type: "text",
        text: `OpenMontage reference brief prepared for ${result.brief.reference.url}. Use the returned prompt as the preproduction layer before AutoTube rendering.`,
      }],
      _meta: {
        autotubeOpenMontage: result.brief,
        openMontagePrompt: result.prompt,
        sourceProject: OPENMONTAGE_REPOSITORY,
        executionMode: "adapter-handoff",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenMontage reference brief could not be created.";
    return {
      isError: true,
      content: [{ type: "text", text: message }],
      _meta: { executionMode: "adapter-handoff" },
    };
  }
}
