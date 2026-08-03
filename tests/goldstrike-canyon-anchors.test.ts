import assert from "node:assert/strict";
import test from "node:test";

import {
  GOLDSTRIKE_ANCHORS,
  GOLDSTRIKE_ORIGIN,
  getGoldstrikeAccessState,
  getGoldstrikeAnchor,
  goldstrikeAnchorToUnityPosition,
  goldstrikeAnchorToUnrealPositionCm,
  validateGoldstrikeManifest,
  wgs84ToGoldstrikeLocal,
} from "@/lib/geospatial/goldstrike-canyon";
import { wgs84ToUtm } from "@/lib/geospatial/wgs84-utm";

test("Goldstrike Canyon uses trailhead parking as its stable origin", () => {
  assert.equal(GOLDSTRIKE_ORIGIN.id, "GS-A000");
  assert.equal(GOLDSTRIKE_ORIGIN.latitude, 36.00995);
  assert.equal(GOLDSTRIKE_ORIGIN.longitude, -114.7746);
  assert.equal(GOLDSTRIKE_ORIGIN.local_east_m, 0);
  assert.equal(GOLDSTRIKE_ORIGIN.local_north_m, 0);
});

test("all Goldstrike anchors reproduce their stored UTM and local coordinates", () => {
  const report = validateGoldstrikeManifest();

  assert.equal(
    report.valid,
    true,
    `Goldstrike anchor validation failed:\n${JSON.stringify(report.issues, null, 2)}`,
  );
  assert.equal(report.checkedAnchors, GOLDSTRIKE_ANCHORS.length);
  assert.equal(report.checkedAnchors, 7);
  assert.ok(report.maximumProjectionErrorM <= 0.02);
  assert.ok(report.maximumLocalOffsetErrorM <= 0.02);
});

test("the canyon reference lies east and south of trailhead parking", () => {
  const canyon = getGoldstrikeAnchor("GS-A020");

  assert.ok(canyon.local_east_m > 2_800);
  assert.ok(canyon.local_north_m < -1_000);
});

test("WGS84 conversion reproduces the district origin", () => {
  const projected = wgs84ToUtm(
    GOLDSTRIKE_ORIGIN.latitude,
    GOLDSTRIKE_ORIGIN.longitude,
    11,
  );

  assert.ok(Math.abs(projected.eastingM - GOLDSTRIKE_ORIGIN.utm_easting_m) <= 0.02);
  assert.ok(
    Math.abs(projected.northingM - GOLDSTRIKE_ORIGIN.utm_northing_m) <= 0.02,
  );
  assert.equal(projected.zone, 11);
  assert.equal(projected.hemisphere, "N");
});

test("engine coordinate mappings preserve the ENU contract", () => {
  const spring = getGoldstrikeAnchor("GS-A030");
  const unity = goldstrikeAnchorToUnityPosition("GS-A030", 225);
  const unreal = goldstrikeAnchorToUnrealPositionCm("GS-A030", 225);

  assert.deepEqual(unity, {
    x: spring.local_east_m,
    y: 225,
    z: spring.local_north_m,
  });

  assert.deepEqual(unreal, {
    x: spring.local_east_m * 100,
    y: spring.local_north_m * 100,
    z: 22_500,
  });
});

test("arbitrary WGS84 points convert into the Goldstrike local frame", () => {
  const spring = getGoldstrikeAnchor("GS-A040");
  const local = wgs84ToGoldstrikeLocal(
    spring.latitude,
    spring.longitude,
    230.5,
  );

  assert.ok(Math.abs(local.eastM - spring.local_east_m) <= 0.02);
  assert.ok(Math.abs(local.northM - spring.local_north_m) <= 0.02);
  assert.equal(local.upM, 230.5);
});

test("annual heat closure is encoded from May 15 through September 30", () => {
  assert.deepEqual(getGoldstrikeAccessState({ localDateIso: "2026-05-14" }), {
    localDateIso: "2026-05-14",
    landTrailOpenByEncodedPolicy: true,
    landTrailClosureReason: null,
    waterAccessOpenByEncodedPolicy: true,
    officialConditionsRefreshRequired: true,
  });

  assert.equal(
    getGoldstrikeAccessState({ localDateIso: "2026-05-15" })
      .landTrailClosureReason,
    "ANNUAL_HEAT_CLOSURE",
  );
  assert.equal(
    getGoldstrikeAccessState({ localDateIso: "2026-09-30" })
      .landTrailClosureReason,
    "ANNUAL_HEAT_CLOSURE",
  );
  assert.equal(
    getGoldstrikeAccessState({ localDateIso: "2026-10-01" })
      .landTrailClosureReason,
    null,
  );
});

test("forecast closure applies outside the annual closure at 95 Fahrenheit", () => {
  const state = getGoldstrikeAccessState({
    localDateIso: "2026-11-10",
    forecastHighF: 95,
  });

  assert.equal(state.landTrailOpenByEncodedPolicy, false);
  assert.equal(state.landTrailClosureReason, "FORECAST_HEAT_CLOSURE");
  assert.equal(state.waterAccessOpenByEncodedPolicy, true);
  assert.equal(state.officialConditionsRefreshRequired, true);
});
