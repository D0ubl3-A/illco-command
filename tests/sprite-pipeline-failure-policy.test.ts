import assert from "node:assert/strict";
import test from "node:test";
import { classifyFailure, decideFailure } from "../lib/sprite-pipeline/failure-policy";

test("classifies common provider and validation failures", () => {
  assert.equal(classifyFailure("HTTP 429 rate limit exceeded"), "rate_limit");
  assert.equal(classifyFailure("transparent alpha bounds empty"), "alpha_failure");
  assert.equal(classifyFailure("celebrity likeness risk detected"), "likeness_ip");
  assert.equal(classifyFailure("archive checksum mismatch"), "corruption");
});

test("uses bounded exponential backoff while preserving the asset ID", () => {
  assert.deepEqual(decideFailure("network", 1), { action: "retry", delayMs: 1000, nextAttempt: 2, sameAssetId: true });
  assert.deepEqual(decideFailure("network", 3), { action: "retry", delayMs: 4000, nextAttempt: 4, sameAssetId: true });
  assert.equal(decideFailure("network", 4).action, "quarantine");
});

test("revises prompts for correctable visual defects", () => {
  const decision = decideFailure("chroma_failure", 2);
  assert.equal(decision.action, "revise_prompt");
  assert.equal(decision.nextAttempt, 3);
  assert.equal(decision.sameAssetId, true);
});

test("blocks IP and policy failures without retry", () => {
  assert.deepEqual(decideFailure("likeness_ip", 1), { action: "block", delayMs: 0, nextAttempt: 1, sameAssetId: true });
  assert.deepEqual(decideFailure("policy_rejection", 1), { action: "block", delayMs: 0, nextAttempt: 1, sameAssetId: true });
  assert.equal(decideFailure("corruption", 1).action, "quarantine");
});
