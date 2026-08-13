export type PerceptualFingerprint = {
  assetId: string;
  dHash: string;
  pHash?: string;
  silhouette?: number[];
  palette?: number[];
};

export type DuplicateThresholds = {
  maxDHashDistance: number;
  maxPHashDistance: number;
  minSilhouetteSimilarity: number;
  minPaletteSimilarity: number;
};

export type DuplicateDecision = {
  duplicate: boolean;
  reasons: string[];
  dHashDistance: number;
  pHashDistance?: number;
  silhouetteSimilarity?: number;
  paletteSimilarity?: number;
};

const HEX64 = /^[a-f0-9]{16}$/i;

export function hammingDistance64(left: string, right: string): number {
  if (!HEX64.test(left) || !HEX64.test(right)) throw new Error("Hashes must be 64-bit hexadecimal values");
  let value = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (value) {
    distance += Number(value & 1n);
    value >>= 1n;
  }
  return distance;
}

export function dHashFromGray9x8(gray: readonly number[]): string {
  if (gray.length !== 72) throw new Error("dHash input must contain a 9x8 grayscale sample");
  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = gray[y * 9 + x];
      const right = gray[y * 9 + x + 1];
      if (![left, right].every((value) => Number.isFinite(value) && value >= 0 && value <= 255)) {
        throw new Error("Grayscale samples must be finite values from 0 through 255");
      }
      bits = (bits << 1n) | BigInt(left > right ? 1 : 0);
    }
  }
  return bits.toString(16).padStart(16, "0");
}

function cosine(left?: number[], right?: number[]): number | undefined {
  if (!left || !right) return undefined;
  if (left.length === 0 || left.length !== right.length) throw new Error("Similarity vectors must have equal nonzero length");
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i++) {
    if (!Number.isFinite(left[i]) || !Number.isFinite(right[i])) throw new Error("Similarity vectors must be finite");
    dot += left[i] * right[i];
    leftNorm += left[i] ** 2;
    rightNorm += right[i] ** 2;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

export function compareFingerprints(
  left: PerceptualFingerprint,
  right: PerceptualFingerprint,
  thresholds: DuplicateThresholds,
): DuplicateDecision {
  if (left.assetId === right.assetId) throw new Error("Cannot compare an asset fingerprint to itself");
  const dHashDistance = hammingDistance64(left.dHash, right.dHash);
  const pHashDistance = left.pHash && right.pHash ? hammingDistance64(left.pHash, right.pHash) : undefined;
  const silhouetteSimilarity = cosine(left.silhouette, right.silhouette);
  const paletteSimilarity = cosine(left.palette, right.palette);
  const reasons: string[] = [];
  if (dHashDistance <= thresholds.maxDHashDistance) reasons.push("dHash");
  if (pHashDistance !== undefined && pHashDistance <= thresholds.maxPHashDistance) reasons.push("pHash");
  if (silhouetteSimilarity !== undefined && silhouetteSimilarity >= thresholds.minSilhouetteSimilarity) reasons.push("silhouette");
  if (paletteSimilarity !== undefined && paletteSimilarity >= thresholds.minPaletteSimilarity) reasons.push("palette");
  const strongHashMatch = reasons.includes("dHash") && (pHashDistance === undefined || reasons.includes("pHash"));
  const shapeAndPaletteMatch = reasons.includes("silhouette") && reasons.includes("palette");
  return { duplicate: strongHashMatch || shapeAndPaletteMatch, reasons, dHashDistance, pHashDistance, silhouetteSimilarity, paletteSimilarity };
}
