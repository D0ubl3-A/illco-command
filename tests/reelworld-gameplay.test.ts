import test from "node:test";
import assert from "node:assert/strict";
import {
  FISH_CATALOG,
  REAL_MONEY_TOURNAMENTS_ENABLED,
  candidateFish,
  constrainPointToWater,
  fightStep,
  fishVisualScale,
  hookSetProbability,
  lineSnapThreshold,
  makeFish,
  reelGestureAccepted,
  regionFor,
  retrieveEffect,
  waterKindFromGeometry,
} from "../app/apps/reelworld-go/game-engine";

test("small/container fish are capped to plausible visual and weight scale", () => {
  const bluegill = FISH_CATALOG.find(f => f.species === "Bluegill")!;
  const fish = makeFish(bluegill, "container", () => .99);
  assert.ok(fish.weight <= .6);
  assert.ok(fish.visualScale <= .7);
});

test("large lake fish can exceed small-water limits", () => {
  const striped = FISH_CATALOG.find(f => f.species === "Striped Bass")!;
  const fish = makeFish(striped, "lake", () => .95);
  assert.ok(fish.weight > 20);
  assert.ok(fish.visualScale > .7);
});

test("weak line snaps sooner than strong line", () => {
  assert.ok(lineSnapThreshold(4, 70) < lineSnapThreshold(20, 70));
});

test("tight drag increases snap risk compared with loose drag", () => {
  assert.ok(lineSnapThreshold(10, 90) < lineSnapThreshold(10, 20));
});

test("missed hook set is less likely with a badly mismatched hook", () => {
  const poor = hookSetProbability(18, 12, 3, "motion");
  const good = hookSetProbability(18, 2, 10, "motion");
  assert.ok(poor < good);
  assert.ok(poor < .5);
});

test("successful motion hook set can exceed tap probability", () => {
  assert.ok(hookSetProbability(4, 6, 10, "motion") > hookSetProbability(4, 6, 0, "tap"));
});

test("fish can escape on severe slack", () => {
  const next = fightStep({ tension: 0, stamina: 100, progress: 25, status: "fighting" }, {
    reeling: false, drag: 40, lineLb: 12, fishWeight: 4, fishPower: 1, rodDamping: 1, jolt: 0,
  });
  assert.equal(next.status, "escaped");
});

test("fish can be landed after stamina/progress fight", () => {
  const next = fightStep({ tension: 50, stamina: 8, progress: 99, status: "fighting" }, {
    reeling: true, drag: 55, lineLb: 20, fishWeight: 3, fishPower: .6, rodDamping: .7, jolt: 0,
  });
  assert.equal(next.status, "landed");
});

test("jigging requires meaningful jig energy", () => {
  assert.ok(retrieveEffect("jig", { speedMps: 0, jigEnergy: .8, bait: "worms" }) > retrieveEffect("jig", { speedMps: 0, jigEnergy: .05, bait: "worms" }));
});

test("trolling requires plausible movement speed", () => {
  assert.ok(retrieveEffect("troll", { speedMps: 1.5, jigEnergy: 0, bait: "minnows" }) > 1);
  assert.ok(retrieveEffect("troll", { speedMps: 0, jigEnergy: 0, bait: "minnows" }) < 1);
});

test("spinnerbait gets its dedicated retrieve bonus", () => {
  assert.ok(retrieveEffect("spinner", { speedMps: 0, jigEnergy: 0, bait: "spinner" }) > 1);
  assert.ok(retrieveEffect("spinner", { speedMps: 0, jigEnergy: 0, bait: "worms" }) < 1);
});

test("touch reel direction honors handedness", () => {
  assert.equal(reelGestureAccepted(-.4, "right"), true);
  assert.equal(reelGestureAccepted(.4, "right"), false);
  assert.equal(reelGestureAccepted(.4, "left"), true);
  assert.equal(reelGestureAccepted(-.4, "left"), false);
});

test("water geometry constrains sprites inside detected region", () => {
  const bounds = { left: .2, top: .35, right: .8, bottom: .9, coverage: .42 };
  const p = constrainPointToWater(.99, .05, bounds);
  assert.ok(p.x <= .76 && p.x >= .24);
  assert.ok(p.y >= .39 && p.y <= .86);
});

test("water geometry distinguishes contained from open water", () => {
  assert.equal(waterKindFromGeometry({ left: .42, top: .5, right: .58, bottom: .8, coverage: .05 }), "container");
  assert.equal(waterKindFromGeometry({ left: .05, top: .4, right: .95, bottom: .95, coverage: .7 }), "lake");
});

test("Southwest water candidates are context filtered", () => {
  const region = regionFor(36.17, -115.14);
  assert.equal(region, "southwest");
  const species = candidateFish(region, "lake", "spinner", 4).map(f => f.species);
  assert.ok(species.includes("Largemouth Bass") || species.includes("Striped Bass"));
  assert.ok(!species.includes("Northern Pike"));
});

test("real-money tournament mode stays disabled until compliance backend exists", () => {
  assert.equal(REAL_MONEY_TOURNAMENTS_ENABLED, false);
});

test("fish visual scale grows monotonically with weight within same water", () => {
  assert.ok(fishVisualScale(8, 20, "lake") > fishVisualScale(1, 20, "lake"));
});
