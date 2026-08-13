import { createHash } from "node:crypto";

export type LockRecord = {
  lockKey: string;
  ownerRunId: string;
  surgeonId: number | null;
  acquiredAt: string;
  heartbeatAt: string;
  expiresAt: string;
  releasedAt: string | null;
};

export type RecoveryDecision = {
  lockKey: string;
  action: "keep" | "release_stale" | "reject_corrupt";
  reason: string;
};

export type CrashBoundary =
  | "before_allocation"
  | "after_allocation"
  | "before_provider_call"
  | "after_provider_call"
  | "after_temp_write"
  | "after_atomic_rename"
  | "after_hash_registration"
  | "after_manifest_update"
  | "after_validation"
  | "after_archive"
  | "after_package"
  | "after_publication";

export type ReplayCheckpoint = {
  operationKey: string;
  boundary: CrashBoundary;
  assetId: string;
  canonicalResultId: string | null;
  fileSha256: string | null;
  committed: boolean;
};

const SHA256 = /^[a-f0-9]{64}$/i;

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`Invalid timestamp: ${value}`);
  return parsed;
}

export function classifyLock(lock: LockRecord, now: string): RecoveryDecision {
  let expiresAt: number;
  let heartbeatAt: number;
  let acquiredAt: number;
  let current: number;
  try {
    expiresAt = timestamp(lock.expiresAt);
    heartbeatAt = timestamp(lock.heartbeatAt);
    acquiredAt = timestamp(lock.acquiredAt);
    current = timestamp(now);
  } catch (error) {
    return { lockKey: lock.lockKey, action: "reject_corrupt", reason: error instanceof Error ? error.message : String(error) };
  }
  if (!lock.lockKey.trim() || !lock.ownerRunId.trim() || expiresAt <= acquiredAt || heartbeatAt < acquiredAt) {
    return { lockKey: lock.lockKey, action: "reject_corrupt", reason: "Lock invariants are invalid" };
  }
  if (lock.releasedAt !== null) {
    try {
      if (timestamp(lock.releasedAt) < acquiredAt) {
        return { lockKey: lock.lockKey, action: "reject_corrupt", reason: "releasedAt precedes acquiredAt" };
      }
    } catch (error) {
      return { lockKey: lock.lockKey, action: "reject_corrupt", reason: error instanceof Error ? error.message : String(error) };
    }
    return { lockKey: lock.lockKey, action: "keep", reason: "Lock is already released" };
  }
  if (expiresAt <= current) {
    return { lockKey: lock.lockKey, action: "release_stale", reason: "Lock expiry has passed" };
  }
  return { lockKey: lock.lockKey, action: "keep", reason: "Lock heartbeat and expiry are current" };
}

export function recoverLocks(locks: LockRecord[], now: string): RecoveryDecision[] {
  const seen = new Set<string>();
  return locks.map((lock) => {
    if (seen.has(lock.lockKey)) {
      return { lockKey: lock.lockKey, action: "reject_corrupt", reason: "Duplicate lock key in recovery batch" };
    }
    seen.add(lock.lockKey);
    return classifyLock(lock, now);
  });
}

export function checkpointHash(checkpoint: ReplayCheckpoint): string {
  return createHash("sha256")
    .update(JSON.stringify({
      operationKey: checkpoint.operationKey,
      boundary: checkpoint.boundary,
      assetId: checkpoint.assetId,
      canonicalResultId: checkpoint.canonicalResultId,
      fileSha256: checkpoint.fileSha256,
      committed: checkpoint.committed,
    }))
    .digest("hex");
}

export function reconcileReplay(checkpoints: ReplayCheckpoint[]): ReplayCheckpoint {
  if (checkpoints.length === 0) throw new Error("At least one replay checkpoint is required");
  const operationKeys = new Set(checkpoints.map((checkpoint) => checkpoint.operationKey));
  const assetIds = new Set(checkpoints.map((checkpoint) => checkpoint.assetId));
  if (operationKeys.size !== 1) throw new Error("Replay checkpoints contain multiple operation keys");
  if (assetIds.size !== 1) throw new Error("Replay checkpoints contain multiple asset IDs");

  const committed = checkpoints.filter((checkpoint) => checkpoint.committed);
  for (const checkpoint of committed) {
    if (!checkpoint.canonicalResultId?.trim() || !checkpoint.fileSha256) {
      throw new Error("Committed replay checkpoint is missing a canonical result ID or file hash");
    }
    if (!SHA256.test(checkpoint.fileSha256)) {
      throw new Error("Committed file hash is invalid");
    }
  }

  const resultIds = new Set(committed.map((checkpoint) => checkpoint.canonicalResultId as string));
  const fileHashes = new Set(committed.map((checkpoint) => checkpoint.fileSha256 as string));
  if (resultIds.size > 1) throw new Error("Replay produced multiple canonical result IDs");
  if (fileHashes.size > 1) throw new Error("Replay produced multiple committed file hashes");

  if (committed.length > 0) {
    const canonicalResultId = committed[0]!.canonicalResultId;
    const fileSha256 = committed[0]!.fileSha256;
    for (const checkpoint of committed) {
      if (checkpoint.canonicalResultId !== canonicalResultId || checkpoint.fileSha256 !== fileSha256) {
        throw new Error("Committed replay checkpoints do not share one canonical result/hash pair");
      }
    }
  }

  return committed.at(-1) ?? checkpoints.at(-1)!;
}
