export type SequenceFrame = {
  assetId: string;
  index: number;
  durationMs: number;
  pivot: [number, number];
  phase: string;
  sha256: string;
};

export type SequenceBundle = {
  sequenceId: string;
  characterId?: string;
  fxFamilyId?: string;
  camera: string;
  facing: "left" | "right" | "front" | "back";
  frameRate: number;
  durationMs: number;
  anticipationFrame: number;
  contactFrame: number;
  followThroughFrame: number;
  recoveryFrame: number;
  frames: SequenceFrame[];
  fxOrigin?: [number, number];
  fxDirection?: [number, number];
  fxScale?: number;
  collisionSuggestion: string;
  soundSlot: string;
  engineExportResults: Record<"unity" | "godot" | "unreal" | "generic", boolean>;
};

export type SequenceValidationResult = {
  passed: boolean;
  failures: string[];
  computedDurationMs: number;
};

const SHA256 = /^[a-f0-9]{64}$/;

function normalizePhase(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function validateSequenceBundle(bundle: SequenceBundle): SequenceValidationResult {
  const failures: string[] = [];
  if (!bundle.sequenceId.trim()) failures.push("sequenceId is required");
  if (!bundle.characterId && !bundle.fxFamilyId) failures.push("characterId or fxFamilyId is required");
  if (bundle.characterId && bundle.fxFamilyId) failures.push("sequence cannot target both characterId and fxFamilyId");
  if (!bundle.camera.trim()) failures.push("camera is required");
  if (!Number.isFinite(bundle.frameRate) || bundle.frameRate <= 0 || bundle.frameRate > 240) failures.push("frameRate must be within 0..240");
  if (!Number.isInteger(bundle.durationMs) || bundle.durationMs <= 0) failures.push("durationMs must be a positive integer");
  if (bundle.frames.length === 0) failures.push("sequence must contain frames");

  const indexes = new Set<number>();
  const assetIds = new Set<string>();
  let computedDurationMs = 0;
  for (const frame of bundle.frames) {
    if (!frame.assetId.trim()) failures.push("frame assetId is required");
    if (assetIds.has(frame.assetId)) failures.push(`duplicate frame assetId ${frame.assetId}`);
    assetIds.add(frame.assetId);
    if (!Number.isInteger(frame.index) || frame.index < 0) failures.push(`invalid frame index ${frame.index}`);
    if (indexes.has(frame.index)) failures.push(`duplicate frame index ${frame.index}`);
    indexes.add(frame.index);
    if (!Number.isInteger(frame.durationMs) || frame.durationMs <= 0) failures.push(`invalid frame duration at ${frame.index}`);
    else computedDurationMs += frame.durationMs;
    if (frame.pivot.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) failures.push(`invalid pivot at ${frame.index}`);
    if (!frame.phase.trim()) failures.push(`phase is required at ${frame.index}`);
    if (!SHA256.test(frame.sha256)) failures.push(`invalid frame hash at ${frame.index}`);
  }

  const expectedIndexes = Array.from({ length: bundle.frames.length }, (_, index) => index);
  for (const index of expectedIndexes) if (!indexes.has(index)) failures.push(`missing frame index ${index}`);
  if (computedDurationMs !== bundle.durationMs) failures.push(`duration mismatch: declared ${bundle.durationMs}, computed ${computedDurationMs}`);

  const markerDefinitions = [
    ["anticipation", bundle.anticipationFrame, "anticipation"],
    ["contact", bundle.contactFrame, "contact"],
    ["followThrough", bundle.followThroughFrame, "followthrough"],
    ["recovery", bundle.recoveryFrame, "recovery"],
  ] as const;
  const markers = markerDefinitions.map(([, marker]) => marker);
  if (markers.some((marker) => !Number.isInteger(marker) || marker < 0 || marker >= bundle.frames.length)) failures.push("phase marker is outside frame range");
  if (!(bundle.anticipationFrame <= bundle.contactFrame && bundle.contactFrame <= bundle.followThroughFrame && bundle.followThroughFrame <= bundle.recoveryFrame)) failures.push("phase markers are out of order");
  for (const [name, marker, expectedPhase] of markerDefinitions) {
    const frame = bundle.frames.find((candidate) => candidate.index === marker);
    if (!frame) {
      failures.push(`${name} marker does not reference an existing frame`);
      continue;
    }
    if (normalizePhase(frame.phase) !== expectedPhase) failures.push(`${name} marker phase mismatch: frame ${marker} declares ${frame.phase}`);
  }

  if (bundle.fxFamilyId) {
    if (!bundle.fxOrigin || !bundle.fxDirection || bundle.fxScale === undefined) failures.push("FX sequence requires origin, direction, and scale");
    if (bundle.fxOrigin?.some((value) => !Number.isFinite(value))) failures.push("FX origin is invalid");
    if (bundle.fxDirection?.some((value) => !Number.isFinite(value))) failures.push("FX direction is invalid");
    if (bundle.fxScale !== undefined && (!Number.isFinite(bundle.fxScale) || bundle.fxScale <= 0)) failures.push("FX scale is invalid");
  }

  if (!bundle.collisionSuggestion.trim()) failures.push("collisionSuggestion is required");
  if (!bundle.soundSlot.trim()) failures.push("soundSlot is required");
  for (const target of ["unity", "godot", "unreal", "generic"] as const) {
    if (bundle.engineExportResults[target] !== true) failures.push(`${target} engine export has not passed`);
  }

  const idealFrameDuration = 1000 / bundle.frameRate;
  for (const frame of bundle.frames) {
    if (Math.abs(frame.durationMs - idealFrameDuration) > Math.max(2, idealFrameDuration * 0.15)) failures.push(`frame ${frame.index} timing is outside synchronization tolerance`);
  }

  return { passed: failures.length === 0, failures, computedDurationMs };
}
