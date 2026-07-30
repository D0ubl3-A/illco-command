import { createHash } from "node:crypto";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export type PngInspection = {
  passed: boolean;
  failures: string[];
  sha256: string;
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  hasAlpha: boolean;
  interlaced: boolean;
  idatBytes: number;
};

export function inspectPng(bytes: Uint8Array): PngInspection {
  const data = Buffer.from(bytes);
  const failures: string[] = [];
  const sha256 = createHash("sha256").update(data).digest("hex");
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlaced = false;
  let idatBytes = 0;
  let sawIhdr = false;
  let sawIend = false;

  if (data.length < 33 || !data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    failures.push("Invalid PNG signature or truncated file");
    return { passed: false, failures, sha256, width, height, bitDepth, colorType, hasAlpha: false, interlaced, idatBytes };
  }

  let offset = 8;
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > data.length) {
      failures.push(`Truncated PNG chunk: ${type}`);
      break;
    }
    const payload = data.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      if (sawIhdr || offset !== 8 || length !== 13) failures.push("Invalid IHDR placement or size");
      sawIhdr = true;
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      bitDepth = payload[8];
      colorType = payload[9];
      interlaced = payload[12] === 1;
      if (width < 1 || height < 1) failures.push("PNG dimensions must be positive");
      if (![0, 2, 3, 4, 6].includes(colorType)) failures.push(`Unsupported PNG color type: ${colorType}`);
      if (![1, 2, 4, 8, 16].includes(bitDepth)) failures.push(`Unsupported PNG bit depth: ${bitDepth}`);
    } else if (type === "IDAT") {
      idatBytes += length;
    } else if (type === "IEND") {
      sawIend = true;
      if (length !== 0) failures.push("IEND must be empty");
      if (chunkEnd !== data.length) failures.push("Trailing bytes after IEND");
      break;
    }
    offset = chunkEnd;
  }

  if (!sawIhdr) failures.push("Missing IHDR chunk");
  if (idatBytes === 0) failures.push("Missing image data");
  if (!sawIend) failures.push("Missing IEND chunk");
  const hasAlpha = colorType === 4 || colorType === 6;
  return { passed: failures.length === 0, failures, sha256, width, height, bitDepth, colorType, hasAlpha, interlaced, idatBytes };
}
