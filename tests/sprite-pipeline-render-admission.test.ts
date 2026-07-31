import assert from "node:assert/strict";
import test from "node:test";
import {
  admitRenderedPng,
  validateRenderedPngForPromotion,
} from "../lib/sprite-pipeline/render-admission";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lc1ZAAAAAElFTkSuQmCC",
  "base64",
);

const manifestBase = {
  kind: "character" as const,
  filename: "character-00001.png",
  relativePath: "characters/character-00001.png",
  format: "png" as const,
  backgroundMode: "transparent" as const,
  textLogoDetected: false,
  likenessRisk: 0,
};

test("admits real decodable PNG bytes only as rendered_unvalidated", () => {
  const result = admitRenderedPng(
    "character-00001",
    PNG,
    "2026-07-31T04:00:00.000Z",
  );
  assert.equal(result.state, "rendered_unvalidated");
  assert.equal(result.width, 1);
  assert.equal(result.height, 1);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});

test("rejects missing or malformed render bytes", () => {
  assert.throws(
    () => admitRenderedPng("character-00001", new Uint8Array(), "2026-07-31T04:00:00.000Z"),
    /bytes are required/i,
  );
  assert.throws(
    () => admitRenderedPng("character-00001", new Uint8Array([1, 2, 3]), "2026-07-31T04:00:00.000Z"),
    /structural inspection/i,
  );
});

test("does not promote a structurally real but undersized PNG", () => {
  const admission = admitRenderedPng(
    "character-00001",
    PNG,
    "2026-07-31T04:00:00.000Z",
  );
  const result = validateRenderedPngForPromotion(admission, PNG, manifestBase);
  assert.equal(result.state, "rendered_unvalidated");
  assert.equal(result.validation.passed, false);
  assert.match(result.validation.failures.map((failure) => failure.controlId).join(" "), /FILE-WIDTH/);
  assert.match(result.validation.failures.map((failure) => failure.controlId).join(" "), /FILE-HEIGHT/);
});

test("detects post-admission byte tampering", () => {
  const admission = admitRenderedPng(
    "character-00001",
    PNG,
    "2026-07-31T04:00:00.000Z",
  );
  const changed = Buffer.from(PNG);
  changed[changed.length - 1] ^= 1;
  assert.throws(
    () => validateRenderedPngForPromotion(admission, changed, manifestBase),
    /changed after admission/i,
  );
});
