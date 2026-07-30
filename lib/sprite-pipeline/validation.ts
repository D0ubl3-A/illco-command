import { createHash } from "node:crypto";
import { extname, normalize, relative, resolve, sep } from "node:path";

export type AssetKind = "character" | "fx" | "texture";
export type BackgroundMode = "chroma" | "transparent" | "opaque";

export type AssetManifestRecord = {
  assetId: string;
  kind: AssetKind;
  filename: string;
  relativePath: string;
  width: number;
  height: number;
  format: "png";
  backgroundMode: BackgroundMode;
  sha256: string;
  alphaPresent: boolean;
  alphaBoundsNonEmpty: boolean;
  chromaPurity?: number;
  edgeContamination?: number;
  clippingScore: number;
  textLogoDetected: boolean;
  likenessRisk: number;
  sequenceId?: string;
  sequenceIndex?: number;
  sequenceLength?: number;
};

export type ValidationThresholds = {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  minChromaPurity: number;
  maxEdgeContamination: number;
  maxClippingScore: number;
  maxLikenessRisk: number;
};

export const DEFAULT_THRESHOLDS: ValidationThresholds = {
  minWidth: 256,
  minHeight: 256,
  maxWidth: 8192,
  maxHeight: 8192,
  minChromaPurity: 0.985,
  maxEdgeContamination: 0.025,
  maxClippingScore: 0.01,
  maxLikenessRisk: 0.25,
};

export type ValidationFailure = {
  controlId: string;
  message: string;
};

export type ValidationResult = {
  passed: boolean;
  failures: ValidationFailure[];
  evidenceHash: string;
};

const ASSET_ID = /^(character|fx|texture)-\d{5}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_FILENAME = /^[a-z0-9][a-z0-9._-]*\.png$/;

export function assertSafeAssetPath(root: string, relativePath: string): string {
  if (!relativePath || relativePath.includes("\0")) {
    throw new Error("Asset path is empty or contains a NUL byte");
  }
  const normalized = normalize(relativePath);
  if (normalized.startsWith(`..${sep}`) || normalized === ".." || resolve(normalized) === normalized) {
    throw new Error(`Unsafe asset path: ${relativePath}`);
  }
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(absoluteRoot, normalized);
  const rel = relative(absoluteRoot, absolutePath);
  if (rel.startsWith(`..${sep}`) || rel === "..") {
    throw new Error(`Asset path escapes root: ${relativePath}`);
  }
  return absolutePath;
}

