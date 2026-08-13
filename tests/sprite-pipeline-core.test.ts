import assert from "node:assert/strict";
import test from "node:test";
import {
  assertOwnership,
  assertTransition,
  buildOperationKey,
  ownerForAsset,
  verifyEvidence,
} from "../lib/sprite-pipeline/state-machine";

const validEvidence = () => ({
  controlId: "STATE-001",
  testVersion: "1.0.0",
  rawResult: "pass",
  passed: true,
  evidencePath: "evidence/run-1/state-001.json",
  evidenceHash: "a".repeat(64),
  createdAt: "2026-07-30T12:00:00.000Z",
});

test("character ownership covers exactly 20 IDs per surgeon", () => {
  assert.equal(ownerForAsset("character", 1), 1);
  assert.equal(ownerForAsset("character", 20), 1);
  assert.equal(ownerForAsset("character", 21), 2);
  assert.equal(ownerForAsset("character", 10_000), 500);
});

test("fx ownership covers exactly 20 IDs per surgeon", () => {
  assert.equal(ownerForAsset("fx", 1), 501);
  assert.equal(ownerForAsset("fx", 20), 501);
  assert.equal(ownerForAsset("fx", 21), 502);
  assert.equal(ownerForAsset("fx", 10_000), 1000);
});

test("ownership violations are release-blocking errors", () => {
  assert.throws(() => assertOwnership("character", 21, 1), /Ownership violation/);
  assert.doesNotThrow(() => assertOwnership("character", 21, 2));
});

test("state machine permits the truthful happy path", () => {
  assert.doesNotThrow(() => assertTransition("planned", "queued"));
  assert.doesNotThrow(() => assertTransition("queued", "rendering"));
  assert.doesNotThrow(() => assertTransition("rendering", "rendered_unvalidated"));
  assert.doesNotThrow(() => assertTransition("rendered_unvalidated", "validated"));
  assert.doesNotThrow(() => assertTransition("validated", "packaged"));
  assert.doesNotThrow(() => assertTransition("packaged", "published"));
});

test("state machine rejects false completion jumps", () => {
  assert.throws(() => assertTransition("queued", "validated"), /Illegal asset transition/);
  assert.throws(() => assertTransition("rendering", "published"), /Illegal asset transition/);
});

test("operation key is deterministic and attempt-sensitive", () => {
  const base = {
    themeId: "clay-brawl",
    themeVersion: "1",
    runId: "run-1",
    surgeonId: 1,
    assetId: "character-00001",
    promptVersion: "1",
    provider: "openai",
    modelVersion: "image-v1",
    attempt: 1,
  };
  assert.equal(buildOperationKey(base), buildOperationKey(base));
  assert.notEqual(buildOperationKey(base), buildOperationKey({ ...base, attempt: 2 }));
});

test("evidence accepts a complete canonical record", () => {
  assert.doesNotThrow(() => verifyEvidence(validEvidence()));
});

test("evidence rejects malformed hashes", () => {
  assert.throws(() => verifyEvidence({ ...validEvidence(), evidenceHash: "bad" }), /SHA-256/);
});

test("evidence rejects blank raw results", () => {
  assert.throws(() => verifyEvidence({ ...validEvidence(), rawResult: "" }), /rawResult/);
  assert.throws(() => verifyEvidence({ ...validEvidence(), rawResult: "   " }), /rawResult/);
});

test("evidence rejects non-boolean outcomes from deserialized input", () => {
  const malformed = { ...validEvidence(), passed: "true" } as unknown as Parameters<typeof verifyEvidence>[0];
  assert.throws(() => verifyEvidence(malformed), /boolean/);
});

test("evidence rejects non-canonical and impossible timestamps", () => {
  assert.throws(
    () => verifyEvidence({ ...validEvidence(), createdAt: "July 30, 2026 12:00:00 UTC" }),
    /canonical UTC ISO timestamp/,
  );
  assert.throws(
    () => verifyEvidence({ ...validEvidence(), createdAt: "2026-02-30T12:00:00.000Z" }),
    /valid calendar timestamp/,
  );
  assert.throws(
    () => verifyEvidence({ ...validEvidence(), createdAt: "2026-07-30T05:00:00.000-07:00" }),
    /canonical UTC ISO timestamp/,
  );
});
