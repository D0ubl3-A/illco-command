import assert from "node:assert/strict";
import test from "node:test";

import {
  GOLDSTRIKE_SPRITE_PLACEMENTS,
  getGoldstrikeSpritePlacement,
  getGoldstrikeSpritePlacementCoverage,
  listGoldstrikeCoordinateAssociatedPlacements,
  listGoldstrikeExactSpritePlacements,
  listGoldstrikePendingSpritePlacements,
  listGoldstrikePublishedReferencePlacements,
  validateGoldstrikeSpritePlacements,
} from "@/lib/world/goldstrike-sprite-placements";
import {
  getGoldstrikeRouteReferenceWaypoint,
} from "@/lib/world/goldstrike-route-reference-waypoints";

test("every Goldstrike sprite has a placement record", () => {
  assert.equal(GOLDSTRIKE_SPRITE_PLACEMENTS.length, 84);
});

test("coordinate coverage distinguishes exact anchors from published references", () => {
  const coverage = getGoldstrikeSpritePlacementCoverage();
  assert.equal(coverage.totalSprites, 84);
  assert.equal(coverage.exactAnchorCoordinateSprites, 8);
  assert.equal(coverage.publishedFeatureReferenceSprites, 10);
  assert.equal(coverage.coordinateAssociatedSprites, 18);
  assert.equal(coverage.pendingGeometrySprites, 66);
  assert.equal(coverage.complete, false);
  assert.ok(
    Math.abs(coverage.exactCoveragePercent - 9.523809523809524) < 1e-12,
  );
  assert.ok(
    Math.abs(coverage.coordinateCoveragePercent - 21.428571428571427) < 1e-12,
  );
});

test("exact placements still inherit geographic anchor coordinates", () => {
  const nebula = getGoldstrikeSpritePlacement("gs_nebula_spring_marker");
  assert.equal(nebula.placement_status, "EXACT_ANCHOR_COORDINATE");
  assert.equal(nebula.anchor_id, "GS-A030");
  assert.equal(nebula.latitude, 35.999723);
  assert.equal(nebula.longitude, -114.740201);
  assert.equal(nebula.exact_coordinate_claim_allowed, true);
});

test("hot-springs marker uses the published hot-springs waypoint instead of canyon reference", () => {
  const marker = getGoldstrikeSpritePlacement(
    "gs_gold_strike_hot_springs_marker",
  );
  assert.equal(marker.placement_status, "PUBLISHED_FEATURE_REFERENCE");
  assert.equal(marker.anchor_id, null);
  assert.equal(marker.reference_id, "GS-WP-HOTSPRINGS");
  assert.equal(marker.latitude, 36.00311);
  assert.equal(marker.longitude, -114.74994);
  assert.equal(marker.reference_match_status, "DIRECT_FEATURE_MATCH");
  assert.equal(marker.exact_coordinate_claim_allowed, false);
});

test("published stair waypoint matches the stair sprite and technical-area proxies", () => {
  const waypoint = getGoldstrikeRouteReferenceWaypoint("GS-WP-STAIR");
  assert.equal(waypoint.latitude, 36.00132);
  assert.equal(waypoint.longitude, -114.75523);

  const stairs = getGoldstrikeSpritePlacement("gs_natural_stone_steps");
  assert.equal(stairs.reference_id, "GS-WP-STAIR");
  assert.equal(stairs.reference_match_status, "DIRECT_FEATURE_MATCH");
  assert.equal(stairs.latitude, waypoint.latitude);
  assert.equal(stairs.longitude, waypoint.longitude);

  const handline = getGoldstrikeSpritePlacement("gs_handline_traverse");
  assert.equal(handline.reference_id, "GS-WP-STAIR");
  assert.equal(handline.reference_match_status, "FEATURE_AREA_PROXY");
  assert.equal(handline.exact_coordinate_claim_allowed, false);
});

test("published boulder waypoint constrains multiple game-art obstacle proxies", () => {
  const boulder = getGoldstrikeSpritePlacement("gs_large_boulder_cluster");
  const obstacle = getGoldstrikeSpritePlacement("gs_low_boulder_obstacle");
  assert.equal(boulder.reference_id, "GS-WP-UPANDOVER");
  assert.equal(obstacle.reference_id, "GS-WP-UPANDOVER");
  assert.equal(boulder.reference_match_status, "FEATURE_AREA_PROXY");
  assert.equal(obstacle.reference_match_status, "FEATURE_AREA_PROXY");
});

test("river endpoint is a reference coordinate, not an exact shoreline survey", () => {
  const river = getGoldstrikeSpritePlacement("gs_calm_river_edge");
  assert.equal(river.placement_status, "PUBLISHED_FEATURE_REFERENCE");
  assert.equal(river.reference_id, "GS-WP-RIVER");
  assert.ok(Math.abs((river.latitude ?? 0) - 36.0002777778) < 1e-10);
  assert.equal(river.longitude, -114.7425);
  assert.equal(river.reference_match_status, "FEATURE_AREA_PROXY");
  assert.equal(river.exact_coordinate_claim_allowed, false);
});

test("unmatched reusable assets still do not receive invented coordinates", () => {
  const cliff = getGoldstrikeSpritePlacement("gs_tall_cliff_pillar");
  assert.equal(cliff.placement_status, "PENDING_GEOMETRY_PLACEMENT");
  assert.equal(cliff.anchor_id, null);
  assert.equal(cliff.reference_id, null);
  assert.equal(cliff.latitude, null);
  assert.equal(cliff.longitude, null);
  assert.equal(cliff.exact_coordinate_claim_allowed, false);
});

test("pending trail geometry still uses the NPS public trail dataset gate", () => {
  const trail = getGoldstrikeSpritePlacement("gs_trail_patch_flat_01");
  assert.equal(trail.geometry_source, "NPS_PUBLIC_TRAILS_GEOGRAPHIC");
  assert.equal(trail.placement_status, "PENDING_GEOMETRY_PLACEMENT");
});

test("placement validation blocks fake precision while allowing qualified references", () => {
  const report = validateGoldstrikeSpritePlacements();
  assert.equal(report.valid, true, JSON.stringify(report.issues, null, 2));
  assert.equal(report.issues.length, 0);
  assert.equal(listGoldstrikeExactSpritePlacements().length, 8);
  assert.equal(listGoldstrikePublishedReferencePlacements().length, 10);
  assert.equal(listGoldstrikeCoordinateAssociatedPlacements().length, 18);
  assert.equal(listGoldstrikePendingSpritePlacements().length, 66);
});
