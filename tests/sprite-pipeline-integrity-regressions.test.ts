import assert from "node:assert/strict";
import test from "node:test";
import {
  validateManifestRecord,
  type AssetManifestRecord,
} from "../lib/sprite-pipeline/validation";
import {
  evaluateReleaseGate,
  SCORE_WEIGHTS,
  type CategoryEvidence,
  type ReleaseGateInput,
  type ScoreCategory,
} from "../lib/sprite-pipeline/release-gate";

function validManifest(): AssetManifestRecord {
  return {
    assetId: "character-00001",
    kind: "character",
    filename: "character-00001.png",
    relativePath: "characters/character-00001.png",
    width: 1024,
    height: 1024,
    format: "png",
    backgroundMode: "chroma",
    sha256: "a".repeat(64),
    alphaPresent: false,
    alphaBoundsNonEmpty: true,
    chromaPurity: 0.999,
    edgeContamination: 0.001,
    clippingScore: 0,
    textLogoDetected: false,
    likenessRisk: 0,
  };
}

function categories(): CategoryEvidence[] {
  return (Object.entries(SCORE_WEIGHTS) as Array<[ScoreCategory, number]>).map(
    ([category, earned], index) => ({
      category,
      earned,
      mandatoryTestsExecuted: true,
      evidence: [{
        path: `evidence/${category.toLowerCase()}/control-${index}.json`,
        sha256: (index + 1).toString(16).padStart(64, "0"),
      }],
    }),
  );
}

function passingGateInput(): ReleaseGateInput {
  return {
    categories: categories(),
    unresolvedSeverityNineOrTen: 0,
    blockerFailures: 0,
    overallPassRate: 1,
    publicationFailureRate: 0,
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

test("rejects an asset ID prefix that disagrees with manifest kind", () => {
  const record = validManifest();
  record.kind = "fx";
  const result = validateManifestRecord(record);
  assert.equal(result.passed, false);
  assert.equal(result.failures.some((failure) => failure.controlId === "MANIFEST-KIND-ID"), true);
});

test("accepts a matching manifest kind and asset ID prefix", () => {
  const result = validateManifestRecord(validManifest());
  assert.equal(result.passed, true, result.failures.map((failure) => failure.message).join("\n"));
});

test("rejects evidence content reused across score categories", () => {
  const input = passingGateInput();
  input.categories[1].evidence[0].sha256 = input.categories[0].evidence[0].sha256;
  const result = evaluateReleaseGate(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /Evidence content reused across categories/);
  assert.equal(result.score < 10_000, true);
});

test("accepts uniquely hashed evidence when all release gates pass", () => {
  const result = evaluateReleaseGate(passingGateInput());
  assert.equal(result.passed, true, result.failures.join("\n"));
  assert.equal(result.score, 10_000);
});
