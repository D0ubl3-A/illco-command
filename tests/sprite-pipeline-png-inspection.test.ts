import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { inspectPng } from "../lib/sprite-pipeline/png-inspection";

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

function rgbaPng(): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = deflateSync(Buffer.from([0, 255, 0, 0, 255]));
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

test("inspects actual PNG bytes and detects alpha", () => {
  const result = inspectPng(rgbaPng());
  assert.equal(result.passed, true, result.failures.join("\n"));
  assert.equal(result.width, 1);
  assert.equal(result.height, 1);
  assert.equal(result.hasAlpha, true);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});

test("rejects truncated or forged PNG data", () => {
  const result = inspectPng(rgbaPng().subarray(0, 30));
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /truncated|missing/i);
});

test("returns failures instead of throwing for a short IHDR payload", () => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const malformed = Buffer.concat([
    signature,
    chunk("IHDR", Buffer.from([0, 0, 1])),
    chunk("IDAT", Buffer.from([1])),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  const result = inspectPng(malformed);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /IHDR placement or size/i);
});

test("rejects non-PNG bytes", () => {
  const result = inspectPng(Buffer.from("not a png"));
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /signature/i);
});
