import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { verifyRenderedAsset } from "../lib/sprite-pipeline/render-truth-gate";

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

function rgbaPng(width: number, height: number, pixels: number[]): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines: number[] = [];
  for (let y = 0; y < height; y++) scanlines.push(0, ...pixels.slice(y * width * 4, (y + 1) * width * 4));
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.from(scanlines))), chunk("IEND", Buffer.alloc(0))]);
}

function transparentSprite(): Buffer {
  const pixels: number[] = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    const center = x === 1 && y === 1;
    pixels.push(center ? 200 : 0, center ? 80 : 0, center ? 40 : 0, center ? 255 : 0);
  }
  return rgbaPng(3, 3, pixels);
}

test("accepts a real rendered_unvalidated transparent PNG with matching bytes", () => {
  const bytes = transparentSprite();
  const result = verifyRenderedAsset({
    assetId: "fx-00001",
    state: "rendered_unvalidated",
    bytes,
    registeredSha256: createHash("sha256").update(bytes).digest("hex"),
    expectedWidth: 3,
    expectedHeight: 3,
    backgroundMode: "transparent",
  });
  assert.equal(result.passed, true, result.failures.join("\n"));
  assert.equal(result.alphaCoverage, 1 / 9);
});

test("rejects queued claims, hash mismatches, and corrupt files", () => {
  const bytes = transparentSprite();
  const queued = verifyRenderedAsset({ assetId: "fx-00001", state: "queued", bytes, backgroundMode: "transparent" });
  assert.equal(queued.passed, false);
  assert.match(queued.failures.join("\n"), /not rendered/i);

  const mismatched = verifyRenderedAsset({ assetId: "fx-00001", state: "rendered_unvalidated", bytes, registeredSha256: "0".repeat(64), backgroundMode: "transparent" });
  assert.equal(mismatched.passed, false);
  assert.match(mismatched.failures.join("\n"), /does not match/i);

  const corrupt = verifyRenderedAsset({ assetId: "fx-00001", state: "rendered_unvalidated", bytes: Buffer.from("not png"), backgroundMode: "transparent" });
  assert.equal(corrupt.passed, false);
  assert.match(corrupt.failures.join("\n"), /png/i);
});
