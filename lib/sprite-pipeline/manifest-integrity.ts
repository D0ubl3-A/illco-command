import { createHash } from "node:crypto";
import { posix } from "node:path";

const SHA256 = /^[a-f0-9]{64}$/i;
const ID = /^(character|fx|texture)-\d{5}$/;
const SAFE = /^[a-z0-9][a-z0-9._/-]*$/;

export type SpriteManifest = {
  assetId: string;
  assetVersion: number;
  themeId: string;
  themeVersion: string;
  runId: string;
  operationKey: string;
  surgeonId: number;
  lane: string;
  ownershipRange: [number, number];
  category: string;
  subcategory: string;
  bibleId: string;
  bibleVersion: number;
  action: string;
  facing: string;
  leadHand?: string;
  leadLeg?: string;
  propHand?: string;
  mobilitySide?: string;
  mirrorRule: string;
  camera: string;
  framing: string;
  expression: string;
  phase: string;
  sequenceId?: string;
  sequenceIndex?: number;
  sequenceLength?: number;
  variation: string;
  intendedUse: string;
  tags: string[];
  filename: string;
  relativePath: string;
  contentPath: string;
  prompt: string;
  negativePrompt: string;
  provider: string;
  model: string;
  modelVersion: string;
  parameters: Record<string, unknown>;
  width: number;
  height: number;
  format: "png";
  colorMode: string;
  backgroundMode: "chroma" | "transparent" | "opaque";
  alphaMode: "none" | "straight" | "premultiplied";
  premultiplied: boolean;
  chromaScore?: number;
  edgeScore?: number;
  clippingScore: number;
  silhouetteScore: number;
  textLogoDetected: boolean;
  likenessRisk: number;
  sha256: string;
  pHash?: string;
  dHash?: string;
  silhouetteSignature?: string;
  poseSignature?: string;
  paletteSignature?: string;
  promptSignature?: string;
  duplicateDecision: "clear" | "candidate" | "rejected" | "exception";
  duplicateExceptionId?: string;
  fileValidationEvidence: string;
  sequenceValidationEvidence?: string;
  continuityPointer: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  replacementAssetId?: string;
  archiveId?: string;
  packageIds: string[];
  evidencePaths: string[];
  manifestSha256: string;
};

export type ManifestResult = { passed: boolean; failures: string[]; computedHash: string };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

function hashUnsigned(value: SpriteManifest): string {
  const { manifestSha256: _ignored, ...unsigned } = value;
  return createHash("sha256").update(canonical(unsigned)).digest("hex");
}

export function signManifest(value: Omit<SpriteManifest, "manifestSha256">): SpriteManifest {
  const provisional = { ...value, manifestSha256: "" };
  return { ...provisional, manifestSha256: hashUnsigned(provisional) };
}

function required(value: string, name: string, failures: string[]): void {
  if (!value.trim()) failures.push(`${name} is required`);
}

function safePath(value: string): boolean {
  return SAFE.test(value) && !value.startsWith("/") && !value.includes("..") && !value.includes("\\") && posix.normalize(value) === value;
}

export function validateManifest(value: SpriteManifest): ManifestResult {
  const failures: string[] = [];
  if (!ID.test(value.assetId)) failures.push("assetId is invalid");
  if (!Number.isInteger(value.assetVersion) || value.assetVersion < 1) failures.push("assetVersion is invalid");
  for (const [name, field] of Object.entries({ themeId: value.themeId, themeVersion: value.themeVersion, runId: value.runId, lane: value.lane, category: value.category, subcategory: value.subcategory, bibleId: value.bibleId, action: value.action, facing: value.facing, mirrorRule: value.mirrorRule, camera: value.camera, framing: value.framing, expression: value.expression, phase: value.phase, variation: value.variation, intendedUse: value.intendedUse, filename: value.filename, prompt: value.prompt, provider: value.provider, model: value.model, modelVersion: value.modelVersion, colorMode: value.colorMode, fileValidationEvidence: value.fileValidationEvidence, continuityPointer: value.continuityPointer, status: value.status })) required(field, name, failures);
  if (!SHA256.test(value.operationKey)) failures.push("operationKey must be SHA-256");
  if (!Number.isInteger(value.surgeonId) || value.surgeonId < 1 || value.surgeonId > 1000) failures.push("surgeonId is invalid");
  const ordinal = Number(value.assetId.slice(-5));
  if (ordinal < value.ownershipRange[0] || ordinal > value.ownershipRange[1]) failures.push("asset falls outside ownership range");
  if (!Number.isInteger(value.bibleVersion) || value.bibleVersion < 1) failures.push("bibleVersion is invalid");
  if (!safePath(value.relativePath) || !safePath(value.contentPath)) failures.push("unsafe manifest path");
  if (!value.contentPath.includes(value.sha256)) failures.push("contentPath is not content-addressed");
  if (!SHA256.test(value.sha256)) failures.push("sha256 is invalid");
  if (!Number.isInteger(value.width) || !Number.isInteger(value.height) || value.width <= 0 || value.height <= 0) failures.push("dimensions are invalid");
  if (value.alphaMode === "premultiplied" !== value.premultiplied) failures.push("alpha mode and premultiplication disagree");
  for (const [name, score] of Object.entries({ chromaScore: value.chromaScore, edgeScore: value.edgeScore, clippingScore: value.clippingScore, silhouetteScore: value.silhouetteScore, likenessRisk: value.likenessRisk })) if (score !== undefined && (score < 0 || score > 1)) failures.push(`${name} must be within 0..1`);
  const sequenceFields = [value.sequenceId, value.sequenceIndex, value.sequenceLength].filter((v) => v !== undefined).length;
  if (sequenceFields !== 0 && sequenceFields !== 3) failures.push("sequence metadata must be complete");
  if (sequenceFields === 3 && (!Number.isInteger(value.sequenceIndex) || !Number.isInteger(value.sequenceLength) || value.sequenceIndex! < 0 || value.sequenceIndex! >= value.sequenceLength!)) failures.push("sequence indexes are invalid");
  if (value.duplicateDecision === "exception" && !value.duplicateExceptionId) failures.push("duplicate exception requires an exception ID");
  if (value.duplicateDecision !== "exception" && value.duplicateExceptionId) failures.push("duplicate exception ID is only allowed for exception decisions");
  if (!Number.isInteger(value.retryCount) || value.retryCount < 0) failures.push("retryCount is invalid");
  if (Number.isNaN(Date.parse(value.createdAt)) || Number.isNaN(Date.parse(value.updatedAt)) || Date.parse(value.updatedAt) < Date.parse(value.createdAt)) failures.push("timestamps are invalid");
  if (new Set(value.tags).size !== value.tags.length) failures.push("tags contain duplicates");
  if (new Set(value.packageIds).size !== value.packageIds.length) failures.push("package IDs contain duplicates");
  if (new Set(value.evidencePaths).size !== value.evidencePaths.length || value.evidencePaths.some((path) => !safePath(path))) failures.push("evidence paths are invalid");
  const computedHash = hashUnsigned(value);
  if (!SHA256.test(value.manifestSha256) || value.manifestSha256 !== computedHash) failures.push("manifest hash mismatch");
  return { passed: failures.length === 0, failures, computedHash };
}
