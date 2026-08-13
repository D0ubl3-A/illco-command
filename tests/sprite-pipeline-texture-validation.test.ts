import assert from "node:assert/strict";
import test from "node:test";
import { validateTexture, type TextureValidationInput } from "../lib/sprite-pipeline/texture-validation";

function validTexture(): TextureValidationInput {
  return {
    assetId: "texture-00001",
    usage: "arena floor clay surface",
    surface: "sealed sculpting clay",
    tileable: true,
    tileAxes: ["x", "y"],
    worldScaleMeters: 2,
    width: 2048,
    height: 2048,
    colorSpace: "srgb",
    damageLevel: 0.25,
    textureClass: "full-surface",
    seamErrorX: 0.005,
    seamErrorY: 0.008,
    edgeWrapPassedX: true,
    edgeWrapPassedY: true,
    mapSuitability: { albedo: true, normal: true, roughness: true, metallic: false, height: true },
    repetitionScore: 0.12,
    evidencePath: "evidence/run-001/texture-00001.json",
    evidenceSha256: "a".repeat(64),
  };
}

test("accepts a complete evidence-backed tileable texture", () => {
  const result = validateTexture(validTexture());
  assert.equal(result.passed, true, result.failures.map((item) => item.message).join("\n"));
});

test("rejects unresolved seams and repetition", () => {
  const value = validTexture();
  value.seamErrorX = 0.1;
  value.edgeWrapPassedY = false;
  value.repetitionScore = 0.8;
  const result = validateTexture(value);
  assert.equal(result.passed, false);
  const controls = result.failures.map((item) => item.controlId);
  assert.ok(controls.includes("TEXTURE-SEAM-X"));
  assert.ok(controls.includes("TEXTURE-WRAP-Y"));
  assert.ok(controls.includes("TEXTURE-REPETITION"));
});

test("rejects contradictory tiling declarations", () => {
  const value = validTexture();
  value.tileable = false;
  const result = validateTexture(value);
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((item) => item.controlId === "TEXTURE-TILE-DECLARATION"));
});

test("rejects unsafe or unverifiable evidence", () => {
  const value = validTexture();
  value.evidencePath = "../escape.json";
  value.evidenceSha256 = "bad";
  const result = validateTexture(value);
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((item) => item.controlId === "TEXTURE-EVIDENCE-PATH"));
  assert.ok(result.failures.some((item) => item.controlId === "TEXTURE-EVIDENCE-HASH"));
});

test("requires full-surface albedo suitability", () => {
  const value = validTexture();
  value.mapSuitability.albedo = false;
  const result = validateTexture(value);
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((item) => item.controlId === "TEXTURE-MAP-ALBEDO"));
});
