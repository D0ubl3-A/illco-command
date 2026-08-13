import assert from "node:assert/strict";
import test from "node:test";
import { reviewOriginality, type OriginalityReviewInput } from "../lib/sprite-pipeline/originality-review";

function validInput(): OriginalityReviewInput {
  return {
    assetId: "character-00001",
    bibleId: "brick-bellows",
    bibleVersion: 1,
    originalityDeclaration: "Entirely fictional clay fighter assembled from original geometric and wardrobe concepts.",
    prohibitedLikenessNotes: ["No real-person facial likeness", "No protected costume marks"],
    signals: [
      {
        sourceId: "real-person-index-nearest-001",
        sourceType: "real-person",
        likeness: 0.08,
        wardrobe: 0.05,
        facialGeometry: 0.07,
        silhouette: 0.09,
        palette: 0.04,
        nameSimilarity: 0,
        reviewerTool: "originality-scan",
        reviewerVersion: "1.0.0",
      },
      {
        sourceId: "protected-character-index-nearest-001",
        sourceType: "protected-character",
        likeness: 0.10,
        wardrobe: 0.09,
        facialGeometry: 0.08,
        silhouette: 0.11,
        palette: 0.10,
        nameSimilarity: 0.02,
        reviewerTool: "originality-scan",
        reviewerVersion: "1.0.0",
      },
    ],
    humanReviewRequired: true,
    humanReview: {
      reviewerId: "reviewer-001",
      decision: "approved",
      notes: "No identifiable person, protected character, brand, or copied internal design detected.",
      reviewedAt: "2026-07-30T23:10:00.000Z",
    },
  };
}

test("accepts a low-risk fictional asset with completed human review", () => {
  const result = reviewOriginality(validInput());
  assert.equal(result.passed, true, result.failures.join("\n"));
  assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
});

test("blocks identifiable real-person likeness", () => {
  const input = validInput();
  input.signals[0] = { ...input.signals[0], likeness: 0.75 };
  const result = reviewOriginality(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /real-person likeness threshold exceeded/);
});

test("blocks protected-character composite similarity", () => {
  const input = validInput();
  input.signals[1] = {
    ...input.signals[1],
    likeness: 0.8,
    wardrobe: 0.8,
    facialGeometry: 0.8,
    silhouette: 0.8,
    palette: 0.8,
    nameSimilarity: 0.8,
  };
  const result = reviewOriginality(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /protected-character similarity threshold exceeded/);
});

test("isolates invalid metrics without producing NaN risk", () => {
  const input = validInput();
  input.signals[0] = { ...input.signals[0], likeness: Number.NaN };
  const result = reviewOriginality(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /invalid similarity score/);
  assert.equal(Number.isFinite(result.highestRisk), true);
});

test("requires human evidence when review is mandatory", () => {
  const input = validInput();
  delete input.humanReview;
  const result = reviewOriginality(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /human originality review is missing/);
});

test("rejects duplicate scan sources and missing provenance", () => {
  const input = validInput();
  input.signals.push({ ...input.signals[0], reviewerTool: "", reviewerVersion: "" });
  const result = reviewOriginality(input);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /duplicate similarity source/);
  assert.match(result.failures.join("\n"), /tool provenance missing/);
});
