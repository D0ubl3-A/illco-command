import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SQL = readFileSync(
  new URL("../db/migrations/20260731_sprite_pipeline_replay_tokens.sql", import.meta.url),
  "utf8",
);

test("replay migration persists canonical operation results", () => {
  assert.match(SQL, /CREATE TABLE IF NOT EXISTS sprite_operation_replays/i);
  assert.match(SQL, /operation_key char\(64\) PRIMARY KEY/i);
  assert.match(SQL, /result_asset_version integer NOT NULL/i);
  assert.match(SQL, /result_content_sha256 char\(64\)/i);
});

test("transition v2 locks replay and asset rows before mutation", () => {
  assert.match(SQL, /WHERE operation_key = p_operation_key\s+FOR UPDATE/is);
  assert.match(SQL, /WHERE id = p_asset_id\s+FOR UPDATE/is);
});

test("replay payload divergence and canonical result drift fail closed", () => {
  assert.match(SQL, /operation key replay payload mismatch/i);
  assert.match(SQL, /canonical replay result diverged/i);
  assert.match(SQL, /version = version \+ 1/i);
});

test("completion transitions require evidence and append one event", () => {
  assert.match(SQL, /rendered_unvalidated','validated','packaged','published/i);
  assert.match(SQL, /Evidence is required for completion state/i);
  assert.match(SQL, /INSERT INTO sprite_status_events/i);
  assert.match(SQL, /idx_sprite_events_transition_operation/i);
});
