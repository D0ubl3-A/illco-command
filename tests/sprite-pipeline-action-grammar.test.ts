import assert from "node:assert/strict";
import test from "node:test";
import { CORE_ACTION_GRAMMARS, validateActionGrammar, validateActionSequence } from "../lib/sprite-pipeline/action-grammar";

test("accepts a complete punch sequence", () => {
  const result = validateActionSequence(CORE_ACTION_GRAMMARS.punch, {
    action: "punch",
    phases: ["anticipation", "contact", "follow_through", "recovery"],
    frameCount: 12,
    facing: "right",
    direction: "forward",
  });
  assert.equal(result.passed, true, result.failures.join("\n"));
});

test("rejects missing contact and illegal recovery order", () => {
  const result = validateActionSequence(CORE_ACTION_GRAMMARS.punch, {
    action: "punch",
    phases: ["anticipation", "recovery", "follow_through"],
    frameCount: 8,
    facing: "left",
    direction: "forward",
  });
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /Missing required phase: contact/);
});

test("rejects malformed grammar references", () => {
  assert.throws(() => validateActionGrammar({
    action: "bad",
    requiredPhases: ["start"],
    optionalPhases: [],
    illegalOrder: [["missing", "start"]],
    minFrames: 1,
    maxFrames: 2,
  }), /unknown phase/);
});
