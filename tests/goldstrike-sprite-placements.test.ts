import assert from "node:assert/strict";
import test from "node:test";

import {
  GOLDSTRIKE_SPRITE_PLACEMENTS,
  getGoldstrikeSpritePlacement,
  getGoldstrikeSpritePlacementCoverage,
  listGoldstrikeExactSpritePlacements,
  listGoldstrikePendingSpritePlacements,
  validateGoldstrikeSpritePlacements,
} from "@/lib/world/goldstrike-sprite-placements";

test("every Goldstrike sprite has a placement record", () => {
  assert.equal(GOLDSTRIKE_SPRITE_PLACEMENTS.length, 84);
});

test("current exact coordinate coverage is explicit", () => {
  const coverage = getGoldstrikeSpritePlacementCoverage();
  assert.equal(coverage.totalSprites, 84);
  assert.equal(coverage.exactAnchorCoordinateSprites, 9);
  assert.equal(coverage.pendingGeometrySprites, 75);
  assert.equal(coverage.complete, false);
  assert.ok(Math.abs(coverage.exactCoveragePercent - 10.714285714285714) < 1e-12);
});

test("exact placements inherit geographic anchor coordinates", () => {
  const nebula = getGoldstrikeSpritePlacement("gs_nebula_spring_marker");
  assert.equal(nebula.placement_status, "EXACT_ANCHOR_COORDINATE");
  assert.equal(nebula.anchor_id, "GS-A030");
  assert.equal(nebula.latitude, 35.999723);
  assert.equal(nebula.longitude, -114.740201);
  assert.equal(nebula.exact_coordinate_claim_allowed, true);
});

test("reusable assets do not receive invented coordinates", () => {
  const boulder = getGoldstrikeSpritePlacement("gs_large_boulder_cluster");
  assert.equal(boulder.placement_status, "PENDING_GEOMETRY_PLACEMENT");
  assert.equal(boulder.anchor_id, null);
  assert.equal(boulder.latitude, null);
  assert.equal(boulder.longitude, null);
  assert.equal(boulder.exact_coordinate_claim_allowed, false);
});

test("pending trail geometry uses the NPS public trail dataset gate", () => {
  const trail = getGoldstrikeSpritePlacement("gs_trail_patch_flat_01");
  const dryfall = getGoldstrikeSpritePlacement("gs_dryfall_rock_scramble");
  assert.equal(trail.geometry_source, "NPS_PUBLIC_TRAILS_GEOGRAPHIC");
  assert.equal(dryfall.geometry_source, "NPS_PUBLIC_TRAILS_GEOGRAPHIC");
});

test("placement validation blocks fake precision", () => {
  const report = validateGoldstrikeSpritePlacements();
  assert.equal(report.valid, true, JSON.stringify(report.issues, null, 2));
  assert.equal(report.issues.length, 0);
  assert.equal(listGoldstrikeExactSpritePlacements().length, 9);
  assert.equal(listGoldstrikePendingSpritePlacements().length, 75);
});
