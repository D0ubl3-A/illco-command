import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFactCheck } from "../lib/debate-fact-check";

test("preserves true and false verdicts and clamps confidence", () => {
  assert.equal(normalizeFactCheck({ verdict: "false", confidence: 130 }).verdict, "false");
  assert.equal(normalizeFactCheck({ verdict: "true", confidence: -4 }).confidence, 0);
});

test("does not force uncertain output into true or false", () => {
  const result = normalizeFactCheck({ verdict: "maybe" as never, sources: [{ title: "bad", url: "javascript:alert(1)" }] });
  assert.equal(result.verdict, "unverified");
  assert.deepEqual(result.sources, []);
});
