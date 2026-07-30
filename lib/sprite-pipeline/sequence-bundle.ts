import { createHash } from "node:crypto";

export type SequenceFrame = {
  assetId: string;
  index: number;
  phase: string;
  durationMs: number;
  pivot: [number, number];
  fileSha256: string;
};

export type SequenceBundle = {
  sequenceId: string;
  kind: "character" | "fx";
  action: string;
  camera: string;
  facing: string;
  frameRate: number;
  durationMs: number;
  anticipationFrame: number | null;
  contactFrame: number | null;
  followThroughFrame: number | null;
  recoveryFrame: number | null;
  fxOrigin?: [number, number];
  fxDirection?: string;
  fxScale?: number;
  collisionSuggestion: string;
  soundSlot: string | null;
  engineExportPassed: boolean;
  frames: SequenceFrame[];
};

export type SequenceValidationResult = {
  passed: boolean;
  failures: string[];
  computedDurationMs: number;
  digest: string;
};

const SHA256 = /^[a-f0-9]{64}$/i;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function validateSequenceBundle(bundle: SequenceBundle): SequenceValidationResult {
  const failures: string[] = [];
  if (!bundle.sequenceId.trim()) failures.push("sequenceId is required");
  if (!bundle.action.trim()) failures.push("action is required");
  if (!bundle.camera.trim()) failures.push("camera is required");
  if (!bundle.facing.trim()) failures.push("facing is required");
  if (!Number.isFinite(bundle.frameRate) || bundle.frameRate <= 0 || bundle.frameRate > 240) failures.push("frameRate must be within 0..240");
  if (!Number.isInteger(bundle.durationMs) || bundle.durationMs <= 0) failures.push("durationMs must be a positive integer");
  if (bundle.frames.length === 0) failures.push("sequence must contain frames");
  if (!bundle.collisionSuggestion.trim()) failures.push("collisionSuggestion is required");
  if (!bundle.engineExportPassed) failures.push("engine export validation has not passed");

  const ids = new Set<string>();
  const indexes = new Set<number>();
  let computedDurationMs = 0;
  for (const frame of bundle.frames) {
    if (!frame.assetId.trim()) failures.push("frame assetId is required");
    if (ids.has(frame.assetId)) failures.push(`duplicate frame assetId: ${frame.assetId}`);
    ids.add(frame.assetId);
    if (!Number.isInteger(frame.index) || frame.index < 0) failures.push(`invalid frame index: ${frame.index}`);
    if (indexes.has(frame.index)) failures.push(`duplicate frame index: ${frame.index}`);
    indexes.add(frame.index);
    if (!frame.phase.trim()) failures.push(`frame ${frame.index} phase is required`);
    if (!Number.isInteger(frame.durationMs) || frame.durationMs <= 0) failures.push(`frame ${frame.index} duration must be positive`);
    computedDurationMs += frame.durationMs;
    if (frame.pivot.some((value) => value < 0 || value > 1)) failures.push(`frame ${frame.index} pivot is outside normalized bounds`);
    if (!SHA256.test(frame.fileSha256)) failures.push(`frame ${frame.index} fileSha256 is invalid`);
  }

  for (let index = 0; index < bundle.frames.length; index += 1) {
    if (!indexes.has(index)) failures.push(`missing frame index: ${index}`);
  }
  if (computedDurationMs !== bundle.durationMs) failures.push(`duration mismatch: declared ${bundle.durationMs}, computed ${computedDurationMs}`);
  if (bundle.frameRate > 0) {
    const nominalDuration = Math.round((bundle.frames.length / bundle.frameRate) * 1000);
    const tolerance = Math.max(2, Math.ceil(1000 / bundle.frameRate));
    if (Math.abs(nominalDuration - bundle.durationMs) > tolerance) failures.push(`frame-rate synchronization mismatch: nominal ${nominalDuration}, declared ${bundle.durationMs}`);
  }

  const phaseFrames = [
    ["anticipation", bundle.anticipationFrame],
    ["contact", bundle.contactFrame],
    ["followThrough", bundle.followThroughFrame],
    ["recovery", bundle.recoveryFrame],
  ] as const;
  let previous = -1;
  for (const [name, index] of phaseFrames) {
    if (index === null) continue;
    if (!Number.isInteger(index) || index < 0 || index >= bundle.frames.length) failures.push(`${name} frame is out of range`);
    if (index <= previous) failures.push(`${name} frame must follow prior declared phase frame`);
    previous = index;
  }

  if (bundle.kind === "fx") {
    if (!bundle.fxOrigin) failures.push("FX sequence requires fxOrigin");
    if (!bundle.fxDirection?.trim()) failures.push("FX sequence requires fxDirection");
    if (!Number.isFinite(bundle.fxScale) || (bundle.fxScale ?? 0) <= 0) failures.push("FX sequence requires positive fxScale");
  }

  return {
    passed: failures.length === 0,
    failures,
    computedDurationMs,
    digest: createHash("sha256").update(canonical(bundle)).digest("hex"),
  };
}
