import assert from "node:assert/strict";
import test from "node:test";
import { buildContinuityPlan, type ContinuityAsset } from "../lib/sprite-pipeline/continuity-planner";

function asset(overrides: Partial<ContinuityAsset> = {}): ContinuityAsset {
  return {
    assetId: "character-00001",
    kind: "character",
    ordinal: 1,
    ownerSurgeon: 1,
    state: "planned",
    version: 1,
    updatedAt: "2026-07-31T08:00:00.000Z",
    ...overrides,
  };
}

test("selects the first unvalidated required asset without skipping character range", () => {
  const plan = buildContinuityPlan([
    asset({ state: "validated" }),
    asset({ assetId: "character-00002", ordinal: 2, state: "rendered_unvalidated" }),
    asset({ assetId: "fx-00001", kind: "fx", ordinal: 1, ownerSurgeon: 501, state: "queued" }),
  ]);

  assert.equal(plan.firstUnvalidatedAssetId, "character-00002");
  assert.equal(plan.nextCharacterAssetId, "character-00002");
  assert.equal(plan.nextFxAssetId, "fx-00001");
  assert.equal(plan.validatedCount, 1);
  assert.equal(plan.unresolvedRequiredCount, 19_999);
  assert.match(plan.continuityPointer, /^[a-f0-9]{64}$/);
});

test("reports the earliest hard-blocked required asset", () => {
  const plan = buildContinuityPlan([
    asset({ state: "validated" }),
    asset({ assetId: "character-00002", ordinal: 2, state: "blocked" }),
    asset({ assetId: "character-00003", ordinal: 3, state: "quarantined" }),
  ]);
  assert.equal(plan.firstBlockedRequiredAssetId, "character-00002");
});

test("counts packaged and published assets truthfully", () => {
  const plan = buildContinuityPlan([
    asset({ state: "packaged" }),
    asset({ assetId: "character-00002", ordinal: 2, state: "published" }),
  ]);
  assert.equal(plan.validatedCount, 2);
  assert.equal(plan.packagedCount, 2);
  assert.equal(plan.publishedCount, 1);
});

test("rejects duplicate IDs", () => {
  assert.throws(() => buildContinuityPlan([asset(), asset()]), /Duplicate asset ID/);
});

test("rejects cross-range ownership mutation", () => {
  assert.throws(() => buildContinuityPlan([asset({ ownerSurgeon: 2 })]), /Ownership violation/);
});

test("rejects noncanonical IDs", () => {
  assert.throws(() => buildContinuityPlan([asset({ assetId: "character-1" })]), /Non-canonical asset ID/);
});

test("continuity pointer is deterministic for the same authoritative state", () => {
  const first = buildContinuityPlan([asset({ state: "rendered_unvalidated" })]);
  const second = buildContinuityPlan([asset({ state: "rendered_unvalidated" })]);
  assert.equal(first.continuityPointer, second.continuityPointer);
});
