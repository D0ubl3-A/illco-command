import { getAutoTubeStyle } from "./styles";
import { getStyleDirective } from "./style-directives";
import type { AutoTubeVideoPlan } from "./types";

export type PipelineStageId =
  | "brief"
  | "truth-and-rights"
  | "style-constitution"
  | "story-architecture"
  | "asset-production"
  | "animation-choreography"
  | "audio-production"
  | "assembly"
  | "automated-quality"
  | "human-review"
  | "platform-variants"
  | "delivery-and-learning";

export type PipelineStage = {
  id: PipelineStageId;
  name: string;
  purpose: string;
  requiredInputs: string[];
  actions: string[];
  outputs: string[];
  blockingGates: string[];
};

export type AutoTubePipeline = {
  standardVersion: string;
  styleId: AutoTubeVideoPlan["styleId"];
  styleName: string;
  stages: PipelineStage[];
  publishScore: number;
  renderPolicy: string;
};

const commonStages: PipelineStage[] = [
  {
    id: "brief",
    name: "Lock the brief",
    purpose: "Turn the request into one testable communication objective before creative production begins.",
    requiredInputs: ["audience", "intent", "platform", "aspect ratio", "target duration", "desired action"],
    actions: [
      "Define one primary audience and one primary outcome.",
      "Separate must-have information from optional ideas.",
      "Record constraints, approvals, deadlines, brand requirements, and prohibited content.",
      "Choose a style only after comparing the request against style best-use cases.",
    ],
    outputs: ["approved creative brief", "style selection rationale", "success criteria"],
    blockingGates: [
      "The video has one primary job.",
      "The target viewer and next action are explicit.",
      "Duration and aspect ratio are defined.",
    ],
  },
  {
    id: "truth-and-rights",
    name: "Verify truth, evidence, and rights",
    purpose: "Prevent fabricated claims, misleading proof, unlicensed assets, and unsafe use of sensitive information.",
    requiredInputs: ["claims", "sources", "asset origins", "music and voice rights", "business risk profile when relevant"],
    actions: [
      "Classify every material claim as observed, proposed, measured, or creative.",
      "Attach evidence IDs to observed and measured claims.",
      "Verify asset, music, voice, logo, character, testimonial, and likeness permissions.",
      "Remove personal, confidential, regulated, or sensitive example data.",
      "Define required disclosures for simulations, concepts, reenactments, and AI-generated assets.",
    ],
    outputs: ["evidence ledger", "rights ledger", "disclosure plan", "approved claim set"],
    blockingGates: [
      "No unsupported observed or measured claim remains.",
      "No asset with unknown or prohibited rights remains.",
      "Sensitive and regulated information is excluded or properly controlled.",
    ],
  },
  {
    id: "style-constitution",
    name: "Lock the style constitution",
    purpose: "Convert the selected preset into explicit production rules for this specific video.",
    requiredInputs: ["style preset", "style overrides", "brand rules", "reference material"],
    actions: [
      "Define the visual world, composition grammar, motion vocabulary, typography system, audio palette, transition family, and pacing range.",
      "List continuity rules and prohibited shortcuts.",
      "Define how the style adapts across required aspect ratios.",
      "Choose objective quality gates before asset generation.",
    ],
    outputs: ["project style constitution", "continuity rules", "platform adaptation rules"],
    blockingGates: [
      "The style can be described as rules rather than adjectives.",
      "Forbidden patterns are explicit.",
      "The chosen style is appropriate for the audience and intent.",
    ],
  },
  {
    id: "story-architecture",
    name: "Build the narrative architecture",
    purpose: "Make every scene advance understanding, emotion, evidence, or action.",
    requiredInputs: ["approved brief", "style constitution", "claim set", "target duration"],
    actions: [
      "Write the hook, progression, midpoint change, resolution, and CTA or final emotional state.",
      "Assign one purpose to every scene.",
      "Estimate timing from final narration or dialogue.",
      "Remove repeated points and ornamental scenes.",
      "Create a visual-first storyboard before final asset production.",
    ],
    outputs: ["beat sheet", "storyboard", "scene manifest", "locked script draft"],
    blockingGates: [
      "The opening works in the first three seconds or style-specific hook window.",
      "Every scene changes the viewer's state.",
      "The ending resolves the opening promise.",
    ],
  },
  {
    id: "asset-production",
    name: "Produce and validate assets",
    purpose: "Create coherent, rights-safe, high-resolution assets with continuity and fallback behavior.",
    requiredInputs: ["storyboard", "style constitution", "asset list", "rights ledger"],
    actions: [
      "Create an asset manifest with source, ownership, resolution, aspect ratio, continuity key, and scene use.",
      "Generate or capture all required visual states.",
      "Normalize color, lighting, texture, scale, perspective, and edge treatment.",
      "Create character, environment, product, UI, chart, or collage continuity sheets when relevant.",
      "Reject low-resolution, inconsistent, duplicated, or visually generic assets.",
    ],
    outputs: ["approved asset manifest", "continuity references", "scene-ready assets", "fallback assets"],
    blockingGates: [
      "Every scene has a unique or intentionally reused visual plan.",
      "All assets meet final render resolution requirements.",
      "Continuity-critical identities are stable.",
    ],
  },
  {
    id: "animation-choreography",
    name: "Choreograph motion and camera",
    purpose: "Use motion to communicate meaning, action, causality, emotion, rhythm, or attention.",
    requiredInputs: ["scene manifest", "style animation language", "final or provisional audio timing"],
    actions: [
      "Create animation tracks with targets, start times, durations, easing, parameters, and keyframes.",
      "Define camera moves and focal targets.",
      "Define character actions, cursor actions, chart reveals, type behavior, and secondary motion as relevant.",
      "Limit simultaneous focal motion.",
      "Add processing holds where the viewer needs time to understand a result.",
    ],
    outputs: ["animation manifest", "camera map", "character or cursor choreography", "transition map"],
    blockingGates: [
      "Motion has a semantic or rhythmic purpose.",
      "Animation density meets the style minimum without damaging readability.",
      "No important action occurs outside safe framing.",
    ],
  },
  {
    id: "audio-production",
    name: "Produce narration, dialogue, music, and sound",
    purpose: "Create a unified audio experience that controls timing, comprehension, emotion, and polish.",
    requiredInputs: ["locked script", "audio rights", "style audio direction", "scene timing"],
    actions: [
      "Lock narration or dialogue before lip sync or final word-level animation.",
      "Create music and sound maps aligned to narrative or song structure.",
      "Mix narration, dialogue, music, ambience, and SFX with intentional ducking.",
      "Normalize loudness and prevent clipping.",
      "Generate synchronized captions from the final spoken track.",
    ],
    outputs: ["final voice track", "music track", "SFX and ambience stems", "mix", "caption file", "audio cue map"],
    blockingGates: [
      "Speech is intelligible on phone speakers.",
      "Captions match final audio.",
      "Music and voices have documented rights or approved sources.",
      "Lip sync and word-level motion use final timing.",
    ],
  },
  {
    id: "assembly",
    name: "Assemble the deterministic timeline",
    purpose: "Combine approved assets, animation, camera, audio, captions, and transitions into a reproducible render.",
    requiredInputs: ["approved manifests", "final audio", "caption file", "render settings"],
    actions: [
      "Resolve all scene durations against audio and target duration.",
      "Compose layers in deterministic z-order.",
      "Apply transitions only from the approved style family.",
      "Render a low-resolution review draft before final export.",
      "Preserve project, manifest, and asset version identifiers in render metadata.",
    ],
    outputs: ["review render", "render manifest", "timing report", "error report"],
    blockingGates: [
      "No missing, broken, or silently substituted asset remains.",
      "Audio, captions, and animation remain synchronized.",
      "The render is reproducible from the manifest.",
    ],
  },
  {
    id: "automated-quality",
    name: "Run automated quality gates",
    purpose: "Reject technically valid but creatively weak, misleading, unreadable, or style-inconsistent videos.",
    requiredInputs: ["review render", "project manifests", "style preset", "quality rubric"],
    actions: [
      "Score structure, style adherence, animation, visual diversity, pacing, readability, credibility, audio, and CTA or resolution.",
      "Check text density, scene duration, visual repetition, claim support, captions, animation density, and asset availability.",
      "Block publication for any blocker regardless of aggregate score.",
      "Require a minimum score of eighty-five unless the project defines a stricter threshold.",
    ],
    outputs: ["machine quality report", "blocker list", "revision instructions"],
    blockingGates: [
      "Score meets threshold.",
      "No blocker remains.",
      "The selected style's proof-of-quality requirements pass.",
    ],
  },
  {
    id: "human-review",
    name: "Review as the audience and craft lead",
    purpose: "Catch credibility, emotional, comprehension, continuity, taste, and platform problems automation misses.",
    requiredInputs: ["review render", "machine quality report", "brief", "style constitution"],
    actions: [
      "Watch once without pausing and record the remembered message.",
      "Watch muted for visual comprehension and captions.",
      "Listen without video for audio clarity and narrative flow.",
      "Review at mobile display size.",
      "Inspect continuity, claims, timing, and final action frame by frame.",
      "Revise until the remembered message matches the brief.",
    ],
    outputs: ["human review notes", "approved revision list", "final approval"],
    blockingGates: [
      "The intended audience understands the message without explanation.",
      "The video feels authored rather than templated.",
      "No known misleading or embarrassing element remains.",
    ],
  },
  {
    id: "platform-variants",
    name: "Create platform-native variants",
    purpose: "Adapt composition and pacing rather than merely cropping the master render.",
    requiredInputs: ["approved master", "platform requirements", "safe-area rules"],
    actions: [
      "Recompose titles, captions, focal assets, and CTAs per aspect ratio.",
      "Adjust hook duration and scene pacing for platform context.",
      "Create thumbnails, first-frame variants, poster frames, and captions.",
      "Verify mobile readability and codec compatibility.",
    ],
    outputs: ["platform renders", "thumbnail set", "caption variants", "delivery manifest"],
    blockingGates: [
      "No variant relies on blind center cropping.",
      "The first frame works in its target placement.",
      "Text and faces remain inside platform-safe areas.",
    ],
  },
  {
    id: "delivery-and-learning",
    name: "Deliver, measure, and improve",
    purpose: "Package the final asset correctly and turn performance or review data into better future production rules.",
    requiredInputs: ["approved variants", "delivery channel", "measurement plan"],
    actions: [
      "Package the correct render, thumbnail, message, title, captions, sources, and disclosures.",
      "Record delivery date, recipient or channel, version, and CTA.",
      "Track available opens, views, retention, replies, conversions, or qualitative feedback.",
      "Separate creative, audience, offer, channel, and timing explanations before revising the standard.",
      "Add proven lessons to style-specific test cases rather than relying on memory.",
    ],
    outputs: ["delivery package", "performance record", "postmortem", "new regression tests"],
    blockingGates: [
      "The delivered file is the approved version.",
      "Measurement is privacy-respecting and appropriate.",
      "Learning is recorded as evidence, not intuition alone.",
    ],
  },
];

