import assert from "node:assert/strict";
import test from "node:test";
import { calculateEvidenceScore, SCORE_WEIGHTS, type ControlEvidence, type ReleaseFacts } from "../lib/sprite-pipeline/evidence-scoring";

const HASH = "a".repeat(64);

function passingFacts(): ReleaseFacts {
  return { unresolvedSeverity9Or10: 0, ownershipIntegrity: true, transitionIntegrity: true, idempotencyIntegrity: true, archiveIntegrity: true, packageIntegrity: true, falseRenderClaims: 0, duplicateIds: 0, filenameCollisions: 0, corruptValidatedFiles: 0, continuityGaps: 0, unauthorizedOverwrites: 0, mandatoryTestsExecuted: true, testPassRate: 0.99, blockerFailures: 0, publicationFailureRate: 0.02, evidenceComplete: true, crashRecoveryPassed: true, realCharacterE2ePassed: true, realFxE2ePassed: true, sequenceSyncPassed: true, enginePackageValidationPassed: true, originalityReviewPassed: true };
}

function fullEvidence(): ControlEvidence[] {
  return Object.entries(SCORE_WEIGHTS).map(([category, points], index) => ({ controlId: `control-${index}`, category: category as keyof typeof SCORE_WEIGHTS, points, implemented: true, passed: true, current: true, executable: true, evidencePath: `evidence/control-${index}.json`, evidenceSha256: HASH }));
}

test("awards 10000 only when all evidence and gates pass", () => {
  const result = calculateEvidenceScore(fullEvidence(), passingFacts());
  assert.equal(result.rawScore, 10_000);
  assert.equal(result.cappedScore, 10_000);
  assert.equal(result.gatePassed, true);
});

test("caps a nominal perfect score below 10000 when a release gate fails", () => {
  const facts = passingFacts();
  facts.realFxE2ePassed = false;
  const result = calculateEvidenceScore(fullEvidence(), facts);
  assert.equal(result.rawScore, 10_000);
  assert.equal(result.cappedScore, 9_999);
  assert.equal(result.gatePassed, false);
  assert.match(result.failedGates.join("\n"), /realFxE2ePassed/);
});

test("rejects plans, stale evidence, invalid hashes, and duplicate controls", () => {
  const evidence = fullEvidence();
  evidence[0].implemented = false;
  evidence[1].current = false;
  evidence[2].evidenceSha256 = "invalid";
  evidence.push({ ...evidence[3] });
  const result = calculateEvidenceScore(evidence, passingFacts());
  assert.ok(result.rawScore < 10_000);
  assert.equal(result.gatePassed, false);
  assert.equal(result.rejectedEvidence.length, 4);
});

test("never exceeds category weights", () => {
  const evidence = fullEvidence();
  evidence[0].points = 999999;
  const result = calculateEvidenceScore(evidence, passingFacts());
  assert.equal(result.categoryScores.architecture, SCORE_WEIGHTS.architecture);
  assert.equal(result.rawScore, 10_000);
});
