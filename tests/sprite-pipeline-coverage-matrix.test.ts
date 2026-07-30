import assert from "node:assert/strict";
import test from "node:test";
import { allocateCoverage, assertCoverageComplete } from "../lib/sprite-pipeline/coverage-matrix";

const ids = Array.from({ length: 12 }, (_, index) => `character-${String(index + 1).padStart(5, "0")}`);
const dimensions = [
  { name: "facing", values: ["left", "right", "front"], minimumPerValue: 4 },
  { name: "camera", values: ["wide", "medium"], minimumPerValue: 6 },
  { name: "phase", values: ["anticipation", "contact", "recovery"], minimumPerValue: 4 },
];

test("allocates coverage deterministically without duplicate IDs", () => {
  const first = allocateCoverage(ids, dimensions);
  const second = allocateCoverage(ids, dimensions);
  assert.deepEqual(first, second);
  assert.equal(first.assignments.length, ids.length);
  assert.equal(new Set(first.assignments.map((entry) => entry.assetId)).size, ids.length);
  assert.deepEqual(first.deficits, []);
  assert.doesNotThrow(() => assertCoverageComplete(first));
});

test("traverses every value when a later dimension has seven values", () => {
  const result = allocateCoverage(Array.from({ length: 14 }, (_, index) => `fx-${String(index + 1).padStart(5, "0")}`), [
    { name: "a", values: ["a0", "a1"], minimumPerValue: 0 },
    { name: "b", values: ["b0", "b1", "b2"], minimumPerValue: 0 },
    { name: "c", values: ["c0", "c1", "c2", "c3", "c4"], minimumPerValue: 0 },
    { name: "seven", values: ["v0", "v1", "v2", "v3", "v4", "v5", "v6"], minimumPerValue: 2 },
  ]);
  assert.deepEqual(Object.values(result.counts.seven), [2, 2, 2, 2, 2, 2, 2]);
  assert.deepEqual(result.deficits, []);
});

test("reports measurable deficits instead of claiming completion", () => {
  const result = allocateCoverage(ids.slice(0, 2), [
    { name: "action", values: ["jab", "kick", "throw"], minimumPerValue: 2 },
  ]);
  assert.ok(result.deficits.length > 0);
  assert.throws(() => assertCoverageComplete(result), /Coverage deficits/);
});

test("rejects duplicate asset IDs and malformed dimensions", () => {
  assert.throws(() => allocateCoverage([ids[0], ids[0]], dimensions), /unique/);
  assert.throws(() => allocateCoverage(ids, [{ name: "Bad Name", values: ["x"], minimumPerValue: 1 }]), /Invalid dimension name/);
});
