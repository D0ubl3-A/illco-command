import assert from "node:assert/strict";
import test from "node:test";

import { compileAutoTubeV4Request } from "../lib/chatgpt-apps/autotube-runtime-v4";

function productDemoScenes() {
  return [
    ["See the workflow", "A complete job from inquiry to result"],
    ["Open the product", "The customer starts inside one clear interface"],
    ["Enter the request", "Required information is captured in context"],
    ["Run the workflow", "Each action produces a visible state change"],
    ["Review the dashboard", "The result stays organized and reviewable"],
    ["Take the next step", "Book a focused implementation walkthrough"],
  ].map(([title, on_screen_text], index) => ({
    id: `scene-${index + 1}`,
    title,
    on_screen_text,
    narration: `${title}. ${on_screen_text}.`,
    duration_seconds: 7,
  }));
}

test("AutoTube 4 compiles a publishable animated product demo", () => {
  const compiled = compileAutoTubeV4Request({
    prospect: "Example Service Company",
    offer: "a visible lead intake and follow-up workflow",
    video_title: "Example Service Company workflow demo",
    pain_point: "new inquiries require repetitive manual handling",
    call_to_action: "Book a focused implementation walkthrough.",
    style_id: "product-ui-demo",
    intent: "product-demo",
    duration_seconds: 42,
    captions: true,
    scenes: productDemoScenes(),
  });

  assert.equal(compiled.plan.styleId, "product-ui-demo");
  assert.equal(compiled.plan.intent, "product-demo");
  assert.equal(compiled.qualityReport.publishable, true);
  assert.ok(compiled.qualityReport.score >= 85);
  assert.deepEqual(compiled.unsupported, []);
  assert.equal(compiled.production.rendererScenes.length, 6);
  assert.match(compiled.masterPrompt, /AUTOTUBE MASTER PRODUCTION PROMPT/);
});

test("evidence business demos cannot render without an evidence ledger", () => {
  const compiled = compileAutoTubeV4Request({
    prospect: "Example Law Firm",
    offer: "a consultation intake workflow",
    video_title: "Example Law Firm intake demo",
    pain_point: "after-hours inquiries may wait for a response",
    call_to_action: "Review the proposed intake pilot.",
    style_id: "evidence-business-demo",
    intent: "cold-outreach",
    duration_seconds: 56,
    captions: true,
    scenes: Array.from({ length: 8 }, (_, index) => ({
      id: `scene-${index + 1}`,
      title: index === 0 ? "Example Law Firm" : `Workflow step ${index}`,
      on_screen_text: index === 7 ? "Review the proposed intake pilot" : "Visible workflow action",
      narration: "This is a proposed workflow demonstration.",
      duration_seconds: 7,
    })),
  });

  assert.equal(compiled.qualityReport.publishable, false);
  assert.ok(
    compiled.qualityReport.issues.some((issue) => issue.code === "STYLE_REQUIRES_EVIDENCE"),
  );
});

test("unsupported character lip sync remains an explicit renderer blocker", () => {
  const scenes = productDemoScenes();
  scenes[2] = {
    ...scenes[2],
    animations: [
      {
        id: "unsupported-lip-sync",
        target: "character",
        preset: "lip-sync",
        start_seconds: 0,
        duration_seconds: 2,
      },
    ],
  } as (typeof scenes)[number];

  const compiled = compileAutoTubeV4Request({
    prospect: "Example Company",
    offer: "an animated explanation",
    video_title: "Character explanation",
    pain_point: "the process is hard to explain",
    call_to_action: "Review the animated concept.",
    style_id: "product-ui-demo",
    intent: "product-demo",
    duration_seconds: 42,
    captions: true,
    scenes,
  });

  assert.deepEqual(compiled.unsupported, ["lip-sync"]);
});
