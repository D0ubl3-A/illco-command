import assert from "node:assert/strict";
import test from "node:test";
import { calculateEvidenceScore, type ReleaseFacts } from "../lib/sprite-pipeline/evidence-scoring";
import { SCORE_MAX } from "../lib/sprite-pipeline/defect-ranking";
import { SCORE_CATEGORIES, SCORE_WEIGHTS } from "../lib/sprite-pipeline/score-weights";

const blockedFacts: ReleaseFacts = {
  unresolvedSeverity9Or10: 1,
  ownershipIntegrity: false,
  transitionIntegrity: false,
  idempotencyIntegrity: false,
  archiveIntegrity: false,
  packageIntegrity: false,
  falseRenderClaims: 0,
  duplicateIds: 0,
  filenameCollisions: 0,
  corruptValidatedFiles: 0,
  continuityGaps: 0,
  unauthorizedOverwrites: 0,
  mandatoryTestsExecuted: false,
  testPassRate: 0,
  blockerFailures: 1,
  publicationFailureRate: 0,
  evidenceComplete: false,
  crashRecoveryPassed: false,
  realCharacterE2ePassed: false,
  realFxE2ePassed: false,
  sequenceSyncPassed: false,
  enginePackageValidationPassed: false,
  originalityReviewPassed: false,
};

test("uses one authoritative 10000-point weight table", () => {
  assert.equal(SCORE_CATEGORIES.reduce((sum, category) => sum + SCORE_WEIGHTS[category], 0), 10_000);
  assert.equal(SCORE_MAX, SCORE_WEIGHTS);
});

test("rejects malformed external evidence categories without NaN", () => {
  const result = calculateEvidenceScore([{
    controlId: "BAD-CATEGORY",
    category: "typo-category",
    points: 1000,
    implemented: true,
    passed: true,
    current: true,
    executable: true,
    evidencePath: "evidence/bad.json",
    evidenceSha256: "a".repeat(64),
  } as never], blockedFacts);
  assert.equal(result.rawScore, 0);
  assert.equal(Number.isFinite(result.rawScore), true);
  assert.match(result.rejectedEvidence.join("\n"), /unknown score category/);
});
