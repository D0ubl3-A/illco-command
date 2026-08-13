import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import {
  admitRenderedPng,
  validateRenderedPngForPromotion,
} from "../lib/sprite-pipeline/render-admission";

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, payload: Buffer): Buffer {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, payload])));
  return Buffer.concat([length, name, payload, crc]);
}

function rgbaPng(width: number, height: number, rgba: [number, number, number, number]): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines: number[] = [];
  for (let y = 0; y < height; y++) {
    scanlines.push(0);
    for (let x = 0; x < width; x++) scanlines.push(...rgba);
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.from(scanlines))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const PNG = rgbaPng(1, 1, [0, 255, 0, 255]);

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
