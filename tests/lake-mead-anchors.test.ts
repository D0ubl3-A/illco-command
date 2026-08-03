import assert from "node:assert/strict";
import test from "node:test";

import {
  LAKE_MEAD_ANCHORS,
  LAKE_MEAD_ORIGIN,
  anchorToUnityPosition,
  anchorToUnrealPositionCm,
  getLakeMeadAnchor,
  validateLakeMeadManifest,
  wgs84ToLakeMeadLocal,
} from "@/lib/geospatial/lake-mead";
import { wgs84ToUtm } from "@/lib/geospatial/wgs84-utm";

test("Lake Mead manifest has a stable Hemenway Harbor origin", () => {
  assert.equal(LAKE_MEAD_ORIGIN.id, "LM-A000");
  assert.equal(LAKE_MEAD_ORIGIN.latitude, 36.026625833);
  assert.equal(LAKE_MEAD_ORIGIN.longitude, -114.782746944);
  assert.equal(LAKE_MEAD_ORIGIN.local_east_m, 0);
  assert.equal(LAKE_MEAD_ORIGIN.local_north_m, 0);
});

test("all Lake Mead anchors reproduce their stored UTM and local coordinates", () => {
  const report = validateLakeMeadManifest();

  assert.equal(
    report.valid,
    true,
    `Lake Mead anchor validation failed:\n${JSON.stringify(report.issues, null, 2)}`,
  );
  assert.equal(report.checkedAnchors, LAKE_MEAD_ANCHORS.length);
  assert.ok(report.checkedAnchors >= 16);
  assert.ok(report.maximumProjectionErrorM <= 0.02);
  assert.ok(report.maximumLocalOffsetErrorM <= 0.02);
});

test("Hoover Dam is anchored east and south of Hemenway Harbor", () => {
  const dam = getLakeMeadAnchor("LM-A060");

  assert.equal(dam.latitude, 36.0163);
  assert.equal(dam.longitude, -114.7374);
  assert.ok(dam.local_east_m > 4_100);
  assert.ok(dam.local_north_m < -1_000);
});

test("WGS84 to UTM conversion matches the stored district origin", () => {
  const projected = wgs84ToUtm(
    LAKE_MEAD_ORIGIN.latitude,
    LAKE_MEAD_ORIGIN.longitude,
    11,
  );

  assert.ok(
    Math.abs(projected.eastingM - LAKE_MEAD_ORIGIN.utm_easting_m) <= 0.02,
  );
  assert.ok(
    Math.abs(projected.northingM - LAKE_MEAD_ORIGIN.utm_northing_m) <= 0.02,
  );
  assert.equal(projected.zone, 11);
  assert.equal(projected.hemisphere, "N");
});

test("engine coordinate mappings preserve the ENU contract", () => {
  const bridge = getLakeMeadAnchor("LM-A070");
  const unity = anchorToUnityPosition("LM-A070", 500);
  const unreal = anchorToUnrealPositionCm("LM-A070", 500);

  assert.deepEqual(unity, {
    x: bridge.local_east_m,
    y: 500,
    z: bridge.local_north_m,
  });

  assert.deepEqual(unreal, {
    x: bridge.local_east_m * 100,
    y: bridge.local_north_m * 100,
    z: 50_000,
  });
});

test("arbitrary WGS84 points convert into the Lake Mead local frame", () => {
  const powerPlant = getLakeMeadAnchor("LM-A061");
  const local = wgs84ToLakeMeadLocal(
    powerPlant.latitude,
    powerPlant.longitude,
    303.6,
  );

  assert.ok(Math.abs(local.eastM - powerPlant.local_east_m) <= 0.02);
  assert.ok(Math.abs(local.northM - powerPlant.local_north_m) <= 0.02);
  assert.equal(local.upM, 303.6);
});
