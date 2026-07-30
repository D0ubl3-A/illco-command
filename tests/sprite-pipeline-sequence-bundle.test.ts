import assert from "node:assert/strict";
import test from "node:test";
import { validateSequenceBundle, type SequenceBundle } from "../lib/sprite-pipeline/sequence-bundle";

const SHA = "a".repeat(64);

function characterBundle(): SequenceBundle {
  return {
    sequenceId: "seq-character-00001-punch",
    kind: "character",
    action: "jab",
    camera: "full-body-front",
    facing: "right",
    frameRate: 10,
    durationMs: 400,
    anticipationFrame: 0,
    contactFrame: 1,
    followThroughFrame: 2,
    recoveryFrame: 3,
    collisionSuggestion: "capsule torso, fist contact circle",
    soundSlot: "punch-light",
    engineExportPassed: true,
    frames: [0, 1, 2, 3].map((index) => ({
      assetId: `character-${String(index + 1).padStart(5, "0")}`,
      index,
      phase: ["anticipation", "contact", "follow-through", "recovery"][index],
      durationMs: 100,
      pivot: [0.5, 1],
      fileSha256: SHA,
    })),
  };
}

test("accepts a synchronized character sequence", () => {
  const result = validateSequenceBundle(characterBundle());
  assert.equal(result.passed, true, result.failures.join("\n"));
  assert.equal(result.computedDurationMs, 400);
  assert.match(result.digest, /^[a-f0-9]{64}$/);
});

test("rejects missing indexes, duplicate IDs, and duration drift", () => {
  const value = characterBundle();
  value.frames[2].index = 3;
  value.frames[2].assetId = value.frames[1].assetId;
  value.durationMs = 500;
  const result = validateSequenceBundle(value);
  assert.equal(result.passed, false);
  const failures = result.failures.join("\n");
  assert.match(failures, /duplicate frame assetId/);
  assert.match(failures, /duplicate frame index/);
  assert.match(failures, /missing frame index/);
  assert.match(failures, /duration mismatch/);
});

test("rejects out-of-order action phase markers", () => {
  const value = characterBundle();
  value.contactFrame = 2;
  value.followThroughFrame = 1;
  const result = validateSequenceBundle(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /followThrough frame must follow/);
});

test("requires FX origin, direction, and scale", () => {
  const value: SequenceBundle = {
    ...characterBundle(),
    kind: "fx",
    sequenceId: "seq-fx-00001-impact",
  };
  const result = validateSequenceBundle(value);
  assert.equal(result.passed, false);
  const failures = result.failures.join("\n");
  assert.match(failures, /fxOrigin/);
  assert.match(failures, /fxDirection/);
  assert.match(failures, /fxScale/);
});

test("blocks packaging truth when engine export did not pass", () => {
  const value = characterBundle();
  value.engineExportPassed = false;
  const result = validateSequenceBundle(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /engine export validation has not passed/);
});
