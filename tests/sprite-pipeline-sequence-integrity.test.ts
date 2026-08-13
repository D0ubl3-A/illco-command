import assert from "node:assert/strict";
import test from "node:test";
import { validateSequence, type SequenceRecord } from "../lib/sprite-pipeline/sequence-integrity";

const HASH = "a".repeat(64);
function sequence(): SequenceRecord {
  return {
    sequenceId: "seq-character-00001-idle",
    kind: "character",
    frameRate: 25,
    durationMs: 160,
    frames: [0,1,2,3].map((index) => ({ assetId: `character-${String(index + 1).padStart(5,"0")}`, index, durationMs: 40, phase: index === 0 ? "anticipation" : index === 1 ? "contact" : index === 2 ? "follow_through" : "recovery", sha256: HASH })),
    anticipationFrame: 0,
    contactFrame: 1,
    followThroughFrame: 2,
    recoveryFrame: 3,
    pivot: [0.5, 1],
    engineChecks: { unity: "passed", godot: "passed", unreal: "not_applicable", generic: "passed" },
  };
}

test("accepts a synchronized complete sequence", () => {
  const result = validateSequence(sequence());
  assert.equal(result.passed, true, result.failures.join("\n"));
  assert.equal(result.calculatedDurationMs, 160);
});

test("rejects gaps, bad timing, and failed engine checks", () => {
  const value = sequence();
  value.frames[2].index = 7;
  value.frames[1].durationMs = 90;
  value.engineChecks.unity = "failed";
  const result = validateSequence(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /missing frame index/);
  assert.match(result.failures.join("\n"), /timing mismatch/);
  assert.match(result.failures.join("\n"), /engine validation failed/);
});

test("rejects missing and repeated frame asset IDs", () => {
  const value = sequence();
  value.frames[1].assetId = "   ";
  value.frames[3].assetId = value.frames[2].assetId;
  const result = validateSequence(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /missing assetId for frame 1/);
  assert.match(result.failures.join("\n"), /duplicate frame assetId character-00003/);
});

test("requires an origin for FX sequences", () => {
  const value = sequence();
  value.kind = "fx";
  const result = validateSequence(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /requires origin/);
});
