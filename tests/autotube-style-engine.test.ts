import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTOTUBE_STYLES,
  buildAutoTubeMasterPrompt,
  buildAutoTubePipeline,
  getStyleDirective,
  scoreAutoTubeVideoPlan,
  type AnimationTrack,
  type AutoTubeStyleId,
  type AutoTubeVideoPlan,
} from "../lib/chatgpt-apps/autotube/index";

const expectedStyles: AutoTubeStyleId[] = [
  "evidence-business-demo",
  "product-ui-demo",
  "animated-explainer",
  "cinematic-brand-film",
  "kinetic-typography",
  "character-story",
  "social-performance-ad",
  "documentary-case-study",
  "before-after-transformation",
  "data-story",
  "mixed-media-collage",
  "music-driven-visualizer",
  "custom",
];

function animationTracks(sceneId: string): AnimationTrack[] {
  return [
    {
      id: `${sceneId}-draw`,
      target: "scene",
      preset: "draw-path",
      startSeconds: 0,
      durationSeconds: 1,
      easing: "ease-out",
    },
    {
      id: `${sceneId}-morph`,
      target: "image",
      preset: "morph",
      startSeconds: 1,
      durationSeconds: 1,
      easing: "ease-in-out",
    },
    {
      id: `${sceneId}-spring`,
      target: "headline",
      preset: "spring",
      startSeconds: 2,
      durationSeconds: 1,
      easing: "spring-soft",
    },
    {
      id: `${sceneId}-parallax`,
      target: "background",
      preset: "parallax",
      startSeconds: 3,
      durationSeconds: 2,
      easing: "ease-in-out",
    },
  ];
}

function buildPerfectExplainer(): AutoTubeVideoPlan {
  const kinds: AutoTubeVideoPlan["scenes"][number]["kind"][] = [
    "hook",
    "problem",
    "character",
    "workflow",
    "data",
    "outcome",
    "outcome",
  ];
  const modes: AutoTubeVideoPlan["scenes"][number]["visual"]["mode"][] = [
    "kinetic-type",
    "character-animation",
    "workflow-diagram",
    "character-animation",
    "chart-animation",
    "workflow-diagram",
    "kinetic-type",
  ];

  return {
    standardVersion: "4.0.0",
    title: "How the system works",
    intent: "explainer",
    styleId: "animated-explainer",
    aspectRatio: "landscape",
    targetDurationSeconds: 49,
    captions: true,
    scenes: kinds.map((kind, index) => {
      const id = `scene-${index + 1}`;
      return {
        id,
        kind,
        title: index === 0 ? "See the whole system" : `Step ${index}`,
        onScreenText: index === 6 ? "One clear result" : "One clear visual idea",
        durationSeconds: 7,
        visual: {
          mode: modes[index],
          uniqueKey: `unique-visual-${index + 1}`,
          interactionSteps: ["introduce", "transform", "resolve"],
        },
        animations: animationTracks(id),
        transitionOut: "morph",
      };
    }),
  };
}

test("every AutoTube style has a preset and a complete director bible", () => {
  assert.deepEqual(Object.keys(AUTOTUBE_STYLES).sort(), [...expectedStyles].sort());

  for (const styleId of expectedStyles) {
    const style = AUTOTUBE_STYLES[styleId];
    const directive = getStyleDirective(styleId);

    assert.equal(style.id, styleId);
    assert.equal(directive.styleId, styleId);
    assert.ok(style.creativeThesis.length > 40);
    assert.ok(style.forbiddenPatterns.length >= 5);
    assert.ok(style.proofOfQuality.length >= 3);
    assert.ok(directive.preproduction.length >= 4);
    assert.ok(directive.narrativeArchitecture.length >= 3);
    assert.ok(directive.assetStrategy.length >= 3);
    assert.ok(directive.animationDirection.length >= 3);
    assert.ok(directive.qualityGates.length >= 3);

    if (styleId === "custom") {
      const customAudioContract = directive.audioDirection.join(" ");
      assert.ok(directive.audioDirection.length >= 1);
      assert.match(customAudioContract, /narration/i);
      assert.match(customAudioContract, /dialogue/i);
      assert.match(customAudioContract, /music/i);
      assert.match(customAudioContract, /SFX/i);
      assert.match(customAudioContract, /ambience/i);
      assert.match(customAudioContract, /silence/i);
      assert.match(customAudioContract, /sync/i);
      assert.match(customAudioContract, /loudness/i);
      assert.match(customAudioContract, /rights/i);
    } else {
      assert.ok(directive.audioDirection.length >= 3);
    }
  }
});

