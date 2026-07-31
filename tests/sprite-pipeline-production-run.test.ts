import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeProductionRun } from "../lib/sprite-pipeline/production-run";
import { decodePngPixels, measurePixelMetrics } from "../lib/sprite-pipeline/png-pixels";
import { renderSprite } from "../lib/sprite-pipeline/procedural-renderer";

const characterRequest = {
  assetId: "character-00001",
  kind: "character" as const,
  seed: 101,
  phase: "contact",
  cameraAngle: "three-quarter-left",
  primary: [175, 42, 76] as [number, number, number],
  secondary: [32, 45, 90] as [number, number, number],
};

const fxRequest = {
  assetId: "fx-00001",
  kind: "fx" as const,
  seed: 202,
  phase: "contact",
  cameraAngle: "front",
  primary: [255, 156, 32] as [number, number, number],
  secondary: [255, 244, 180] as [number, number, number],
};

test("renders deterministic real PNG character and FX bytes", () => {
  const first = renderSprite(characterRequest);
  const second = renderSprite(characterRequest);
  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.bytes[0], 137);
  assert.equal(first.bytes[1], 80);
  const decoded = decodePngPixels(first.bytes);
  const metrics = measurePixelMetrics(decoded);
  assert.equal(decoded.width, 256);
  assert.equal(decoded.height, 256);
  assert.equal(decoded.channels, 4);
  assert.ok(metrics.chromaPurity > 0.55);
  assert.equal(metrics.edgeContamination, 0);
  assert.equal(metrics.clippingScore, 1);
});

test("executes real generation validation content storage and evidence loop", async () => {
  const root = await mkdtemp(join(tmpdir(), "sprite-production-"));
  try {
    const result = await executeProductionRun(root, "run-real-001", [characterRequest, fxRequest]);
    assert.equal(result.generated, 2);
    assert.equal(result.renderedUnvalidated, 0);
    assert.equal(result.validated, 2);
    assert.equal(result.rejected, 0);
    assert.equal(result.continuityPointer, "character-00002");

    for (const asset of result.assets) {
      assert.equal(asset.state, "validated");
      assert.equal((await stat(asset.path)).isFile(), true);
      assert.equal((await stat(asset.evidencePath)).isFile(), true);
      const bytes = await readFile(asset.path);
      assert.equal(bytes.length > 100, true);
      const decoded = decodePngPixels(bytes);
      assert.equal(decoded.width, 256);
      const evidence = JSON.parse(await readFile(asset.evidencePath, "utf8")) as { assetId: string; state: string; sha256: string };
      assert.equal(evidence.assetId, asset.assetId);
      assert.equal(evidence.state, "validated");
      assert.equal(evidence.sha256, asset.sha256);
    }

    const character = result.assets.find((asset) => asset.kind === "character");
    const fx = result.assets.find((asset) => asset.kind === "fx");
    assert.ok(character);
    assert.ok(fx);
    assert.ok(character.metrics.chromaPurity > 0.55);
    assert.equal(character.metrics.edgeContamination, 0);
    assert.ok(fx.metrics.transparentPixels > 0);
    assert.ok(fx.metrics.alphaCoverage > 0);
    assert.ok(fx.metrics.alphaCoverage < 0.8);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects duplicate production IDs before writing a false second result", async () => {
  const root = await mkdtemp(join(tmpdir(), "sprite-production-duplicate-"));
  try {
    await assert.rejects(
      executeProductionRun(root, "run-real-duplicate", [characterRequest, characterRequest]),
      /Duplicate production asset ID/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
