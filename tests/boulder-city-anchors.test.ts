import assert from "node:assert/strict";
import test from "node:test";

import {
  BOULDER_CITY_ANCHORS,
  BOULDER_CITY_ORIGIN,
  boulderCityAnchorToUnityPosition,
  boulderCityAnchorToUnrealPositionCm,
  getBoulderCityAnchor,
  validateBoulderCityManifest,
  wgs84ToBoulderCityLocal,
} from "@/lib/geospatial/boulder-city";
import { wgs84ToUtm } from "@/lib/geospatial/wgs84-utm";

test("Boulder City manifest has a stable City Hall origin", () => {
  assert.equal(BOULDER_CITY_ORIGIN.id, "BC-A000");
  assert.equal(BOULDER_CITY_ORIGIN.latitude, 35.97874);
  assert.equal(BOULDER_CITY_ORIGIN.longitude, -114.83378);
  assert.equal(BOULDER_CITY_ORIGIN.local_east_m, 0);
  assert.equal(BOULDER_CITY_ORIGIN.local_north_m, 0);
});

test("all Boulder City anchors reproduce stored UTM and local coordinates", () => {
  const report = validateBoulderCityManifest();

  assert.equal(
    report.valid,
    true,
    `Boulder City anchor validation failed:\n${JSON.stringify(report.issues, null, 2)}`,
  );
  assert.equal(report.checkedAnchors, BOULDER_CITY_ANCHORS.length);
  assert.ok(report.checkedAnchors >= 15);
  assert.ok(report.maximumProjectionErrorM <= 0.02);
  assert.ok(report.maximumLocalOffsetErrorM <= 0.02);
});

test("airport runway thresholds preserve FAA geometry", () => {
  const runway09 = getBoulderCityAnchor("BC-A071");
  const runway27 = getBoulderCityAnchor("BC-A072");
  const runway15 = getBoulderCityAnchor("BC-A073");
  const runway33 = getBoulderCityAnchor("BC-A074");

  assert.equal(runway09.type, "runway_threshold");
  assert.equal(runway27.type, "runway_threshold");
  assert.equal(runway15.type, "runway_threshold");
  assert.equal(runway33.type, "runway_threshold");

  assert.ok(runway09.local_east_m < runway27.local_east_m);
  assert.ok(runway15.local_north_m > runway33.local_north_m);
  assert.ok(runway09.horizontal_accuracy_m <= 1);
  assert.ok(runway27.horizontal_accuracy_m <= 1);
  assert.ok(runway15.horizontal_accuracy_m <= 1);
  assert.ok(runway33.horizontal_accuracy_m <= 1);
});

test("WGS84 projection matches the Boulder City district origin", () => {
  const projected = wgs84ToUtm(
    BOULDER_CITY_ORIGIN.latitude,
    BOULDER_CITY_ORIGIN.longitude,
    11,
  );

  assert.ok(
    Math.abs(projected.eastingM - BOULDER_CITY_ORIGIN.utm_easting_m) <= 0.02,
  );
  assert.ok(
    Math.abs(projected.northingM - BOULDER_CITY_ORIGIN.utm_northing_m) <= 0.02,
  );
  assert.equal(projected.zone, 11);
  assert.equal(projected.hemisphere, "N");
});

test("engine coordinate mappings preserve the ENU contract", () => {
  const airport = getBoulderCityAnchor("BC-A070");
  const unity = boulderCityAnchorToUnityPosition("BC-A070", 671.5);
  const unreal = boulderCityAnchorToUnrealPositionCm("BC-A070", 671.5);

  assert.deepEqual(unity, {
    x: airport.local_east_m,
    y: 671.5,
    z: airport.local_north_m,
  });

  assert.deepEqual(unreal, {
    x: airport.local_east_m * 100,
    y: airport.local_north_m * 100,
    z: 67_150,
  });
});

test("arbitrary coordinates convert into the Boulder City local frame", () => {
  const museum = getBoulderCityAnchor("BC-A080");
  const local = wgs84ToBoulderCityLocal(
    museum.latitude,
    museum.longitude,
    740,
  );

  assert.ok(Math.abs(local.eastM - museum.local_east_m) <= 0.02);
  assert.ok(Math.abs(local.northM - museum.local_north_m) <= 0.02);
  assert.equal(local.upM, 740);
});
