import { getAutoTubeStyle } from "./styles";
import type {
  AutoTubeQualityReport,
  AutoTubeScene,
  AutoTubeVideoPlan,
  QualityCategory,
  QualityIssue,
  VisualMode,
} from "./types";

export const AUTOTUBE_PUBLISH_THRESHOLD = 85;

const DEMONSTRATION_MODES = new Set<VisualMode>([
  "website-capture",
  "live-ui",
  "dashboard",
  "message-thread",
  "calendar",
  "document-view",
  "product-view",
]);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function words(value?: string) {
  return value?.trim().split(/\s+/).filter(Boolean).length ?? 0;
}

function durationOf(scene: AutoTubeScene) {
  return scene.durationSeconds ?? 0;
}

function includesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function scoreStructure(plan: AutoTubeVideoPlan, issues: QualityIssue[]) {
  const style = getAutoTubeStyle(plan.styleId);
  let score = 10;

  if (plan.scenes.length === 0) {
    issues.push({ code: "NO_SCENES", severity: "blocker", message: "The video contains no scenes." });
    return 0;
  }

  if (plan.scenes.length < style.targetSceneCount[0] || plan.scenes.length > style.targetSceneCount[1]) {
    score -= 2;
    issues.push({
      code: "SCENE_COUNT_OUTSIDE_STYLE_RANGE",
      severity: "warning",
      message: `Style target is ${style.targetSceneCount[0]}–${style.targetSceneCount[1]} scenes; received ${plan.scenes.length}.`,
    });
  }

  if (plan.scenes[0]?.kind !== "hook") {
    score -= 3;
    issues.push({
      code: "HOOK_NOT_FIRST",
      severity: "warning",
      sceneIndex: 0,
      message: "The first scene should function as the hook.",
    });
  }

  const finalKind = plan.scenes.at(-1)?.kind;
  const endingIsValid = ["cta", "outcome", "offer", "after"].includes(finalKind ?? "");
  if (!endingIsValid && !["story", "music-visual"].includes(plan.intent)) {
    score -= 3;
    issues.push({
      code: "UNRESOLVED_ENDING",
      severity: "warning",
      message: "The final scene does not resolve the promise, outcome, offer, or CTA.",
    });
  }

  const duplicateIds = plan.scenes.filter(
    (scene, index) => plan.scenes.findIndex((candidate) => candidate.id === scene.id) !== index,
  );
  if (duplicateIds.length) {
    score -= 2;
    issues.push({ code: "DUPLICATE_SCENE_IDS", severity: "blocker", message: "Scene IDs must be unique." });
  }

  return clamp(score, 0, 10);
}

function scoreStyleAdherence(plan: AutoTubeVideoPlan, issues: QualityIssue[]) {
  const style = getAutoTubeStyle(plan.styleId);
  if (plan.styleId === "custom") return 15;

  const visualMatches = plan.scenes.filter((scene) => style.visualModes.includes(scene.visual.mode)).length;
  const transitionMatches = plan.scenes.filter(
    (scene) => !scene.transitionOut || style.transitionLanguage.includes(scene.transitionOut),
  ).length;
  const animationTracks = plan.scenes.flatMap((scene) => scene.animations ?? []);
  const animationMatches = animationTracks.filter((track) => style.animationLanguage.includes(track.preset)).length;

  const visualRatio = plan.scenes.length ? visualMatches / plan.scenes.length : 0;
  const transitionRatio = plan.scenes.length ? transitionMatches / plan.scenes.length : 0;
  const animationRatio = animationTracks.length ? animationMatches / animationTracks.length : 0.5;
  const score = Math.round(clamp(visualRatio * 7 + transitionRatio * 3 + animationRatio * 5, 0, 15));

  if (visualRatio < 0.5) {
    issues.push({
      code: "STYLE_VISUAL_MISMATCH",
      severity: "blocker",
      message: `Fewer than half of scenes use the ${style.name} visual language.`,
    });
  } else if (visualRatio < 0.75) {
    issues.push({
      code: "WEAK_STYLE_VISUAL_ADHERENCE",
      severity: "warning",
      message: `Increase use of the ${style.name} visual language.`,
    });
  }

  if (animationTracks.length && animationRatio < 0.5) {
    issues.push({
      code: "STYLE_ANIMATION_MISMATCH",
      severity: "warning",
      message: "Most animation tracks do not use the selected style's motion vocabulary.",
    });
  }

  return score;
}

