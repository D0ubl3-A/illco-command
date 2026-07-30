import { createHash } from "node:crypto";

export const ASSET_STATES = [
  "planned",
  "queued",
  "rendering",
  "rendered_unvalidated",
  "validated",
  "packaged",
  "published",
  "retryable_failed",
  "blocked",
  "rejected_duplicate",
  "rejected_quality",
  "rejected_ip",
  "rejected_policy",
  "quarantined",
  "retired",
  "replaced",
] as const;

export type AssetState = (typeof ASSET_STATES)[number];

const transitions: Record<AssetState, ReadonlySet<AssetState>> = {
  planned: new Set(["queued", "blocked", "retired"]),
  queued: new Set(["rendering", "blocked", "retired"]),
  rendering: new Set(["rendered_unvalidated", "retryable_failed", "blocked", "quarantined"]),
  rendered_unvalidated: new Set([
    "validated",
    "retryable_failed",
    "rejected_duplicate",
    "rejected_quality",
    "rejected_ip",
    "rejected_policy",
    "quarantined",
  ]),
  validated: new Set(["packaged", "replaced", "retired", "quarantined"]),
  packaged: new Set(["published", "replaced", "retired", "quarantined"]),
  published: new Set(["replaced", "retired", "quarantined"]),
  retryable_failed: new Set(["queued", "blocked", "retired"]),
  blocked: new Set(["queued", "retired"]),
  rejected_duplicate: new Set(["queued", "retired"]),
  rejected_quality: new Set(["queued", "retired"]),
  rejected_ip: new Set(["retired"]),
  rejected_policy: new Set(["retired"]),
  quarantined: new Set(["queued", "retired", "replaced"]),
  retired: new Set([]),
  replaced: new Set(["retired"]),
};

export type OperationKeyInput = {
  themeId: string;
  themeVersion: string;
  runId: string;
  surgeonId: number;
  assetId: string;
  promptVersion: string;
  provider: string;
  modelVersion: string;
  attempt: number;
};

export function buildOperationKey(input: OperationKeyInput): string {
  const canonical = JSON.stringify({
    themeId: input.themeId,
    themeVersion: input.themeVersion,
    runId: input.runId,
    surgeonId: input.surgeonId,
    assetId: input.assetId,
    promptVersion: input.promptVersion,
    provider: input.provider,
    modelVersion: input.modelVersion,
    attempt: input.attempt,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function assertTransition(from: AssetState, to: AssetState): void {
  if (!transitions[from]?.has(to)) {
    throw new Error(`Illegal asset transition: ${from} -> ${to}`);
  }
}

export function ownerForAsset(kind: "character" | "fx", ordinal: number): number {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 10_000) {
    throw new RangeError("ordinal must be an integer from 1 through 10000");
  }
  const laneOffset = Math.floor((ordinal - 1) / 20);
  return kind === "character" ? laneOffset + 1 : laneOffset + 501;
}

export function assertOwnership(
  kind: "character" | "fx",
  ordinal: number,
  surgeonId: number,
): void {
  const expected = ownerForAsset(kind, ordinal);
  if (surgeonId !== expected) {
    throw new Error(
      `Ownership violation for ${kind} asset ${ordinal}: expected surgeon ${expected}, received ${surgeonId}`,
    );
  }
}

export type EvidenceRecord = {
  controlId: string;
  testVersion: string;
  rawResult: string;
  passed: boolean;
  evidencePath: string;
  evidenceHash: string;
  createdAt: string;
};

export function verifyEvidence(record: EvidenceRecord): void {
  if (!record.controlId.trim()) throw new Error("controlId is required");
  if (!record.testVersion.trim()) throw new Error("testVersion is required");
  if (!record.evidencePath.trim()) throw new Error("evidencePath is required");
  if (!/^[a-f0-9]{64}$/i.test(record.evidenceHash)) {
    throw new Error("evidenceHash must be a SHA-256 hex digest");
  }
  if (Number.isNaN(Date.parse(record.createdAt))) {
    throw new Error("createdAt must be a valid timestamp");
  }
}
