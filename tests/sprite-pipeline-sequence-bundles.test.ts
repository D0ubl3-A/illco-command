import assert from "node:assert/strict";
import test from "node:test";
import { validateSequenceBundle, type SequenceBundle } from "../lib/sprite-pipeline/sequence-bundles";

const HASH = "a".repeat(64);

function validBundle(): SequenceBundle {
  return {
    sequenceId: "sequence-00001",
    characterId: "character-00001",
    camera: "orthographic-medium",
    facing: "right",
    frameRate: 20,
    durationMs: 250,
    anticipationFrame: 0,
    contactFrame: 1,
    followThroughFrame: 3,
    recoveryFrame: 4,
    frames: Array.from({ length: 5 }, (_, index) => ({
      assetId: `character-${String(index + 1).padStart(5, "0")}`,
      index,
      durationMs: 50,
      pivot: [0.5, 0.95],
      phase: ["anticipation", "contact", "follow-through", "follow-through", "recovery"][index],
      sha256: HASH.slice(0, 63) + String(index),
    })),
    collisionSuggestion: "capsule centered on torso",
    soundSlot: "impact-heavy-01",
    engineExportResults: { unity: true, godot: true, unreal: true, generic: true },
  };
}

test("accepts a complete synchronized sequence", () => {
  const result = validateSequenceBundle(validBundle());
  assert.equal(result.passed, true, result.failures.join("\n"));
  assert.equal(result.computedDurationMs, 250);
});

test("rejects missing indexes, duplicate assets, and duration drift", () => {
  const value = validBundle();
  value.frames[4].index = 6;
  value.frames[4].assetId = value.frames[0].assetId;
  value.frames[0].durationMs = 200;
  const result = validateSequenceBundle(value);
  assert.equal(result.passed, false);
  const failures = result.failures.join("\n");
  assert.match(failures, /missing frame index 4/);
  assert.match(failures, /duplicate frame assetId/);
  assert.match(failures, /duration mismatch/);
  assert.match(failures, /synchronization tolerance/);
});

test("rejects out-of-order markers and incomplete engine exports", () => {
  const value = validBundle();
  value.contactFrame = 4;
  value.followThroughFrame = 2;
  value.engineExportResults.unreal = false;
  const result = validateSequenceBundle(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /phase markers are out of order/);
  assert.match(result.failures.join("\n"), /unreal engine export has not passed/);
});

test("requires complete FX synchronization metadata", () => {
  const value = validBundle();
  delete value.characterId;
  value.fxFamilyId = "fx-family-00001";
  const result = validateSequenceBundle(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /FX sequence requires origin, direction, and scale/);
});

test("rejects marker-to-frame phase disagreement", () => {
  const value = validBundle();
  value.frames[1].phase = "recovery";
  const result = validateSequenceBundle(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /contact marker phase mismatch/);
});

test("rejects ambiguous character and FX identity", () => {
  const value = validBundle();
  value.fxFamilyId = "fx-family-00001";
  const result = validateSequenceBundle(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /cannot target both characterId and fxFamilyId/);
});
