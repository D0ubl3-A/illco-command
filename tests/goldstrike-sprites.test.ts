import assert from "node:assert/strict";
import test from "node:test";

import {
  GOLDSTRIKE_SPRITE_SHEET,
  GOLDSTRIKE_SPRITES,
  getGoldstrikeSprite,
  getGoldstrikeSpriteCssStyle,
  getGoldstrikeSpriteUvRect,
  listGoldstrikeSpritesByCategory,
  listGoldstrikeSpritesForAnchor,
  validateGoldstrikeSpriteAtlas,
} from "@/lib/world/goldstrike-sprites";

test("Goldstrike atlas indexes all generated sprites", () => {
  assert.equal(GOLDSTRIKE_SPRITE_SHEET.frameCount, 84);
  assert.equal(GOLDSTRIKE_SPRITES.length, 84);
  assert.equal(GOLDSTRIKE_SPRITE_SHEET.width, 64);
  assert.equal(GOLDSTRIKE_SPRITE_SHEET.height, 84);
  assert.equal(
    GOLDSTRIKE_SPRITE_SHEET.gitBlobSha1,
    "93fa6f13c12c7ed3d9d0590ce8f3ffc422820c2c",
  );
});

test("Goldstrike frames, pivots and anchor links validate", () => {
  const report = validateGoldstrikeSpriteAtlas();
  assert.equal(
    report.valid,
    true,
    `Goldstrike sprite validation failed:\n${JSON.stringify(report.issues, null, 2)}`,
  );
  assert.equal(report.checkedSprites, 84);
});

test("Goldstrike UV rectangles stay normalized", () => {
  for (const sprite of GOLDSTRIKE_SPRITES) {
    const uv = getGoldstrikeSpriteUvRect(sprite.id);
    assert.ok(uv.u0 >= 0 && uv.u0 < uv.u1 && uv.u1 <= 1);
    assert.ok(uv.v0 >= 0 && uv.v0 < uv.v1 && uv.v1 <= 1);
  }
});

test("Goldstrike trailhead sprites resolve to GS-A010", () => {
  const sprites = listGoldstrikeSpritesForAnchor("GS-A010");
  assert.ok(
    sprites.some((sprite) => sprite.id === "gs_trailhead_entrance_sign"),
  );
  assert.ok(
    sprites.some((sprite) => sprite.id === "gs_trailhead_marker"),
  );
});

test("Goldstrike categories expose terrain, water and traversal assets", () => {
  assert.equal(listGoldstrikeSpritesByCategory("terrain_decal").length, 12);
  assert.equal(listGoldstrikeSpritesByCategory("river_shoreline").length, 12);
  assert.equal(listGoldstrikeSpritesByCategory("geothermal_water").length, 13);
  assert.equal(listGoldstrikeSpritesByCategory("traversal_obstacle").length, 9);
});

test("Goldstrike CSS crop style targets the verified atlas", () => {
  const sprite = getGoldstrikeSprite("gs_nebula_spring_marker");
  const style = getGoldstrikeSpriteCssStyle(sprite.id, 4);
  assert.equal(
    style.backgroundImage,
    "url(/world/goldstrike-canyon/sprites/sheets/goldstrike_all_far_lod.webp)",
  );
  assert.ok(style.backgroundPosition.includes("px"));
  assert.ok(style.backgroundSize.includes("px"));
});

test("invalid Goldstrike sprite scales are rejected", () => {
  assert.throws(
    () => getGoldstrikeSpriteCssStyle("gs_nebula_spring_marker", 0),
    /must be positive/,
  );
});
