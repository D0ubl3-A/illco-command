import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

export type RenderKind = "character" | "fx";

export type RenderRequest = {
  assetId: string;
  kind: RenderKind;
  width?: number;
  height?: number;
  seed: number;
  phase: string;
  cameraAngle: string;
  primary: [number, number, number];
  secondary: [number, number, number];
};

export type RenderedSprite = {
  assetId: string;
  kind: RenderKind;
  width: number;
  height: number;
  bytes: Uint8Array;
  sha256: string;
  backgroundMode: "chroma" | "transparent";
  renderer: "illco-procedural-clay-v1";
};

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, payload: Uint8Array): Uint8Array {
  const typeBytes = Buffer.from(type, "ascii");
  const out = Buffer.alloc(12 + payload.length);
  out.writeUInt32BE(payload.length, 0);
  typeBytes.copy(out, 4);
  Buffer.from(payload).copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBytes, Buffer.from(payload)])), 8 + payload.length);
  return out;
}

function encodeRgbaPng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) throw new Error("RGBA buffer length mismatch");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const target = y * (width * 4 + 1);
    scanlines[target] = 0;
    Buffer.from(rgba.subarray(y * width * 4, (y + 1) * width * 4)).copy(scanlines, target + 1);
  }
  return Buffer.concat([
    Buffer.from(PNG_SIGNATURE),
    Buffer.from(chunk("IHDR", ihdr)),
    Buffer.from(chunk("IDAT", deflateSync(scanlines, { level: 9 }))),
    Buffer.from(chunk("IEND", new Uint8Array())),
  ]);
}

function rng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function putPixel(buffer: Uint8Array, width: number, height: number, x: number, y: number, color: [number, number, number, number]): void {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = (y * width + x) * 4;
  buffer[i] = color[0];
  buffer[i + 1] = color[1];
  buffer[i + 2] = color[2];
  buffer[i + 3] = color[3];
}

function ellipse(buffer: Uint8Array, width: number, height: number, cx: number, cy: number, rx: number, ry: number, color: [number, number, number, number], noise: () => number): void {
  const minX = Math.max(0, Math.floor(cx - rx));
  const maxX = Math.min(width - 1, Math.ceil(cx + rx));
  const minY = Math.max(0, Math.floor(cy - ry));
  const maxY = Math.min(height - 1, Math.ceil(cy + ry));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        const texture = Math.round((noise() - 0.5) * 14);
        putPixel(buffer, width, height, x, y, [
          Math.max(0, Math.min(255, color[0] + texture)),
          Math.max(0, Math.min(255, color[1] + texture)),
          Math.max(0, Math.min(255, color[2] + texture)),
          color[3],
        ]);
      }
    }
  }
}

function line(buffer: Uint8Array, width: number, height: number, x0: number, y0: number, x1: number, y1: number, radius: number, color: [number, number, number, number], noise: () => number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ellipse(buffer, width, height, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, radius, color, noise);
  }
}

function renderCharacter(req: RenderRequest, width: number, height: number, pixels: Uint8Array, random: () => number): void {
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = 0;
    pixels[i * 4 + 1] = 255;
    pixels[i * 4 + 2] = 0;
    pixels[i * 4 + 3] = 255;
  }
  const cx = Math.floor(width / 2);
  const headY = Math.floor(height * 0.24);
  const torsoY = Math.floor(height * 0.49);
  const skin: [number, number, number, number] = [218, 156, 118, 255];
  const primary: [number, number, number, number] = [...req.primary, 255];
  const secondary: [number, number, number, number] = [...req.secondary, 255];
  const lean = req.phase.includes("contact") ? Math.floor(width * 0.06) : req.phase.includes("recovery") ? -Math.floor(width * 0.03) : 0;
  ellipse(pixels, width, height, cx + lean, headY, width * 0.105, height * 0.095, skin, random);
  ellipse(pixels, width, height, cx + lean, headY - height * 0.055, width * 0.112, height * 0.05, secondary, random);
  ellipse(pixels, width, height, cx + lean, torsoY, width * 0.15, height * 0.19, primary, random);
  line(pixels, width, height, cx - width * 0.09 + lean, height * 0.42, cx - width * 0.2, height * 0.63, width * 0.035, skin, random);
  line(pixels, width, height, cx + width * 0.09 + lean, height * 0.42, cx + width * (req.phase.includes("contact") ? 0.31 : 0.2), height * (req.phase.includes("contact") ? 0.39 : 0.63), width * 0.035, skin, random);
  line(pixels, width, height, cx - width * 0.07, height * 0.63, cx - width * 0.1, height * 0.86, width * 0.045, primary, random);
  line(pixels, width, height, cx + width * 0.07, height * 0.63, cx + width * 0.1, height * 0.86, width * 0.045, primary, random);
  ellipse(pixels, width, height, cx - width * 0.12, height * 0.88, width * 0.075, height * 0.025, secondary, random);
  ellipse(pixels, width, height, cx + width * 0.12, height * 0.88, width * 0.075, height * 0.025, secondary, random);
  ellipse(pixels, width, height, cx - width * 0.035 + lean, headY, 2, 2, [25, 20, 20, 255], random);
  ellipse(pixels, width, height, cx + width * 0.035 + lean, headY, 2, 2, [25, 20, 20, 255], random);
}

function renderFx(req: RenderRequest, width: number, height: number, pixels: Uint8Array, random: () => number): void {
  pixels.fill(0);
  const cx = width / 2;
  const cy = height / 2;
  const outer: [number, number, number, number] = [...req.primary, 235];
  const inner: [number, number, number, number] = [...req.secondary, 255];
  const points = 16;
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points;
    const radius = i % 2 === 0 ? width * 0.34 : width * 0.17;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    line(pixels, width, height, cx, cy, x, y, Math.max(2, width * 0.018), outer, random);
  }
  ellipse(pixels, width, height, cx, cy, width * 0.13, height * 0.13, inner, random);
}

export function renderSprite(request: RenderRequest): RenderedSprite {
  if (!request.assetId.trim()) throw new Error("assetId is required");
  if (!Number.isInteger(request.seed)) throw new Error("seed must be an integer");
  const width = request.width ?? 256;
  const height = request.height ?? 256;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 128 || height < 128 || width > 2048 || height > 2048) {
    throw new RangeError("width and height must be integers from 128 through 2048");
  }
  const pixels = new Uint8Array(width * height * 4);
  const random = rng(request.seed);
  if (request.kind === "character") renderCharacter(request, width, height, pixels, random);
  else renderFx(request, width, height, pixels, random);
  const bytes = encodeRgbaPng(width, height, pixels);
  return {
    assetId: request.assetId,
    kind: request.kind,
    width,
    height,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    backgroundMode: request.kind === "character" ? "chroma" : "transparent",
    renderer: "illco-procedural-clay-v1",
  };
}
