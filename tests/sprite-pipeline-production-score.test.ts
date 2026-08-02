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
  publicationFailureRate: 0,
  mandatoryTestsExecuted: true,
  unresolvedSeverityNineOrTen: 0,
  mandatoryTestPassRate: 1,
  blockerTestFailures: 0,
  renderTruthfulnessPassed: true,
  visualQualityPassed: true,
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

test("awards zero baseline points when executable controls are absent", () => {
  const result = calculateProductionScore({
    ...complete,
    validatedCharacters: 0,
    validatedFx: 0,
    packageTargets: [],
    packageVerificationPassed: false,
    exactHashesUnique: false,
    perceptualDuplicateScanPassed: false,
    ownershipCoveragePassed: false,
    transitionCoveragePassed: false,
    crashRecoveryPassed: false,
    sequenceSynchronizationPassed: false,
    originalityReviewPassed: false,
    publicationGatePassed: false,
    mandatoryTestsExecuted: false,
    mandatoryTestPassRate: 0,
    renderTruthfulnessPassed: false,
    visualQualityPassed: false,
  });
  assert.equal(result.categories.architectureOrchestration, 0);
  assert.equal(result.categories.continuityState, 0);
  assert.equal(result.categories.manifestIntegrity, 0);
  assert.equal(result.categories.scalabilityOperations, 0);
  assert.equal(result.categories.commercialEngineReadiness, 0);
  assert.equal(result.rawScore, 0);
  assert.equal(result.score, 0);
  assert.equal(result.gatePassed, false);
});

test("rejects impossible asset overcounts instead of clamping them to full coverage", () => {
  assert.throws(
    () => calculateProductionScore({ ...complete, validatedCharacters: 10_001 }),
    /validatedCharacters cannot exceed the authoritative production target 10000/,
  );
  assert.throws(
    () => calculateProductionScore({ ...complete, validatedFx: 10_001 }),
    /validatedFx cannot exceed the authoritative production target 10000/,
  );
});

test("rejects unsupported engine targets instead of treating malformed package evidence as partial readiness", () => {
  assert.throws(
    () => calculateProductionScore({
      ...complete,
      packageTargets: ["ios", "android", "web", "desktop"],
    }),
    /unsupported targets: ios, android, web, desktop/,
  );
});

test("requires all mandatory tests to execute and publication failures to stay at or below two percent", () => {
  const notExecuted = calculateProductionScore({ ...complete, mandatoryTestsExecuted: false });
  assert.equal(notExecuted.gatePassed, false);
  assert.ok(notExecuted.blockers.includes("mandatory test suite has not been fully executed"));

  const publicationFailure = calculateProductionScore({ ...complete, publicationFailureRate: 0.0201 });
  assert.equal(publicationFailure.gatePassed, false);
  assert.ok(publicationFailure.blockers.some((entry) => entry.includes("exceeds 2%")));

  const boundary = calculateProductionScore({ ...complete, publicationFailureRate: 0.02 });
  assert.equal(boundary.gatePassed, true);
});

test("normalizes required package target casing and rejects duplicate target evidence", () => {
  const normalized = calculateProductionScore({
    ...complete,
    packageTargets: [" Unity ", "GODOT", "Unreal", "generic"],
  });
  assert.equal(normalized.gatePassed, true);

  assert.throws(
    () => calculateProductionScore({
      ...complete,
      packageTargets: ["unity", "unity", "godot", "unreal"],
    }),
    /must not contain duplicates/,
  );
});

test("fails closed instead of inferring render truth or visual quality from asset counts", () => {
  const result = calculateProductionScore({
    ...complete,
    renderTruthfulnessPassed: undefined,
    visualQualityPassed: undefined,
  });
  assert.equal(result.gatePassed, false);
  assert.equal(result.categories.renderTruthfulness, 0);
  assert.equal(result.categories.visualQuality, 0);
  assert.ok(result.blockers.includes("render-truthfulness evidence has not passed"));
  assert.ok(result.blockers.includes("visual-quality evidence has not passed"));
});

test("reports exact-hash uniqueness as an explicit blocker", () => {
  const result = calculateProductionScore({ ...complete, exactHashesUnique: false });
  assert.equal(result.gatePassed, false);
  assert.ok(result.blockers.includes("exact-hash uniqueness has not passed"));
});

test("rejects malformed external score inputs", () => {
  assert.throws(() => calculateProductionScore({ ...complete, mandatoryTestPassRate: 1.1 }), /between 0 and 1/);
  assert.throws(() => calculateProductionScore({ ...complete, publicationFailureRate: -0.01 }), /between 0 and 1/);
  assert.throws(() => calculateProductionScore({ ...complete, validatedCharacters: -1 }), /non-negative/);
  assert.throws(() => calculateProductionScore({ ...complete, blockerTestFailures: 1.5 }), /safe integer/);
  assert.throws(() => calculateProductionScore({ ...complete, packageTargets: ["unity", ""] }), /non-empty strings/);
  assert.throws(() => calculateProductionScore({ ...complete, visualQualityPassed: "yes" as never }), /must be boolean/);
});