test("the pipeline contains all twelve gated production stages", () => {
  const plan = buildPerfectExplainer();
  const pipeline = buildAutoTubePipeline(plan);

  assert.equal(pipeline.stages.length, 12);
  assert.equal(pipeline.stages[0].id, "brief");
  assert.equal(pipeline.stages.at(-1)?.id, "delivery-and-learning");
  assert.equal(pipeline.publishScore, 85);
  assert.match(pipeline.renderPolicy, /Never render/);
});

test("the master prompt compiles the selected style into production orders", () => {
  const plan = buildPerfectExplainer();
  const prompt = buildAutoTubeMasterPrompt(plan, {
    requireAnimation: true,
    requireAudio: true,
    requireImageGeneration: true,
    requirePlatformVariants: true,
    critiquePasses: 4,
    outputMode: "render-ready",
  });

  assert.match(prompt, /AUTOTUBE MASTER PRODUCTION PROMPT/);
  assert.match(prompt, /Animated Explainer/);
  assert.match(prompt, /ADVERSARIAL SELF-CRITIQUE LOOP/);
  assert.match(prompt, /Run at least 4 full critique-and-revision passes/);
  assert.match(prompt, /animation_manifest/);
  assert.match(prompt, /Never report a render as started or completed/);
});

test("a generic evidence-demo slideshow is blocked", () => {
  const plan: AutoTubeVideoPlan = {
    standardVersion: "4.0.0",
    title: "Generic business video",
    intent: "cold-outreach",
    styleId: "evidence-business-demo",
    aspectRatio: "landscape",
    captions: false,
    business: {
      name: "Example Company",
      website: "https://example.com",
      riskProfile: "standard",
    },
    offer: "Automation",
    painPoint: "Manual work",
    callToAction: "Call us",
    scenes: [
      {
        id: "slide-1",
        kind: "hook",
        title: "Transform your business",
        onScreenText: "AI can help",
        narration: "AI can help transform your business.",
        durationSeconds: 15,
        visual: { mode: "brand-transition", uniqueKey: "same-background" },
      },
      {
        id: "slide-2",
        kind: "problem",
        title: "Save time",
        onScreenText: "Automate more",
        narration: "Automation can save time.",
        durationSeconds: 15,
        visual: { mode: "brand-transition", uniqueKey: "same-background" },
      },
      {
        id: "slide-3",
        kind: "cta",
        title: "Contact us",
        onScreenText: "Book a call",
        narration: "Contact us to learn more.",
        durationSeconds: 15,
        visual: { mode: "brand-transition", uniqueKey: "same-background" },
      },
    ],
  };

  const report = scoreAutoTubeVideoPlan(plan);
  assert.equal(report.publishable, false);
  assert.ok(report.score < 85);
  assert.ok(report.issues.some((issue) => issue.code === "STYLE_REQUIRES_EVIDENCE"));
  assert.ok(report.issues.some((issue) => issue.code === "ANIMATION_DENSITY_TOO_LOW"));
  assert.ok(report.issues.some((issue) => issue.code === "CAPTIONS_MISSING"));
});

test("a fully specified animated explainer passes at 100", () => {
  const report = scoreAutoTubeVideoPlan(buildPerfectExplainer());

  assert.equal(report.score, 100);
  assert.equal(report.publishable, true);
  assert.equal(report.issues.length, 0);
});