function scoreAnimation(plan: AutoTubeVideoPlan, issues: QualityIssue[]) {
  const style = getAutoTubeStyle(plan.styleId);
  const tracksPerScene = plan.scenes.map((scene) => scene.animations?.length ?? 0);
  const average = tracksPerScene.length
    ? tracksPerScene.reduce((total, value) => total + value, 0) / tracksPerScene.length
    : 0;
  const scenesWithMotion = tracksPerScene.filter((count) => count > 0).length;
  const motionRatio = plan.scenes.length ? scenesWithMotion / plan.scenes.length : 0;

  let score = Math.round(
    clamp(
      (style.minimumAnimationTracksPerScene === 0
        ? 8
        : (average / style.minimumAnimationTracksPerScene) * 9) +
        motionRatio * 6,
      0,
      15,
    ),
  );

  if (style.minimumAnimationTracksPerScene > 0 && average < style.minimumAnimationTracksPerScene * 0.5) {
    issues.push({
      code: "ANIMATION_DENSITY_TOO_LOW",
      severity: "blocker",
      message: `Average animation density is ${average.toFixed(1)} tracks per scene; ${style.name} expects approximately ${style.minimumAnimationTracksPerScene} or more.`,
    });
  } else if (style.minimumAnimationTracksPerScene > 0 && average < style.minimumAnimationTracksPerScene) {
    issues.push({
      code: "ANIMATION_DENSITY_BELOW_STYLE_TARGET",
      severity: "warning",
      message: `Animation density is below the ${style.name} target.`,
    });
  }

  plan.scenes.forEach((scene, sceneIndex) => {
    for (const track of scene.animations ?? []) {
      if (track.startSeconds < 0 || track.durationSeconds <= 0) {
        score -= 1;
        issues.push({
          code: "INVALID_ANIMATION_TIMING",
          severity: "blocker",
          sceneIndex,
          message: `Animation track ${track.id} has invalid timing.`,
        });
      }
      if (track.startSeconds + track.durationSeconds > durationOf(scene) + 0.05) {
        score -= 1;
        issues.push({
          code: "ANIMATION_EXCEEDS_SCENE",
          severity: "blocker",
          sceneIndex,
          message: `Animation track ${track.id} extends beyond the scene duration.`,
        });
      }
    }
  });

  return clamp(score, 0, 15);
}

function scoreVisualDiversity(plan: AutoTubeVideoPlan, issues: QualityIssue[]) {
  const keys = plan.scenes.map((scene) => scene.visual.uniqueKey).filter(Boolean);
  const modes = new Set(plan.scenes.map((scene) => scene.visual.mode));
  const uniqueKeys = new Set(keys);
  let score = Math.round(
    clamp(
      (plan.scenes.length ? uniqueKeys.size / plan.scenes.length : 0) * 7 + Math.min(modes.size, 3),
      0,
      10,
    ),
  );

  for (let index = 2; index < keys.length; index += 1) {
    if (keys[index] === keys[index - 1] && keys[index] === keys[index - 2]) {
      score -= 2;
      issues.push({
        code: "THREE_SCENE_VISUAL_REPEAT",
        severity: "blocker",
        sceneIndex: index,
        message: "The same visual composition repeats for three consecutive scenes.",
      });
    }
  }

  if (uniqueKeys.size < Math.min(5, plan.scenes.length)) {
    issues.push({
      code: "LOW_VISUAL_DIVERSITY",
      severity: "warning",
      message: "The scene plan relies on too few distinct visual compositions.",
    });
  }

  return clamp(score, 0, 10);
}

function scorePacing(plan: AutoTubeVideoPlan, issues: QualityIssue[]) {
  const style = getAutoTubeStyle(plan.styleId);
  const duration = plan.scenes.reduce((total, scene) => total + durationOf(scene), 0);
  let score = 10;

  if (duration < style.targetDurationSeconds[0] || duration > style.targetDurationSeconds[1]) {
    score -= 3;
    issues.push({
      code: "DURATION_OUTSIDE_STYLE_RANGE",
      severity: "warning",
      message: `${style.name} targets ${style.targetDurationSeconds[0]}–${style.targetDurationSeconds[1]} seconds; current duration is ${duration.toFixed(1)} seconds.`,
    });
  }

  plan.scenes.forEach((scene, sceneIndex) => {
    if (durationOf(scene) <= 0) {
      score -= 2;
      issues.push({
        code: "MISSING_SCENE_DURATION",
        severity: "blocker",
        sceneIndex,
        message: "Every render-ready scene requires a positive duration.",
      });
      return;
    }

    const maxStaticWindow = style.targetVisualChangeSeconds[1];
    const hasInternalMotion = (scene.animations?.length ?? 0) > 1;
    if (durationOf(scene) > maxStaticWindow * 1.5 && !hasInternalMotion) {
      score -= 1;
      issues.push({
        code: "LONG_STATIC_SCENE",
        severity: "warning",
        sceneIndex,
        message: "The scene exceeds the style's visual-change window without enough internal motion.",
      });
    }
  });

  return clamp(score, 0, 10);
}

