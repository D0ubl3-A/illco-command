import assert from "node:assert/strict";
import test from "node:test";
import { compareFingerprints, dHashFromGray9x8, hammingDistance64 } from "../lib/sprite-pipeline/perceptual-duplicates";

const thresholds = {
  maxDHashDistance: 4,
  maxPHashDistance: 6,
  minSilhouetteSimilarity: 0.97,
  minPaletteSimilarity: 0.98,
};

test("computes deterministic 64-bit dHash values", () => {
  const gradient = Array.from({ length: 72 }, (_, index) => index % 9);
  const first = dHashFromGray9x8(gradient);
  const second = dHashFromGray9x8(gradient);
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{16}$/);
});

test("computes exact Hamming distance", () => {
  assert.equal(hammingDistance64("0000000000000000", "000000000000000f"), 4);
});

test("flags strong perceptual matches as duplicates", () => {
  const result = compareFingerprints(
    { assetId: "character-00001", dHash: "0000000000000000", pHash: "aaaaaaaaaaaaaaaa", silhouette: [1, 0.5, 0.25], palette: [0.8, 0.1, 0.1] },
    { assetId: "character-00002", dHash: "0000000000000003", pHash: "aaaaaaaaaaaaaaab", silhouette: [1, 0.5, 0.25], palette: [0.8, 0.1, 0.1] },
    thresholds,
  );
  assert.equal(result.duplicate, true);
  assert.ok(result.reasons.includes("dHash"));
  assert.ok(result.reasons.includes("pHash"));
});

test("does not flag visually distant assets", () => {
  const result = compareFingerprints(
    { assetId: "fx-00001", dHash: "0000000000000000", silhouette: [1, 0, 0], palette: [1, 0, 0] },
    { assetId: "fx-00002", dHash: "ffffffffffffffff", silhouette: [0, 1, 0], palette: [0, 0, 1] },
    thresholds,
  );
  assert.equal(result.duplicate, false);
});
