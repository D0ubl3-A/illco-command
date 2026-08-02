import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { evaluateReleaseGate, SCORE_WEIGHTS, type CategoryEvidence, type ReleaseGateInput } from "../lib/sprite-pipeline/release-gate";

function evidenceSlug(category: string): string {
  return category.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function evidenceHash(category: string): string {
  return createHash("sha256").update(`release-gate:${category}`).digest("hex");
}

function completeCategories(): CategoryEvidence[] {
  return Object.entries(SCORE_WEIGHTS).map(([category, earned]) => ({
    category: category as keyof typeof SCORE_WEIGHTS,
    earned,
    evidence: [{ path: `evidence/${evidenceSlug(category)}.json`, sha256: evidenceHash(category) }],
    mandatoryTestsExecuted: true,
  }));
}

function passingInput(): ReleaseGateInput {
  return {
    categories: completeCategories(),
    unresolvedSeverityNineOrTen: 0,
    blockerFailures: 0,
    overallPassRate: 0.995,
    publicationFailureRate: 0.01,
    ownershipComplete: true,
    transitionIntegrity: true,
    idempotencyIntegrity: true,
    archiveIntegrity: true,
    packageIntegrity: true,
    falseRenderClaims: 0,
    duplicateIds: 0,
    filenameCollisions: 0,
    corruptValidatedFiles: 0,
    continuityGaps: 0,
    unauthorizedOverwrites: 0,
    crashRecoveryPassed: true,
    realCharacterE2EPassed: true,
    realFxE2EPassed: true,
    sequenceSyncPassed: true,
    engineImportPassed: true,
    originalityReviewPassed: true,
  };
}

test("passes only the complete evidence-backed 10K gate", () => {
  const result = evaluateReleaseGate(passingInput());
  assert.equal(result.score, 10_000);
  assert.equal(result.passed, true, result.failures.join("\n"));
});

test("refuses points without evidence", () => {
  const input = passingInput();
  input.categories[0] = { ...input.categories[0], evidence: [] };
  const result = evaluateReleaseGate(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /Missing executable evidence/);
  assert.equal(result.score < 10_000, true);
});

test("rejects malformed evidence hashes", () => {
  const input = passingInput();
  input.categories[0] = {
    ...input.categories[0],
    evidence: [{ path: "evidence/architecture.json", sha256: "not-a-hash" }],
  };
  const result = evaluateReleaseGate(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /Invalid evidence SHA-256/);
  assert.equal(result.score < 10_000, true);
});

test("rejects evidence path reuse across categories", () => {
  const input = passingInput();
  input.categories[1] = {
    ...input.categories[1],
    evidence: [{
      path: input.categories[0].evidence[0].path,
      sha256: input.categories[0].evidence[0].sha256,
    }],
  };
  const result = evaluateReleaseGate(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /reused across categories/);
  assert.equal(result.score < 10_000, true);
});

test("rejects evidence hash reuse across categories regardless of hex casing", () => {
  const input = passingInput();
  input.categories[1] = {
    ...input.categories[1],
    evidence: [{
      path: "evidence/distinct-path.json",
      sha256: input.categories[0].evidence[0].sha256.toUpperCase(),
    }],
  };
  const result = evaluateReleaseGate(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /Evidence content reused across categories/);
  assert.equal(result.score < 10_000, true);
});

test("rejects unsafe evidence paths", () => {
  const input = passingInput();
  input.categories[0] = {
    ...input.categories[0],
    evidence: [{ path: "../evidence.json", sha256: evidenceHash("unsafe") }],
  };
  const result = evaluateReleaseGate(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /Unsafe evidence path/);
});

test("fails on a single blocker even with a nominal 10K score", () => {
  const input = passingInput();
  input.falseRenderClaims = 1;
  const result = evaluateReleaseGate(input);
  assert.equal(result.score, 10_000);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /False render claims: 1/);
});

test("rejects truthy non-boolean gate flags at runtime", () => {
  const input = passingInput() as unknown as Record<string, unknown>;
  input.ownershipComplete = "false";
  assert.throws(
    () => evaluateReleaseGate(input as unknown as ReleaseGateInput),
    /ownershipComplete must be boolean/,
  );
});

test("rejects malformed non-integer blocker counts", () => {
  const input = passingInput() as unknown as Record<string, unknown>;
  input.falseRenderClaims = Number.NaN;
  assert.throws(
    () => evaluateReleaseGate(input as unknown as ReleaseGateInput),
    /falseRenderClaims must be a non-negative safe integer/,
  );
});

test("rejects unknown score categories before they can affect accounting", () => {
  const input = passingInput() as unknown as { categories: Array<Record<string, unknown>> };
  input.categories[0] = { ...input.categories[0], category: "inventedCredit" };
  assert.throws(
    () => evaluateReleaseGate(input as unknown as ReleaseGateInput),
    /Unknown score category: inventedCredit/,
  );
});

test("rejects truthy non-boolean mandatory-test evidence", () => {
  const input = passingInput() as unknown as { categories: Array<Record<string, unknown>> };
  input.categories[0] = { ...input.categories[0], mandatoryTestsExecuted: "yes" };
  assert.throws(
    () => evaluateReleaseGate(input as unknown as ReleaseGateInput),
    /mandatoryTestsExecuted\.architecture must be boolean/,
  );
});