function scoreReadability(plan: AutoTubeVideoPlan, issues: QualityIssue[]) {
  const hasSpeech = plan.scenes.some((scene) => Boolean(scene.narration)) ||
    plan.scenes.some((scene) => scene.audio?.some((cue) => cue.type === "narration"));
  let score = 10;

  if (hasSpeech && !plan.captions) {
    score -= 6;
    issues.push({
      code: "CAPTIONS_MISSING",
      severity: "blocker",
      message: "Spoken video requires synchronized captions.",
    });
  }

  plan.scenes.forEach((scene, sceneIndex) => {
    if (words(scene.title) > 10 || words(scene.onScreenText) > 20) {
      score -= 1;
      issues.push({
        code: "TEXT_DENSITY_HIGH",
        severity: "warning",
        sceneIndex,
        message: "Reduce on-screen copy or divide it across visual beats.",
      });
    }
  });

  return clamp(score, 0, 10);
}

function scoreCredibility(plan: AutoTubeVideoPlan, issues: QualityIssue[]) {
  const style = getAutoTubeStyle(plan.styleId);
  const evidenceIds = new Set((plan.evidence ?? []).map((record) => record.id));
  let score = 10;

  if (style.requiresBusinessEvidence && !plan.evidence?.length) {
    score -= 8;
    issues.push({
      code: "STYLE_REQUIRES_EVIDENCE",
      severity: "blocker",
      message: `${style.name} requires a dated evidence ledger.`,
    });
  }

  plan.scenes.forEach((scene, sceneIndex) => {
    for (const claim of scene.claims ?? []) {
      if (["observed", "measured"].includes(claim.kind)) {
        const supported = claim.evidenceIds?.some((id) => evidenceIds.has(id));
        if (!supported) {
          score -= 2;
          issues.push({
            code: "UNSUPPORTED_CLAIM",
            severity: "blocker",
            sceneIndex,
            message: `Claim lacks valid evidence: ${claim.text}`,
          });
        }
      }
    }
  });

  const riskProfile = plan.business?.riskProfile;
  if (riskProfile && riskProfile !== "standard") {
    const narration = plan.scenes.map((scene) => scene.narration ?? "").join(" ");
    const preservesHumanControl = includesAny(narration, [
      "human approval",
      "human stays in control",
      "professional judgment",
      "does not replace",
      "without replacing",
      "does not provide advice",
    ]);
    if (!preservesHumanControl) {
      score -= 5;
      issues.push({
        code: "HUMAN_CONTROL_GUARDRAIL_MISSING",
        severity: "blocker",
        message: "Sensitive or regulated work must preserve human approval and professional judgment.",
      });
    }
  }

  const prohibited = plan.business?.prohibitedClaims ?? [];
  plan.scenes.forEach((scene, sceneIndex) => {
    const content = `${scene.title} ${scene.onScreenText} ${scene.narration ?? ""}`;
    for (const term of prohibited) {
      if (content.toLowerCase().includes(term.toLowerCase())) {
        score -= 2;
        issues.push({
          code: "PROHIBITED_CLAIM_LANGUAGE",
          severity: "blocker",
          sceneIndex,
          message: `Scene uses prohibited claim language: ${term}`,
        });
      }
    }
  });

  return clamp(score, 0, 10);
}

