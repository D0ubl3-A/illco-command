import assert from "node:assert/strict";
import test from "node:test";
import {
  checkpointHash,
  classifyLock,
  reconcileReplay,
  recoverLocks,
  type LockRecord,
  type ReplayCheckpoint,
} from "../lib/sprite-pipeline/recovery";

const ACTIVE_LOCK: LockRecord = {
  lockKey: "asset:character-00001",
  ownerRunId: "run-001",
  surgeonId: 1,
  acquiredAt: "2026-07-30T06:00:00.000Z",
  heartbeatAt: "2026-07-30T06:05:00.000Z",
  expiresAt: "2026-07-30T06:10:00.000Z",
  releasedAt: null,
};

const CHECKPOINT: ReplayCheckpoint = {
  operationKey: "f".repeat(64),
  boundary: "after_hash_registration",
  assetId: "character-00001",
  canonicalResultId: "result-001",
  fileSha256: "a".repeat(64),
  committed: true,
};

test("keeps an active lock", () => {
  assert.equal(classifyLock(ACTIVE_LOCK, "2026-07-30T06:06:00.000Z").action, "keep");
});

test("releases an expired stale lock", () => {
  assert.equal(classifyLock(ACTIVE_LOCK, "2026-07-30T06:10:00.000Z").action, "release_stale");
});

test("rejects corrupt lock timestamps", () => {
  const result = classifyLock({ ...ACTIVE_LOCK, heartbeatAt: "2026-07-30T05:59:00.000Z" }, "2026-07-30T06:06:00.000Z");
  assert.equal(result.action, "reject_corrupt");
});

test("rejects duplicate lock keys during recovery", () => {
  const decisions = recoverLocks([ACTIVE_LOCK, { ...ACTIVE_LOCK }], "2026-07-30T06:06:00.000Z");
  assert.equal(decisions[1]?.action, "reject_corrupt");
});

test("replay returns the existing committed canonical result", () => {
  const recovered = reconcileReplay([
    { ...CHECKPOINT, boundary: "before_provider_call", committed: false, canonicalResultId: null, fileSha256: null },
    CHECKPOINT,
    { ...CHECKPOINT, boundary: "after_manifest_update" },
  ]);
  assert.equal(recovered.canonicalResultId, "result-001");
  assert.equal(recovered.fileSha256, "a".repeat(64));
});

test("replay rejects multiple canonical results", () => {
  assert.throws(
    () => reconcileReplay([CHECKPOINT, { ...CHECKPOINT, canonicalResultId: "result-002" }]),
    /multiple canonical result IDs/,
  );
});

test("replay rejects multiple committed file hashes", () => {
  assert.throws(
    () => reconcileReplay([CHECKPOINT, { ...CHECKPOINT, fileSha256: "b".repeat(64) }]),
    /multiple committed file hashes/,
  );
});

test("checkpoint hashes are deterministic", () => {
  assert.equal(checkpointHash(CHECKPOINT), checkpointHash({ ...CHECKPOINT }));
  assert.notEqual(checkpointHash(CHECKPOINT), checkpointHash({ ...CHECKPOINT, boundary: "after_archive" }));
});
