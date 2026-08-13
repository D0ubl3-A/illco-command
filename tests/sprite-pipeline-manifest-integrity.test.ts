import assert from "node:assert/strict";
import test from "node:test";
import { signManifest, validateManifest, type SpriteManifest } from "../lib/sprite-pipeline/manifest-integrity";

const SHA = "a".repeat(64);
const OP = "b".repeat(64);

function manifest(): SpriteManifest {
  return signManifest({
    assetId: "character-00001", assetVersion: 1, themeId: "clay-brawl", themeVersion: "1.0.0", runId: "run-001", operationKey: OP, surgeonId: 1, lane: "character", ownershipRange: [1, 20], category: "fighter", subcategory: "heavyweight", bibleId: "bible-001", bibleVersion: 1, action: "idle", facing: "right", leadHand: "right", leadLeg: "right", propHand: "none", mobilitySide: "none", mirrorRule: "no-mirror", camera: "orthographic", framing: "full-body", expression: "focused", phase: "hold", variation: "base", intendedUse: "gameplay", tags: ["fighter", "idle"], filename: "character-00001.png", relativePath: "characters/character-00001.png", contentPath: `objects/${SHA.slice(0, 2)}/${SHA}.png`, prompt: "original fictional clay fighter", negativePrompt: "logos, text, real person", provider: "renderer", model: "model", modelVersion: "1", parameters: { seed: 1 }, width: 1024, height: 1024, format: "png", colorMode: "RGBA", backgroundMode: "chroma", alphaMode: "none", premultiplied: false, chromaScore: 0.999, edgeScore: 0.99, clippingScore: 0, silhouetteScore: 0.95, textLogoDetected: false, likenessRisk: 0.02, sha256: SHA, dHash: "0".repeat(16), duplicateDecision: "clear", fileValidationEvidence: "evidence/file.json", continuityPointer: "character-00002", status: "validated", createdAt: "2026-07-30T17:00:00.000Z", updatedAt: "2026-07-30T17:01:00.000Z", retryCount: 0, packageIds: [], evidencePaths: ["evidence/file.json"]
  });
}

function resign(value: SpriteManifest): void {
  const { manifestSha256: _discarded, ...unsigned } = value;
  value.manifestSha256 = signManifest(unsigned).manifestSha256;
}

test("accepts a complete signed sprite manifest", () => {
  const result = validateManifest(manifest());
  assert.equal(result.passed, true, result.failures.join("\n"));
});

test("detects manifest tampering", () => {
  const value = manifest();
  value.status = "published";
  const result = validateManifest(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /hash mismatch/);
});

test("rejects cross-range ownership and path escape", () => {
  const value = manifest();
  value.ownershipRange = [21, 40];
  value.relativePath = "../escape.png";
  resign(value);
  const result = validateManifest(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /ownership range/);
  assert.match(result.failures.join("\n"), /unsafe manifest path/);
});

test("requires complete sequence metadata and controlled duplicate exceptions", () => {
  const value = manifest();
  value.sequenceId = "seq-1";
  value.duplicateDecision = "exception";
  resign(value);
  const result = validateManifest(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /sequence metadata/);
  assert.match(result.failures.join("\n"), /exception ID/);
});

test("returns controlled failures for missing persisted manifest arrays", () => {
  for (const field of ["tags", "packageIds", "evidencePaths"] as const) {
    const value = manifest() as SpriteManifest & Record<string, unknown>;
    delete value[field];
    resign(value as SpriteManifest);
    const result = validateManifest(value as SpriteManifest);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /missing|malformed|invalid/i);
  }
});

test("rejects malformed array values without throwing", () => {
  const value = manifest() as SpriteManifest & Record<string, unknown>;
  value.tags = ["fighter", ""];
  value.packageIds = ["package-1", "package-1"];
  value.evidencePaths = ["../escape.json"];
  resign(value as SpriteManifest);
  const result = validateManifest(value as SpriteManifest);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /tags/);
  assert.match(result.failures.join("\n"), /package IDs/);
  assert.match(result.failures.join("\n"), /evidence paths/);
});