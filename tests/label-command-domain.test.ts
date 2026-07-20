import assert from "node:assert/strict";
import test from "node:test";

import {
  createReleaseInputSchema,
  labelStageTitle,
  normalizeLabelSlug,
  updateReleaseInputSchema,
  validateSplitTotal,
} from "../lib/label-command-domain";

test("label slugs are stable and URL-safe", () => {
  assert.equal(normalizeLabelSlug("M3ntally-iLL Music"), "m3ntally-ill-music");
  assert.equal(normalizeLabelSlug("  Déjà Vu Records  "), "deja-vu-records");
});

test("release input normalizes safe defaults", () => {
  const release = createReleaseInputSchema.parse({ title: "  Got   You Back  " });
  assert.equal(release.title, "Got You Back");
  assert.equal(release.releaseType, "single");
  assert.equal(release.stage, "draft");
  assert.equal(release.targetDate, null);
  assert.equal(release.explicit, false);
});

test("release updates reject empty writes", () => {
  const result = updateReleaseInputSchema.safeParse({ id: "08d48e31-a502-4c5f-a4d0-d898b6c42f87" });
  assert.equal(result.success, false);
});

test("split validation requires an exact 100 percent total", () => {
  assert.deepEqual(validateSplitTotal([50, 25, 25]), { valid: true, total: 100, reason: null });
  assert.equal(validateSplitTotal([60, 30]).valid, false);
  assert.equal(validateSplitTotal([101, -1]).valid, false);
});

test("release stage titles are readable", () => {
  assert.equal(labelStageTitle("correction_required"), "Correction Required");
});