export function validateManifestRecord(
  record: AssetManifestRecord,
  thresholds: ValidationThresholds = DEFAULT_THRESHOLDS,
): ValidationResult {
  const failures: ValidationFailure[] = [];
  const fail = (controlId: string, message: string) => failures.push({ controlId, message });

  if (!ASSET_ID.test(record.assetId)) fail("MANIFEST-ID", "assetId must use kind-00000 format");
  if (!SAFE_FILENAME.test(record.filename)) fail("PATH-FILENAME", "filename must be lowercase, sanitized, and PNG");
  if (extname(record.relativePath).toLowerCase() !== ".png") fail("FILE-EXT", "relativePath must end in .png");
  if (!Number.isInteger(record.width) || record.width < thresholds.minWidth || record.width > thresholds.maxWidth) {
    fail("FILE-WIDTH", `width must be ${thresholds.minWidth}-${thresholds.maxWidth}`);
  }
  if (!Number.isInteger(record.height) || record.height < thresholds.minHeight || record.height > thresholds.maxHeight) {
    fail("FILE-HEIGHT", `height must be ${thresholds.minHeight}-${thresholds.maxHeight}`);
  }
  if (record.format !== "png") fail("FILE-FORMAT", "format must be png");
  if (!SHA256.test(record.sha256)) fail("FILE-HASH", "sha256 must be a 64-character hex digest");
  if (record.clippingScore < 0 || record.clippingScore > thresholds.maxClippingScore) {
    fail("VISUAL-CLIPPING", `clippingScore exceeds ${thresholds.maxClippingScore}`);
  }
  if (record.textLogoDetected) fail("IP-TEXT-LOGO", "text, logo, or watermark detected");
  if (record.likenessRisk < 0 || record.likenessRisk > thresholds.maxLikenessRisk) {
    fail("IP-LIKENESS", `likenessRisk exceeds ${thresholds.maxLikenessRisk}`);
  }

  if (record.backgroundMode === "transparent") {
    if (!record.alphaPresent) fail("ALPHA-PRESENT", "transparent assets require an alpha channel");
    if (!record.alphaBoundsNonEmpty) fail("ALPHA-BOUNDS", "transparent assets require nonempty alpha bounds");
  }

  if (record.backgroundMode === "chroma") {
    if (record.chromaPurity === undefined || record.chromaPurity < thresholds.minChromaPurity) {
      fail("CHROMA-PURITY", `chromaPurity must be at least ${thresholds.minChromaPurity}`);
    }
    if (record.edgeContamination === undefined || record.edgeContamination > thresholds.maxEdgeContamination) {
      fail("CHROMA-EDGE", `edgeContamination must be at most ${thresholds.maxEdgeContamination}`);
    }
  }

  const sequenceFields = [record.sequenceId, record.sequenceIndex, record.sequenceLength];
  const sequenceFieldCount = sequenceFields.filter((value) => value !== undefined).length;
  if (sequenceFieldCount !== 0 && sequenceFieldCount !== 3) {
    fail("SEQUENCE-METADATA", "sequenceId, sequenceIndex, and sequenceLength must be supplied together");
  }
  if (sequenceFieldCount === 3) {
    if (!record.sequenceId?.trim()) fail("SEQUENCE-ID", "sequenceId is required");
    if (!Number.isInteger(record.sequenceIndex) || record.sequenceIndex! < 0) {
      fail("SEQUENCE-INDEX", "sequenceIndex must be a nonnegative integer");
    }
    if (!Number.isInteger(record.sequenceLength) || record.sequenceLength! < 1) {
      fail("SEQUENCE-LENGTH", "sequenceLength must be a positive integer");
    }
    if (
      Number.isInteger(record.sequenceIndex) &&
      Number.isInteger(record.sequenceLength) &&
      record.sequenceIndex! >= record.sequenceLength!
    ) {
      fail("SEQUENCE-RANGE", "sequenceIndex must be less than sequenceLength");
    }
  }

  const canonicalEvidence = JSON.stringify({
    record,
    thresholds,
    failures: [...failures].sort((a, b) => a.controlId.localeCompare(b.controlId)),
  });

  return {
    passed: failures.length === 0,
    failures,
    evidenceHash: createHash("sha256").update(canonicalEvidence).digest("hex"),
  };
}

export function findDuplicateHashes(records: readonly AssetManifestRecord[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const record of records) {
    if (!SHA256.test(record.sha256)) continue;
    const ids = groups.get(record.sha256) ?? [];
    ids.push(record.assetId);
    groups.set(record.sha256, ids);
  }
  for (const [hash, ids] of groups) {
    if (ids.length < 2) groups.delete(hash);
    else ids.sort();
  }
  return groups;
}

export function validateSequenceCompleteness(records: readonly AssetManifestRecord[]): ValidationFailure[] {
  const sequences = new Map<string, AssetManifestRecord[]>();
  for (const record of records) {
    if (!record.sequenceId) continue;
    const frames = sequences.get(record.sequenceId) ?? [];
    frames.push(record);
    sequences.set(record.sequenceId, frames);
  }

  const failures: ValidationFailure[] = [];
  for (const [sequenceId, frames] of sequences) {
    const declaredLengths = new Set(frames.map((frame) => frame.sequenceLength));
    if (declaredLengths.size !== 1) {
      failures.push({ controlId: "SEQUENCE-LENGTH-CONSISTENCY", message: `${sequenceId} has conflicting lengths` });
      continue;
    }
    const length = frames[0]?.sequenceLength;
    if (!length) continue;
    const indexes = new Set(frames.map((frame) => frame.sequenceIndex));
    for (let index = 0; index < length; index += 1) {
      if (!indexes.has(index)) {
        failures.push({ controlId: "SEQUENCE-MISSING-FRAME", message: `${sequenceId} missing frame ${index}` });
      }
    }
    if (frames.length !== indexes.size) {
      failures.push({ controlId: "SEQUENCE-DUPLICATE-FRAME", message: `${sequenceId} contains duplicate frame indexes` });
    }
  }
  return failures;
}
