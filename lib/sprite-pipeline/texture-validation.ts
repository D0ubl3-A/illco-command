export type TextureClass = "decal" | "full-surface";
export type ColorSpace = "srgb" | "linear";

export type TextureValidationInput = {
  assetId: string;
  usage: string;
  surface: string;
  tileable: boolean;
  tileAxes: Array<"x" | "y">;
  worldScaleMeters: number;
  width: number;
  height: number;
  colorSpace: ColorSpace;
  damageLevel: number;
  textureClass: TextureClass;
  seamErrorX: number;
  seamErrorY: number;
  edgeWrapPassedX: boolean;
  edgeWrapPassedY: boolean;
  mapSuitability: {
    albedo: boolean;
    normal: boolean;
    roughness: boolean;
    metallic: boolean;
    height: boolean;
  };
  repetitionScore: number;
  evidencePath: string;
  evidenceSha256: string;
};

export type TextureValidationThresholds = {
  minResolution: number;
  maxResolution: number;
  maxSeamError: number;
  maxRepetitionScore: number;
};

export type TextureValidationResult = {
  passed: boolean;
  failures: Array<{ controlId: string; message: string }>;
};

export const DEFAULT_TEXTURE_THRESHOLDS: TextureValidationThresholds = {
  minResolution: 256,
  maxResolution: 8192,
  maxSeamError: 0.02,
  maxRepetitionScore: 0.35,
};

const SHA256 = /^[a-f0-9]{64}$/i;
const SAFE_EVIDENCE_PATH = /^[a-z0-9][a-z0-9._/-]*$/;

export function validateTexture(
  input: TextureValidationInput,
  thresholds: TextureValidationThresholds = DEFAULT_TEXTURE_THRESHOLDS,
): TextureValidationResult {
  const failures: Array<{ controlId: string; message: string }> = [];
  const fail = (controlId: string, message: string) => failures.push({ controlId, message });

  if (!/^texture-\d{5}$/.test(input.assetId)) fail("TEXTURE-ID", "assetId must use texture-00000 format");
  if (!input.usage.trim()) fail("TEXTURE-USAGE", "usage is required");
  if (!input.surface.trim()) fail("TEXTURE-SURFACE", "surface is required");
  if (!Number.isFinite(input.worldScaleMeters) || input.worldScaleMeters <= 0) fail("TEXTURE-WORLD-SCALE", "world scale must be positive");
  if (!Number.isInteger(input.width) || input.width < thresholds.minResolution || input.width > thresholds.maxResolution) fail("TEXTURE-WIDTH", "width is outside the permitted range");
  if (!Number.isInteger(input.height) || input.height < thresholds.minResolution || input.height > thresholds.maxResolution) fail("TEXTURE-HEIGHT", "height is outside the permitted range");
  if (input.damageLevel < 0 || input.damageLevel > 1) fail("TEXTURE-DAMAGE", "damage level must be between 0 and 1");
  if (input.repetitionScore < 0 || input.repetitionScore > thresholds.maxRepetitionScore) fail("TEXTURE-REPETITION", `repetition score exceeds ${thresholds.maxRepetitionScore}`);

  const uniqueAxes = new Set(input.tileAxes);
  if (uniqueAxes.size !== input.tileAxes.length) fail("TEXTURE-TILE-AXES", "tile axes contain duplicates");
  if (!input.tileable && input.tileAxes.length > 0) fail("TEXTURE-TILE-DECLARATION", "non-tileable texture cannot declare tile axes");
  if (input.tileable && input.tileAxes.length === 0) fail("TEXTURE-TILE-DECLARATION", "tileable texture must declare at least one tile axis");

  if (input.tileAxes.includes("x")) {
    if (!input.edgeWrapPassedX) fail("TEXTURE-WRAP-X", "horizontal edge-wrap test failed");
    if (input.seamErrorX < 0 || input.seamErrorX > thresholds.maxSeamError) fail("TEXTURE-SEAM-X", `horizontal seam error exceeds ${thresholds.maxSeamError}`);
  }
  if (input.tileAxes.includes("y")) {
    if (!input.edgeWrapPassedY) fail("TEXTURE-WRAP-Y", "vertical edge-wrap test failed");
    if (input.seamErrorY < 0 || input.seamErrorY > thresholds.maxSeamError) fail("TEXTURE-SEAM-Y", `vertical seam error exceeds ${thresholds.maxSeamError}`);
  }

  if (input.textureClass === "full-surface" && !input.mapSuitability.albedo) fail("TEXTURE-MAP-ALBEDO", "full-surface texture must support albedo derivation");
  if (input.mapSuitability.metallic && input.colorSpace !== "linear") fail("TEXTURE-MAP-COLORSPACE", "metallic map suitability requires linear color space");

  if (!input.evidencePath || input.evidencePath.startsWith("/") || input.evidencePath.includes("..") || !SAFE_EVIDENCE_PATH.test(input.evidencePath)) {
    fail("TEXTURE-EVIDENCE-PATH", "evidence path is unsafe or missing");
  }
  if (!SHA256.test(input.evidenceSha256)) fail("TEXTURE-EVIDENCE-HASH", "evidence SHA-256 is invalid");

  return { passed: failures.length === 0, failures };
}
