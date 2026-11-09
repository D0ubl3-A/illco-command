import assert from "node:assert/strict";
import test from "node:test";
import { initialState, transition } from "./create-water-controller";

test("full lake fishing loop and replay", () => {
  let s = transition(initialState, { type: "PLACE_LAKE", position: { x: 0, y: 0, z: -1.5 } });
  assert.equal(s.phase, "ready");
  s = transition(s, { type: "CAST" });
  assert.equal(s.phase, "cast");
  for (let i = 0; i < 13; i++) s = transition(s, { type: "TICK", deltaSeconds: 0.2 });
  assert.equal(s.phase, "bite");
  s = transition(s, { type: "HOOK" });
  assert.equal(s.phase, "hooked");
  for (let i = 0; i < 5; i++) s = transition(s, { type: "REEL", amount: 0.2 });
  assert.equal(s.phase, "caught");
  assert.equal(s.catchCount, 1);
  s = transition(s, { type: "REPLAY" });
  assert.equal(s.phase, "ready");
  assert.equal(s.catchCount, 1);
});
test("cannot cast before lake placement", () => {
  assert.equal(transition(initialState, { type: "CAST" }).phase, "placement");
});
test("invalid coordinates rejected", () => {
  assert.equal(transition(initialState, { type: "PLACE_LAKE", position: { x: NaN, y: 0, z: 0 } }).phase, "placement");
});
test("reeling before hook does not advance", () => {
  const s = transition(initialState, { type: "REEL", amount: 1 });
  assert.equal(s.reelProgress, 0);
});
