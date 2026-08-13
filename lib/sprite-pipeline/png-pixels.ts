import { inflateSync } from "node:zlib";
import { inspectPng } from "./png-inspection";

export type DecodedPng = {
  width: number;
  height: number;
  channels: 3 | 4;
  pixels: Uint8Array;
};

export type PixelMetrics = {
  totalPixels: number;
  transparentPixels: number;
  opaquePixels: number;
  alphaBoundsNonEmpty: boolean;
  alphaCoverage: number;
  chromaPurity: number;
  chromaSpill: number;
  edgeContamination: number;
  clippingScore: number;
};

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePngPixels(bytes: Uint8Array): DecodedPng {
  const inspection = inspectPng(bytes);
  if (!inspection.passed) throw new Error(`PNG inspection failed: ${inspection.failures.join("; ")}`);
  if (inspection.interlaced) throw new Error("Interlaced PNG decoding is not supported");
  if (inspection.bitDepth !== 8) throw new Error(`Only 8-bit PNGs are supported, received ${inspection.bitDepth}`);
  if (inspection.colorType !== 2 && inspection.colorType !== 6) {
    throw new Error(`Only RGB and RGBA PNGs are supported, received color type ${inspection.colorType}`);
  }

  const data = Buffer.from(bytes);
  const idat: Buffer[] = [];
  let hasTransparencyChunk = false;
  let offset = 8;
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + length;
    if (payloadEnd + 4 > data.length) throw new Error(`Truncated PNG chunk ${type}`);
    if (type === "IDAT") idat.push(data.subarray(payloadStart, payloadEnd));
    if (type === "tRNS") hasTransparencyChunk = true;
    offset = payloadEnd + 4;
    if (type === "IEND") break;
  }

  if (inspection.colorType === 2 && hasTransparencyChunk) {
    throw new Error("RGB PNGs using tRNS transparency are not supported; convert to RGBA before validation");
  }

  const channels = inspection.colorType === 6 ? 4 : 3;
  const rowBytes = inspection.width * channels;
  const expected = inspection.height * (rowBytes + 1);
  if (!Number.isSafeInteger(expected) || expected <= 0) {
    throw new Error("Decoded PNG size exceeds safe integer limits");
  }
  const inflated = inflateSync(Buffer.concat(idat), { maxOutputLength: expected });
  if (inflated.length !== expected) {
    throw new Error(`Unexpected inflated PNG size: expected ${expected}, received ${inflated.length}`);
  }

  const pixels = new Uint8Array(inspection.width * inspection.height * channels);
  let src = 0;
  for (let y = 0; y < inspection.height; y++) {
    const filter = inflated[src++];
    if (filter > 4) throw new Error(`Unsupported PNG filter type: ${filter}`);
    const rowStart = y * rowBytes;
    const priorStart = (y - 1) * rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const raw = inflated[src++];
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const up = y > 0 ? pixels[priorStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[priorStart + x - channels] : 0;
      let value = raw;
      if (filter === 1) value = (raw + left) & 255;
      else if (filter === 2) value = (raw + up) & 255;
      else if (filter === 3) value = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (raw + paeth(left, up, upLeft)) & 255;
      pixels[rowStart + x] = value;
    }
  }

  return { width: inspection.width, height: inspection.height, channels, pixels };
}

function isNearGreen(r: number, g: number, b: number, tolerance: number): boolean {
  return r <= tolerance && g >= 255 - tolerance && b <= tolerance;
}

export function measurePixelMetrics(image: DecodedPng, chromaTolerance = 8): PixelMetrics {
  if (!Number.isInteger(chromaTolerance) || chromaTolerance < 0 || chromaTolerance > 64) {
    throw new RangeError("chromaTolerance must be an integer from 0 through 64");
  }
  const totalPixels = image.width * image.height;
  if (image.pixels.length !== totalPixels * image.channels) throw new Error("Pixel buffer length does not match dimensions");

  let transparentPixels = 0;
  let opaquePixels = 0;
  let chromaPixels = 0;
  let spillPixels = 0;
  let edgePixels = 0;
  let contaminatedEdges = 0;
  let clipped = 0;

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * image.channels;
      const r = image.pixels[i];
      const g = image.pixels[i + 1];
      const b = image.pixels[i + 2];
      const a = image.channels === 4 ? image.pixels[i + 3] : 255;
      if (a === 0) transparentPixels++;
      else opaquePixels++;
      if (isNearGreen(r, g, b, chromaTolerance)) chromaPixels++;
      else if (g > r * 1.35 && g > b * 1.35 && g > 80) spillPixels++;
      if (x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1) {
        edgePixels++;
        if (a > 0 && !isNearGreen(r, g, b, chromaTolerance)) contaminatedEdges++;
        if (a > 0) clipped++;
      }
    }
  }

  return {
    totalPixels,
    transparentPixels,
    opaquePixels,
    alphaBoundsNonEmpty: opaquePixels > 0,
    alphaCoverage: totalPixels === 0 ? 0 : opaquePixels / totalPixels,
    chromaPurity: totalPixels === 0 ? 0 : chromaPixels / totalPixels,
    chromaSpill: totalPixels === 0 ? 0 : spillPixels / totalPixels,
    edgeContamination: edgePixels === 0 ? 0 : contaminatedEdges / edgePixels,
    clippingScore: edgePixels === 0 ? 0 : clipped / edgePixels,
  };
}
