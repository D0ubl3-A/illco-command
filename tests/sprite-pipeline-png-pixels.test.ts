import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { decodePngPixels, measurePixelMetrics } from "../lib/sprite-pipeline/png-pixels";

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
  assert.equal(pixels.length, width * height * 4);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines: number[] = [];
  for (let y = 0; y < height; y++) {
    scanlines.push(0, ...pixels.slice(y * width * 4, (y + 1) * width * 4));
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.from(scanlines))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("decodes real RGBA PNG pixels", () => {
  const png = rgbaPng(2, 1, [0, 255, 0, 255, 255, 0, 0, 128]);
  const decoded = decodePngPixels(png);
  assert.equal(decoded.width, 2);
  assert.equal(decoded.height, 1);
  assert.equal(decoded.channels, 4);
  assert.deepEqual([...decoded.pixels], [0, 255, 0, 255, 255, 0, 0, 128]);
});

test("measures chroma, alpha, spill, edge contamination, and clipping from pixels", () => {
  const decoded = decodePngPixels(rgbaPng(2, 2, [
    0, 255, 0, 255,
    0, 200, 20, 255,
    0, 0, 0, 0,
    255, 0, 0, 255,
  ]));
  const metrics = measurePixelMetrics(decoded, 8);
  assert.equal(metrics.totalPixels, 4);
  assert.equal(metrics.transparentPixels, 1);
  assert.equal(metrics.opaquePixels, 3);
  assert.equal(metrics.alphaBoundsNonEmpty, true);
  assert.equal(metrics.alphaCoverage, 0.75);
  assert.equal(metrics.chromaPurity, 0.25);
  assert.equal(metrics.chromaSpill, 0.25);
  assert.equal(metrics.edgeContamination, 0.5);
  assert.equal(metrics.clippingScore, 0.75);
});

test("rejects unsupported bit depths and malformed pixel buffers", () => {
  const decoded = decodePngPixels(rgbaPng(1, 1, [0, 255, 0, 255]));
  assert.throws(
    () => measurePixelMetrics({ ...decoded, pixels: new Uint8Array(3) }),
    /length does not match/i,
  );
  assert.throws(() => measurePixelMetrics(decoded, 65), /0 through 64/i);
});
