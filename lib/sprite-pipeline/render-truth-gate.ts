import { createHash } from "node:crypto";
import { inspectPng } from "./png-inspection";
import { decodePngPixels, measurePixelMetrics } from "./png-pixels";
import type { AssetState } from "./state-machine";

export type RenderTruthInput = {
  assetId: string;
  state: AssetState;
  bytes: Buffer;
  registeredSha256?: string;
  expectedWidth?: number;
  expectedHeight?: number;
  backgroundMode: "chroma" | "transparent";
};

export type RenderTruthResult = {
  passed: boolean;
  failures: string[];
  sha256: string;
  width: number | null;
  height: number | null;
  alphaCoverage: number | null;
  chromaPurity: number | null;
};

const RENDERED_STATES = new Set<AssetState>([
  "rendered_unvalidated",
  "validated",
  "packaged",
  "published",
]);

export function verifyRenderedAsset(input: RenderTruthInput): RenderTruthResult {
  const failures: string[] = [];
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  let width: number | null = null;
  let height: number | null = null;
  let alphaCoverage: number | null = null;
  let chromaPurity: number | null = null;

  if (!input.assetId.trim()) failures.push("assetId is required");
  if (!RENDERED_STATES.has(input.state)) failures.push(`Asset state ${input.state} is not rendered`);
  if (input.bytes.length === 0) failures.push("Rendered asset file is empty");
  if (input.registeredSha256 && input.registeredSha256 !== sha256) {
    failures.push("Registered SHA-256 does not match file bytes");
  }

  try {
    const inspection = inspectPng(input.bytes);
    if (!inspection.passed) failures.push(...inspection.failures);
    width = inspection.width;
    height = inspection.height;
    if (input.expectedWidth !== undefined && width !== input.expectedWidth) {
      failures.push(`PNG width ${width} does not match expected ${input.expectedWidth}`);
    }
    if (input.expectedHeight !== undefined && height !== input.expectedHeight) {
      failures.push(`PNG height ${height} does not match expected ${input.expectedHeight}`);
    }

    const decoded = decodePngPixels(input.bytes);
    const metrics = measurePixelMetrics(decoded);
    alphaCoverage = metrics.alphaCoverage;
    chromaPurity = metrics.chromaPurity;

    if (input.backgroundMode === "transparent") {
      if (decoded.channels !== 4) failures.push("Transparent render has no alpha channel");
      if (!metrics.alphaBoundsNonEmpty) failures.push("Transparent render has empty alpha bounds");
      if (metrics.alphaCoverage <= 0 || metrics.alphaCoverage >= 1) {
        failures.push("Transparent render must contain transparent and visible pixels");
      }
      if (metrics.clippingScore > 0.01) failures.push("Transparent render clipping exceeds 0.01");
    } else {
      if (metrics.chromaPurity < 0.985) failures.push("Chroma background purity is below 0.985");
      if (metrics.chromaSpill > 0.025) failures.push("Chroma spill exceeds 0.025");
      if (metrics.edgeContamination > 0.025) failures.push("Chroma edge contamination exceeds 0.025");
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  return { passed: failures.length === 0, failures, sha256, width, height, alphaCoverage, chromaPurity };
}
