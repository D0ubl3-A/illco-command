import { createHash } from "node:crypto";
import { inspectPngBytes } from "./png-inspection";
import { decodePngPixels, analyzePixels } from "./png-pixels";
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

  if (!RENDERED_STATES.has(input.state)) {
    failures.push(`Asset state ${input.state} is not a rendered state`);
  }
  if (input.bytes.length === 0) failures.push("Rendered asset file is empty");
  if (input.registeredSha256 && input.registeredSha256 !== sha256) {
    failures.push("Registered SHA-256 does not match file bytes");
  }

  try {
    const inspection = inspectPngBytes(input.bytes);
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
    const metrics = analyzePixels(decoded);
    alphaCoverage = metrics.alphaCoverage;
    chromaPurity = metrics.chromaPurity;

    if (input.backgroundMode === "transparent") {
      if (!decoded.hasAlpha) failures.push("Transparent render has no alpha channel");
      if (metrics.alphaCoverage <= 0 || metrics.alphaCoverage >= 1) {
        failures.push("Transparent render must contain both transparent and visible pixels");
      }
    } else {
      if (metrics.chromaPurity < 0.985) failures.push("Chroma background purity is below 0.985");
      if (metrics.greenSpill > 0.025) failures.push("Green spill exceeds 0.025");
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  return { passed: failures.length === 0, failures, sha256, width, height, alphaCoverage, chromaPurity };
}
