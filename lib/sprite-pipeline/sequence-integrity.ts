export type FrameRecord = {
  assetId: string;
  index: number;
  durationMs: number;
  phase: string;
  sha256: string;
};

export type SequenceRecord = {
  sequenceId: string;
  kind: "character" | "fx";
  frameRate: number;
  durationMs: number;
  frames: FrameRecord[];
  anticipationFrame?: number;
  contactFrame?: number;
  followThroughFrame?: number;
  recoveryFrame?: number;
  pivot: [number, number];
  fxOrigin?: [number, number];
  engineChecks: Record<string, "passed" | "failed" | "not_applicable">;
};

export type SequenceResult = {
  passed: boolean;
  failures: string[];
  calculatedDurationMs: number;
};

const SHA256 = /^[a-f0-9]{64}$/i;

export function validateSequence(record: SequenceRecord): SequenceResult {
  const failures: string[] = [];
  if (!record.sequenceId.trim()) failures.push("sequenceId is required");
  if (!Number.isFinite(record.frameRate) || record.frameRate <= 0 || record.frameRate > 240) failures.push("invalid frameRate");
  if (record.frames.length === 0) failures.push("sequence requires frames");
  const indexes = record.frames.map((frame) => frame.index);
  const assetIds = new Set<string>();
  if (new Set(indexes).size !== indexes.length) failures.push("duplicate frame indexes");
  const sorted = [...indexes].sort((a, b) => a - b);
  sorted.forEach((value, index) => { if (value !== index) failures.push(`missing frame index ${index}`); });
  for (const frame of record.frames) {
    const assetId = typeof frame.assetId === "string" ? frame.assetId.trim() : "";
    if (!assetId) failures.push(`missing assetId for frame ${frame.index}`);
    else if (assetIds.has(assetId)) failures.push(`duplicate frame assetId ${assetId}`);
    else assetIds.add(assetId);
    if (!Number.isFinite(frame.durationMs) || frame.durationMs <= 0) failures.push(`invalid duration for frame ${frame.index}`);
    if (!frame.phase.trim()) failures.push(`missing phase for frame ${frame.index}`);
    if (!SHA256.test(frame.sha256)) failures.push(`invalid hash for frame ${frame.index}`);
  }
  const calculatedDurationMs = record.frames.reduce((sum, frame) => sum + frame.durationMs, 0);
  if (Math.abs(calculatedDurationMs - record.durationMs) > 1) failures.push("duration mismatch");
  const expected = 1000 / record.frameRate;
  if (record.frames.some((frame) => Math.abs(frame.durationMs - expected) > Math.max(1, expected * 0.1))) failures.push("frame timing mismatch");
  const markers = [record.anticipationFrame, record.contactFrame, record.followThroughFrame, record.recoveryFrame].filter((value): value is number => value !== undefined);
  if (markers.some((value) => !Number.isInteger(value) || value < 0 || value >= record.frames.length)) failures.push("phase marker outside frame range");
  for (let index = 1; index < markers.length; index += 1) if (markers[index] < markers[index - 1]) failures.push("phase markers out of order");
  if (record.pivot.some((value) => value < 0 || value > 1)) failures.push("pivot must be normalized");
  if (record.kind === "fx" && !record.fxOrigin) failures.push("FX sequence requires origin");
  if (Object.values(record.engineChecks).some((result) => result === "failed")) failures.push("engine validation failed");
  return { passed: failures.length === 0, failures, calculatedDurationMs };
}
