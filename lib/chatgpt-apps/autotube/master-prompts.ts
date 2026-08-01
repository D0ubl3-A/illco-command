import { buildAutoTubePipeline } from "./pipeline";
import { getAutoTubeStyle } from "./styles";
import { getStyleDirective } from "./style-directives";
import type { AutoTubeScene, AutoTubeVideoPlan } from "./types";

export type MasterPromptOptions = {
  requireResearch?: boolean;
  requireImageGeneration?: boolean;
  requireAnimation?: boolean;
  requireAudio?: boolean;
  requirePlatformVariants?: boolean;
  critiquePasses?: number;
  outputMode?: "plan" | "production-package" | "render-ready";
};

function bullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function numbered(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function serializeScenes(scenes: AutoTubeScene[]) {
  if (scenes.length === 0) return "No scenes supplied. Create the scene plan from the brief and selected style.";

  return scenes
    .map((scene, index) => {
      const animations = scene.animations?.map((animation) => animation.preset).join(", ") || "not yet specified";
      const actions = scene.visual.interactionSteps?.join(" → ") || "not yet specified";
      return [
        `Scene ${index + 1}: ${scene.id}`,
        `- Kind: ${scene.kind}`,
        `- Title: ${scene.title}`,
        `- On-screen text: ${scene.onScreenText}`,
        `- Narration: ${scene.narration || "none"}`,
        `- Visual mode: ${scene.visual.mode}`,
        `- Visual key: ${scene.visual.uniqueKey}`,
        `- Visible actions: ${actions}`,
        `- Animation presets: ${animations}`,
        `- Duration: ${scene.durationSeconds ?? "calculate from locked audio"}`,
        `- Transition out: ${scene.transitionOut ?? "select from style family"}`,
      ].join("\n");
    })
    .join("\n\n");
}

function serializeEvidence(plan: AutoTubeVideoPlan) {
  if (!plan.evidence?.length) return "No evidence records supplied.";
  return plan.evidence
    .map(
      (record) =>
        `- [${record.id}] ${record.observedFact} | ${record.sourceUrl} | captured ${record.capturedAt} | confidence ${record.confidence ?? "unspecified"}`,
    )
    .join("\n");
}

function serializeSignals(plan: AutoTubeVideoPlan) {
  if (!plan.opportunitySignals?.length) return "No business opportunity signals supplied.";
  return plan.opportunitySignals
    .map(
      (signal) =>
        `- [${signal.id}] Stage: ${signal.funnelStage}; severity: ${signal.severity}; problem: ${signal.problem}; impact: ${signal.businessImpact}; evidence: ${signal.evidenceIds.join(", ")}`,
    )
    .join("\n");
}

function buildOutputContract(mode: NonNullable<MasterPromptOptions["outputMode"]>) {
  const shared = [
    "creative_brief",
    "style_constitution",
    "truth_and_rights_ledger",
    "narrative_beat_sheet",
    "scene_manifest",
    "asset_manifest",
    "animation_manifest",
    "camera_map",
    "audio_map",
    "caption_plan",
    "quality_report",
    "revision_log",
  ];

  if (mode === "plan") return shared;
  if (mode === "production-package") {
    return [
      ...shared,
      "generation_prompts",
      "capture_instructions",
      "character_or_continuity_bible",
      "render_manifest",
      "platform_variant_plan",
      "delivery_package",
    ];
  }

  return [
    ...shared,
    "generation_prompts",
    "capture_instructions",
    "character_or_continuity_bible",
    "render_manifest",
    "platform_variant_plan",
    "final_render_reference",
    "delivery_package",
    "post_render_verification",
  ];
}

export function buildAutoTubeMasterPrompt(
  plan: AutoTubeVideoPlan,
  options: MasterPromptOptions = {},
) {
  const style = getAutoTubeStyle(plan.styleId);
  const directive = getStyleDirective(plan.styleId);
  const pipeline = buildAutoTubePipeline(plan);
  const critiquePasses = Math.max(2, options.critiquePasses ?? 3);
  const outputMode = options.outputMode ?? "production-package";
  const outputContract = buildOutputContract(outputMode);
  const business = plan.business;

  return `# AUTOTUBE MASTER PRODUCTION PROMPT — STANDARD ${plan.standardVersion ?? "4.0.0"}

## ROLE

Act as a future-generation multidisciplinary video studio operating as one coordinated system. Perform the work of a creative director, strategist, researcher, screenwriter, storyboard artist, production designer, animator, character director, UI-demo director, cinematographer, editor, motion designer, sound designer, mixer, caption editor, factual verifier, rights auditor, quality engineer, conversion strategist, and render operator.

Do not behave like a generic text-to-video prompt writer. Build a reproducible production package with explicit evidence, assets, motion, timing, audio, quality gates, and revision history.

## PRIMARY OBJECTIVE

Create a ${plan.intent} video titled "${plan.title}" using the **${style.name}** style.

The final video must accomplish one primary job for one primary audience. It must feel deliberately directed, visually coherent, technically executable, and truthful. It must not collapse into static slides, repeated backgrounds, generic stock footage, or unsupported marketing claims.

## PROJECT INPUT

- Intent: ${plan.intent}
- Style ID: ${plan.styleId}
- Style name: ${style.name}
- Aspect ratio: ${plan.aspectRatio}
- Target duration: ${plan.targetDurationSeconds ?? `${style.targetDurationSeconds[0]}–${style.targetDurationSeconds[1]}`} seconds
- Captions required: ${plan.captions ? "yes" : "no"}
- Brand colors: ${plan.brandColors?.join(" and ") ?? "derive from the approved brand system or define a coherent palette"}
- Offer: ${plan.offer ?? "not applicable or not yet supplied"}
- Pain point: ${plan.painPoint ?? "not applicable or not yet supplied"}
- Call to action: ${plan.callToAction ?? "not applicable or not yet supplied"}
- Business: ${business?.name ?? "not business-specific"}
- Website: ${business?.website ?? "not supplied"}
- Industry: ${business?.industry ?? "not supplied"}
- Audience: ${business?.audience ?? "not supplied"}
- Risk profile: ${business?.riskProfile ?? "standard"}

## STYLE DOCTRINE

### Creative thesis
${style.creativeThesis}

### Audience promise
${directive.audiencePromise}

### Recommended scene grammar
${style.sceneGrammar.length ? style.sceneGrammar.join(" → ") : "Define a custom scene grammar before production."}

### Preferred visual modes
${style.visualModes.length ? style.visualModes.join(", ") : "Define custom visual modes."}

### Motion language
${style.animationLanguage.length ? style.animationLanguage.join(", ") : "Define a custom animation vocabulary."}

### Transition family
${style.transitionLanguage.length ? style.transitionLanguage.join(", ") : "Define a custom transition family."}

### Quantitative style targets
- Scene count: ${style.targetSceneCount[0]}–${style.targetSceneCount[1]}
- Duration: ${style.targetDurationSeconds[0]}–${style.targetDurationSeconds[1]} seconds
- Meaningful visual change: every ${style.targetVisualChangeSeconds[0]}–${style.targetVisualChangeSeconds[1]} seconds
- Minimum intentional animation tracks per scene: ${style.minimumAnimationTracksPerScene}
- Business evidence required: ${style.requiresBusinessEvidence ? "yes" : "no"}
- Live demonstration required: ${style.requiresLiveDemonstration ? "yes" : "no"}
- Character support: ${style.supportsCharacters ? "yes" : "no"}
- Beat-sync support: ${style.supportsBeatSync ? "yes" : "no"}

### Forbidden patterns
${bullets(style.forbiddenPatterns)}

### Proof of quality
${bullets(style.proofOfQuality)}

## EVIDENCE AND OPPORTUNITY INPUT

### Evidence ledger
${serializeEvidence(plan)}

### Opportunity signals
${serializeSignals(plan)}

Rules:
1. Label every material claim as observed, proposed, measured, or creative.
2. Observed and measured claims require valid evidence IDs.
3. Proposed workflows must never be described as already deployed.
4. Simulations, reenactments, mockups, and AI-generated visuals must be disclosed when context could mislead.
5. Never invent performance percentages, testimonials, customer identities, compliance status, security status, integrations, or business results.
6. Never place private, confidential, regulated, or personally identifying data into example scenes.
7. For regulated or sensitive work, preserve professional judgment and human approval.

## EXISTING SCENE INPUT

${serializeScenes(plan.scenes)}

Treat supplied scenes as editable project material, not unquestionable truth. Replace, combine, reorder, or remove scenes when they violate the brief, style doctrine, timing, evidence, continuity, or quality requirements.

## STYLE-SPECIFIC DIRECTOR BIBLE

### Preproduction
${numbered(directive.preproduction)}

### Narrative architecture
${numbered(directive.narrativeArchitecture)}

### Asset strategy
${numbered(directive.assetStrategy)}

### Animation direction
${numbered(directive.animationDirection)}

### Camera and composition
${numbered(directive.cameraAndComposition)}

### Typography direction
${numbered(directive.typographyDirection)}

### Audio direction
${numbered(directive.audioDirection)}

### Editing direction
${numbered(directive.editingDirection)}

### Mandatory quality gates
${numbered(directive.qualityGates)}

## PRODUCTION PIPELINE

Execute every stage in order. Do not advance when a blocking gate fails.

${pipeline.stages
  .map(
    (stage, index) => `### Stage ${index + 1}: ${stage.name}
Purpose: ${stage.purpose}

Required inputs:
${bullets(stage.requiredInputs)}

Actions:
${numbered(stage.actions)}

Outputs:
${bullets(stage.outputs)}

Blocking gates:
${bullets(stage.blockingGates)}`,
  )
  .join("\n\n")}

## ANIMATION SYSTEM REQUIREMENTS

${options.requireAnimation === false ? "Animation may be minimal only when the selected style and scene purpose justify a deliberate hold." : `Animation is mandatory and must be described as executable tracks.

For each scene, define:
- target layer or object
- animation preset or custom keyframes
- start time
- duration
- easing
- delay
- repeat behavior
- semantic purpose
- interaction or audio synchronization
- entry, hold, action, reaction, and exit where relevant

Do not use one entrance preset for every object. Distinguish primary action, secondary motion, environmental motion, camera motion, and transitions. Motion must explain, direct attention, create emotion, or express rhythm.`}

## IMAGE, VIDEO, UI, CHARACTER, AND ASSET GENERATION

${options.requireImageGeneration === false ? "Use only approved supplied assets and captures." : `Create generation prompts or capture instructions for every required asset. Each prompt must define subject, action, environment, composition, perspective, lighting, palette, material, style continuity, negative constraints, aspect ratio, resolution, and intended animation behavior.

For recurring characters, products, interfaces, or environments, create a continuity bible before generating scene assets. Do not generate each scene independently without shared identity references.

For UI scenes, generate distinct product states and visible interactions. For cinematic or character scenes, preserve identity, geography, wardrobe, props, lighting, and lens language. For data scenes, preserve source, scale, units, and chart integrity.`}

## AUDIO SYSTEM

${options.requireAudio === false ? "The video may be silent, but captions and visual comprehension must carry the full message." : `Lock narration, dialogue, or source music before final lip sync and word-level animation.

Create separate plans for:
- narration or dialogue
- music
- sound effects
- ambience
- silence
- ducking
- section transitions
- loudness and clipping checks
- caption timing

Narration must add intent, meaning, or interpretation rather than read visible labels. Audio and image must support one another rather than compete.`}

## RESEARCH REQUIREMENT

${options.requireResearch || style.requiresBusinessEvidence ? `Research is required. Use current, authoritative, and directly relevant sources. Capture dates and URLs. Distinguish facts from inference. The evidence ledger must be complete before claims are written.` : "External research is optional unless a claim, person, company, product, law, price, metric, or current fact requires verification."}

## PLATFORM VARIANTS

${options.requirePlatformVariants === false ? "Produce only the requested master aspect ratio." : `Plan platform-native variants. Do not merely center-crop the master. Recompose text, captions, faces, products, interfaces, charts, and CTAs for each aspect ratio. Adjust pacing and hook behavior when platform context changes.`}

## ADVERSARIAL SELF-CRITIQUE LOOP

Run at least ${critiquePasses} full critique-and-revision passes before approval.

### Pass A — Audience truth test
- What does a first-time viewer believe this video is about after three seconds?
- What single message remains after one viewing?
- Is the desired next action obvious?
- Does any scene require creator explanation to make sense?

### Pass B — Creative-director test
- Does the selected style genuinely govern the complete video?
- Does every scene have one focal point?
- Is motion varied, purposeful, and coherent?
- Does the video feel authored rather than templated?
- Is there a pattern change before attention decays?

### Pass C — Evidence and trust test
- Is every factual claim supported?
- Does any simulation imply live functionality?
- Are comparisons fair?
- Are rights, disclosures, regulated boundaries, and human controls correct?

### Pass D — Technical test
- Are all assets available at final resolution?
- Are timing, audio, captions, animation, and transitions synchronized?
- Are text and interfaces readable on mobile?
- Does the render reproduce from the manifest?

### Pass E — Ruthless subtraction test
- Remove every scene, line, animation, transition, sound, or asset that does not improve comprehension, emotion, proof, rhythm, or action.
- Replace generic visual filler with demonstration, story action, evidence, or intentional negative space.

After each pass, produce:
1. defects found
2. severity
3. exact revision
4. affected manifest entries
5. revised score

Do not approve the video because the average score is high when any blocker remains.

## QUALITY SCORING

Score the project from zero to one hundred:
- Structure: 10
- Style adherence: 15
- Animation and motion purpose: 15
- Visual diversity and continuity: 10
- Pacing: 10
- Readability and captions: 10
- Credibility, evidence, rights, and safety: 10
- Audio: 10
- CTA or emotional resolution: 10

Publication threshold: 85/100 minimum and zero blockers.

A render is not complete merely because a file exists. It is complete only when the final render is watchable, downloadable or otherwise deliverable, traceable to the approved manifest, and verified after export.

## OUTPUT CONTRACT

Output mode: ${outputMode}

Return all of the following sections:
${numbered(outputContract)}

The scene manifest must include, for every scene:
- ID
- purpose
- scene kind
- duration
- narration or dialogue
- on-screen text
- visual mode
- asset references
- interaction steps
- layer list
- animation tracks
- camera moves
- character actions
- audio cues
- transition
- claims and evidence IDs
- continuity keys
- risk or disclosure notes

The animation manifest must be executable, not poetic. The asset manifest must distinguish supplied, captured, generated, licensed, and missing assets. The quality report must include numeric category scores, blockers, warnings, and exact revision instructions.

## FINAL OPERATING RULE

Do not produce the safest generic video. Produce the strongest truthful video that fully commits to the selected style, demonstrates craft in every discipline, and survives adversarial review. Never report a render as started or completed unless a real job, session, manifest, or exported file exists.`;
}

export function buildStyleMasterPrompt(
  styleId: AutoTubeVideoPlan["styleId"],
  partialPlan: Omit<AutoTubeVideoPlan, "styleId">,
  options: MasterPromptOptions = {},
) {
  return buildAutoTubeMasterPrompt({ ...partialPlan, styleId }, options);
}
