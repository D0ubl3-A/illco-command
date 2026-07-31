import { createHash } from "node:crypto";
import { decodePngPixels, measurePixelMetrics } from "./png-pixels";
import { inspectPng } from "./png-inspection";
import {
  validateManifestRecord,
  type AssetManifestRecord,
  type ValidationResult,
  type ValidationThresholds,
} from "./validation";

export type RenderAdmission = {
  assetId: string;
  state: "rendered_unvalidated";
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  colorType: number;
  alphaPresent: boolean;
  admittedAt: string;
};

export type PromotionResult = {
  state: "validated" | "rendered_unvalidated";
  validation: ValidationResult;
  manifest: AssetManifestRecord;
};

function assertCanonicalTimestamp(value: string): void {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error("admittedAt must be a canonical ISO-8601 timestamp");
  }
}

export function admitRenderedPng(
  assetId: string,
  bytes: Uint8Array,
  admittedAt: string,
): RenderAdmission {
  if (!/^(character|fx|texture)-\d{5}$/.test(assetId)) {
    throw new Error("assetId must use kind-00000 format");
  }
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new Error("Rendered file bytes are required");
  }
  assertCanonicalTimestamp(admittedAt);

  const inspection = inspectPng(bytes);
  if (!inspection.passed) {
    throw new Error(`Rendered PNG failed structural inspection: ${inspection.failures.join("; ")}`);
  }

  // Decode now, not later, so malformed compressed data can never be called rendered.
  decodePngPixels(bytes);

  return {
    assetId,
    state: "rendered_unvalidated",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.byteLength,
    width: inspection.width,
    height: inspection.height,
    colorType: inspection.colorType,
    alphaPresent: inspection.hasAlpha,
    admittedAt,
  };
}

export function validateRenderedPngForPromotion(
  admission: RenderAdmission,
  bytes: Uint8Array,
  manifestBase: Omit<
    AssetManifestRecord,
    | "assetId"
    | "width"
    | "height"
    | "sha256"
    | "alphaPresent"
    | "alphaBoundsNonEmpty"
    | "chromaPurity"
    | "edgeContamination"
    | "clippingScore"
  >,
  thresholds?: ValidationThresholds,
): PromotionResult {
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== admission.sha256) {
    throw new Error("Rendered bytes changed after admission");
  }

  const decoded = decodePngPixels(bytes);
  if (decoded.width !== admission.width || decoded.height !== admission.height) {
    throw new Error("Rendered dimensions changed after admission");
  }
  const metrics = measurePixelMetrics(decoded);

  const manifest: AssetManifestRecord = {
    ...manifestBase,
    assetId: admission.assetId,
    width: decoded.width,
    height: decoded.height,
    sha256: actualHash,
    alphaPresent: decoded.channels === 4,
    alphaBoundsNonEmpty: metrics.alphaBoundsNonEmpty,
    chromaPurity: metrics.chromaPurity,
    edgeContamination: metrics.edgeContamination,
    clippingScore: metrics.clippingScore,
  };

  const validation = validateManifestRecord(manifest, thresholds);
  return {
    state: validation.passed ? "validated" : "rendered_unvalidated",
    validation,
    manifest,
  };
}