export function buildAutoTubePipeline(plan: AutoTubeVideoPlan): AutoTubePipeline {
  const style = getAutoTubeStyle(plan.styleId);
  const directive = getStyleDirective(plan.styleId);

  const stages = commonStages.map((stage) => {
    if (stage.id === "truth-and-rights") {
      return {
        ...stage,
        actions: [
          ...stage.actions,
          ...(style.requiresBusinessEvidence
            ? ["Treat the dated business evidence ledger as mandatory, not optional."]
            : []),
        ],
        blockingGates: [
          ...stage.blockingGates,
          ...(style.requiresBusinessEvidence
            ? ["Style-required evidence is complete and traceable."]
            : []),
        ],
      };
    }

    if (stage.id === "style-constitution") {
      return {
        ...stage,
        actions: [
          ...stage.actions,
          ...directive.preproduction,
        ],
        outputs: [...stage.outputs, `${style.name} director bible`],
      };
    }

    if (stage.id === "story-architecture") {
      return {
        ...stage,
        actions: [...stage.actions, ...directive.narrativeArchitecture],
      };
    }

    if (stage.id === "asset-production") {
      return {
        ...stage,
        actions: [...stage.actions, ...directive.assetStrategy],
      };
    }

    if (stage.id === "animation-choreography") {
      return {
        ...stage,
        actions: [
          ...stage.actions,
          ...directive.animationDirection,
          ...directive.cameraAndComposition,
        ],
        blockingGates: [
          ...stage.blockingGates,
          `Average at least ${style.minimumAnimationTracksPerScene} intentional animation tracks per scene unless a deliberate hold is documented.`,
        ],
      };
    }

    if (stage.id === "audio-production") {
      return {
        ...stage,
        actions: [...stage.actions, ...directive.audioDirection],
      };
    }

    if (stage.id === "assembly") {
      return {
        ...stage,
        actions: [
          ...stage.actions,
          ...directive.editingDirection,
          ...directive.typographyDirection,
        ],
      };
    }

    if (stage.id === "automated-quality") {
      return {
        ...stage,
        blockingGates: [...stage.blockingGates, ...directive.qualityGates],
        outputs: [...stage.outputs, ...directive.requiredDeliverables],
      };
    }

    return stage;
  });

  return {
    standardVersion: plan.standardVersion ?? "4.0.0",
    styleId: plan.styleId,
    styleName: style.name,
    stages,
    publishScore: 85,
    renderPolicy:
      "Never render merely because required fields exist. Render only after the project passes truth, rights, style, asset, timing, audio, and quality gates.",
  };
}