function scoreAudio(plan: AutoTubeVideoPlan, issues: QualityIssue[]) {
  const sceneAudio = plan.scenes.flatMap((scene) => scene.audio ?? []);
  const globalAudio = plan.globalAudio ?? [];
  const allAudio = [...globalAudio, ...sceneAudio];
  const hasNarrationText = plan.scenes.some((scene) => Boolean(scene.narration));
  let score = 10;

  if (hasNarrationText && !allAudio.some((cue) => cue.type === "narration")) {
    score -= 3;
    issues.push({
      code: "NARRATION_AUDIO_NOT_MAPPED",
      severity: "warning",
      message: "Narration text exists, but no narration audio cue is mapped.",
    });
  }

  if (plan.styleId === "music-driven-visualizer" && !allAudio.some((cue) => cue.type === "music")) {
    score -= 8;
    issues.push({
      code: "SOURCE_MUSIC_MISSING",
      severity: "blocker",
      message: "Music-driven visualizers require a source music cue.",
    });
  }

  for (const cue of allAudio) {
    if (cue.startSeconds < 0 || (cue.durationSeconds !== undefined && cue.durationSeconds <= 0)) {
      score -= 1;
      issues.push({
        code: "INVALID_AUDIO_TIMING",
        severity: "blocker",
        message: `Audio cue ${cue.id} has invalid timing.`,
      });
    }
    if (cue.volume !== undefined && (cue.volume < 0 || cue.volume > 1)) {
      score -= 1;
      issues.push({
        code: "INVALID_AUDIO_VOLUME",
        severity: "blocker",
        message: `Audio cue ${cue.id} has a volume outside zero to one.`,
      });
    }
  }

  return clamp(score, 0, 10);
}

function scoreCallToAction(plan: AutoTubeVideoPlan, issues: QualityIssue[]) {
  const ctaRequired = ["cold-outreach", "follow-up", "product-demo", "social-ad", "proposal", "case-study"].includes(
    plan.intent,
  );

  if (!ctaRequired) {
    const ending = plan.scenes.at(-1);
    if (!ending || !["outcome", "after", "cta"].includes(ending.kind)) {
      issues.push({
        code: "EMOTIONAL_RESOLUTION_WEAK",
        severity: "warning",
        message: "The video needs a clearer final emotional or narrative state.",
      });
      return 6;
    }
    return 10;
  }

  let score = 10;
  if (!plan.callToAction?.trim()) {
    score -= 8;
    issues.push({ code: "CTA_MISSING", severity: "blocker", message: "This video intent requires a CTA." });
  } else if (words(plan.callToAction) > 24) {
    score -= 2;
    issues.push({ code: "CTA_TOO_LONG", severity: "warning", message: "Make the CTA shorter and easier to act on." });
  }

  const finalScene = plan.scenes.at(-1);
  if (finalScene && finalScene.kind !== "cta" && finalScene.kind !== "offer") {
    score -= 2;
    issues.push({
      code: "CTA_NOT_IN_FINAL_BEAT",
      severity: "warning",
      message: "Place the primary CTA in the final scene or final offer beat.",
    });
  }

  return clamp(score, 0, 10);
}

export function scoreAutoTubeVideoPlan(plan: AutoTubeVideoPlan): AutoTubeQualityReport {
  const issues: QualityIssue[] = [];
  const categoryScores: Record<QualityCategory, number> = {
    structure: scoreStructure(plan, issues),
    styleAdherence: scoreStyleAdherence(plan, issues),
    animation: scoreAnimation(plan, issues),
    visualDiversity: scoreVisualDiversity(plan, issues),
    pacing: scorePacing(plan, issues),
    readability: scoreReadability(plan, issues),
    credibility: scoreCredibility(plan, issues),
    audio: scoreAudio(plan, issues),
    callToAction: scoreCallToAction(plan, issues),
  };

  const score = Object.values(categoryScores).reduce((total, value) => total + value, 0);
  const totalDurationSeconds = Number(
    plan.scenes.reduce((total, scene) => total + durationOf(scene), 0).toFixed(2),
  );
  const hasBlocker = issues.some((issue) => issue.severity === "blocker");

  return {
    standardVersion: plan.standardVersion ?? "4.0.0",
    score,
    threshold: AUTOTUBE_PUBLISH_THRESHOLD,
    publishable: score >= AUTOTUBE_PUBLISH_THRESHOLD && !hasBlocker,
    totalDurationSeconds,
    categoryScores,
    issues,
  };
}

export function assertAutoTubeVideoPublishable(plan: AutoTubeVideoPlan) {
  const report = scoreAutoTubeVideoPlan(plan);
  if (!report.publishable) {
    const blockers = report.issues
      .filter((issue) => issue.severity === "blocker")
      .map((issue) => issue.code)
      .join(", ");
    throw new Error(
      `AutoTube video failed quality gates with score ${report.score}/${report.threshold}. Blockers: ${blockers || "none; score below threshold"}.`,
    );
  }
  return report;
}

export function getDemonstrationRatio(plan: AutoTubeVideoPlan) {
  if (!plan.scenes.length) return 0;
  return plan.scenes.filter((scene) => DEMONSTRATION_MODES.has(scene.visual.mode)).length / plan.scenes.length;
}
