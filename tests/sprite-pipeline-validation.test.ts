import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeAssetPath,
  findDuplicateHashes,
  validateManifestRecord,
  validateSequenceCompleteness,
  type AssetManifestRecord,
} from "../lib/sprite-pipeline/validation";

function record(overrides: Partial<AssetManifestRecord> = {}): AssetManifestRecord {
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
    alphaBoundsNonEmpty: false,
    chromaPurity: 0.999,
    edgeContamination: 0.005,
    clippingScore: 0,
    textLogoDetected: false,
    likenessRisk: 0,
    ...overrides,
  };
}

test("accepts a valid chroma-key character manifest", () => {
  const result = validateManifestRecord(record());
  assert.equal(result.passed, true);
  assert.equal(result.failures.length, 0);
  assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
});

test("rejects false visual readiness claims", () => {
  const result = validateManifestRecord(
    record({
      chromaPurity: 0.9,
      edgeContamination: 0.2,
      clippingScore: 0.5,
      textLogoDetected: true,
      likenessRisk: 0.8,
    }),
  );
  assert.equal(result.passed, false);
  const controls = new Set(result.failures.map((failure) => failure.controlId));
  assert.equal(controls.has("CHROMA-PURITY"), true);
  assert.equal(controls.has("CHROMA-EDGE"), true);
  assert.equal(controls.has("VISUAL-CLIPPING"), true);
  assert.equal(controls.has("IP-TEXT-LOGO"), true);
  assert.equal(controls.has("IP-LIKENESS"), true);
});

test("transparent FX requires meaningful alpha", () => {
  const result = validateManifestRecord(
    record({
      assetId: "fx-00001",
      kind: "fx",
      filename: "fx-00001.png",
      relativePath: "fx/fx-00001.png",
      backgroundMode: "transparent",
      alphaPresent: false,
      alphaBoundsNonEmpty: false,
      chromaPurity: undefined,
      edgeContamination: undefined,
    }),
  );
  assert.equal(result.passed, false);
  assert.deepEqual(
    result.failures.map((failure) => failure.controlId).sort(),
    ["ALPHA-BOUNDS", "ALPHA-PRESENT"],
  );
});

test("path guard rejects traversal and allows rooted asset paths", () => {
  assert.throws(() => assertSafeAssetPath("/srv/assets", "../../etc/passwd"), /Unsafe|escapes/);
  assert.equal(
    assertSafeAssetPath("/srv/assets", "characters/character-00001.png"),
    "/srv/assets/characters/character-00001.png",
  );
});

test("exact duplicate hashes are grouped deterministically", () => {
  const duplicates = findDuplicateHashes([
    record({ assetId: "character-00002", filename: "character-00002.png", sha256: "b".repeat(64) }),
    record({ assetId: "character-00001", sha256: "b".repeat(64) }),
    record({ assetId: "character-00003", filename: "character-00003.png", sha256: "c".repeat(64) }),
  ]);
  assert.deepEqual(duplicates.get("b".repeat(64)), ["character-00001", "character-00002"]);
  assert.equal(duplicates.has("c".repeat(64)), false);
});

test("sequence completeness catches missing and duplicate indexes", () => {
  const frames = [
    record({
      assetId: "fx-00001",
      kind: "fx",
      filename: "fx-00001.png",
      sequenceId: "impact-1",
      sequenceIndex: 0,
      sequenceLength: 3,
    }),
    record({
      assetId: "fx-00002",
      kind: "fx",
      filename: "fx-00002.png",
      sequenceId: "impact-1",
      sequenceIndex: 0,
      sequenceLength: 3,
    }),
    record({
      assetId: "fx-00003",
      kind: "fx",
      filename: "fx-00003.png",
      sequenceId: "impact-1",
      sequenceIndex: 2,
      sequenceLength: 3,
    }),
  ];
  const failures = validateSequenceCompleteness(frames);
  const controls = failures.map((failure) => failure.controlId);
  assert.equal(controls.includes("SEQUENCE-MISSING-FRAME"), true);
  assert.equal(controls.includes("SEQUENCE-DUPLICATE-FRAME"), true);
});
