import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReleaseGate, SCORE_WEIGHTS, type CategoryEvidence, type ReleaseGateInput } from "../lib/sprite-pipeline/release-gate";

function completeCategories(): CategoryEvidence[] {
  return Object.entries(SCORE_WEIGHTS).map(([category, earned]) => ({
    category: category as keyof typeof SCORE_WEIGHTS,
    earned,
    evidencePaths: [`evidence/${category}.json`],
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
  input.categories[0] = { ...input.categories[0], evidencePaths: [] };
  const result = evaluateReleaseGate(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /Missing executable evidence/);
  assert.equal(result.score < 10_000, true);
});

test("fails on a single blocker even with a nominal 10K score", () => {
  const input = passingInput();
  input.falseRenderClaims = 1;
  const result = evaluateReleaseGate(input);
  assert.equal(result.score, 10_000);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /False render claims: 1/);
});
