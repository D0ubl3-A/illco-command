import assert from "node:assert/strict";
import test from "node:test";
import { calculateProductionScore } from "../lib/sprite-pipeline/production-score";

const complete = {
  validatedCharacters: 10_000,
  validatedFx: 10_000,
  packageTargets: ["unity", "godot", "unreal", "generic"],
  packageVerificationPassed: true,
  exactHashesUnique: true,
  perceptualDuplicateScanPassed: true,
  ownershipCoveragePassed: true,
  transitionCoveragePassed: true,
  crashRecoveryPassed: true,
  sequenceSynchronizationPassed: true,
  originalityReviewPassed: true,
  publicationGatePassed: true,
  unresolvedSeverityNineOrTen: 0,
  mandatoryTestPassRate: 1,
  blockerTestFailures: 0,
};

test("awards 10000 only when every production release gate passes", () => {
  const result = calculateProductionScore(complete);
  assert.equal(result.gatePassed, true);
  assert.equal(result.rawScore, 10_000);
  assert.equal(result.score, 10_000);
  assert.deepEqual(result.blockers, []);
});

test("caps a partial real run and reports concrete missing gates", () => {
  const result = calculateProductionScore({
    ...complete,
    validatedCharacters: 24,
    validatedFx: 24,
    perceptualDuplicateScanPassed: false,
    crashRecoveryPassed: false,
    sequenceSynchronizationPassed: false,
    originalityReviewPassed: false,
    publicationGatePassed: false,
    unresolvedSeverityNineOrTen: 2,
  });
  assert.equal(result.gatePassed, false);
  assert.ok(result.score < 10_000);
  assert.ok(result.blockers.some((entry) => entry.includes("severity-9/10")));
  assert.ok(result.blockers.some((entry) => entry.includes("character coverage")));
  assert.ok(result.blockers.some((entry) => entry.includes("perceptual duplicate")));
});

test("does not let asset counts exceed their category weights", () => {
  const result = calculateProductionScore({ ...complete, validatedCharacters: 99_999, validatedFx: 99_999 });
  assert.equal(result.categories.characterCoverage, 900);
  assert.equal(result.categories.fxTextureCoverage, 900);
  assert.equal(result.score, 10_000);
});

test("rejects malformed external score inputs", () => {
  assert.throws(() => calculateProductionScore({ ...complete, mandatoryTestPassRate: 1.1 }), /between 0 and 1/);
  assert.throws(() => calculateProductionScore({ ...complete, validatedCharacters: -1 }), /non-negative/);
  assert.throws(() => calculateProductionScore({ ...complete, blockerTestFailures: 1.5 }), /safe integer/);
});
