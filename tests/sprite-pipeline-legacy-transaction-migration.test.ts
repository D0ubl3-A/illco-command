import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SQL = readFileSync(
  new URL("../db/migrations/20260730_sprite_pipeline_transactions.sql", import.meta.url),
  "utf8",
);

test("recovery tracking columns have authoritative foreign keys", () => {
  assert.match(SQL, /recovered_by_run_id text REFERENCES sprite_runs\(id\) ON DELETE RESTRICT/i);
  assert.match(SQL, /recovery_evidence_id bigint REFERENCES sprite_evidence\(id\) ON DELETE RESTRICT/i);
  assert.match(SQL, /Valid recovery evidence is required/i);
  assert.match(SQL, /Recovery owner run .* does not exist/i);
});

test("legacy transition API fails closed instead of accepting target-state replay", () => {
  assert.match(SQL, /transition_sprite_asset is deprecated; use transition_sprite_asset_v2/i);
  assert.doesNotMatch(SQL, /IF current_asset\.state = p_next_state\s+THEN\s+RETURN current_asset/is);
});

test("legacy migration does not claim timestamp-based exactly-once uniqueness", () => {
  assert.doesNotMatch(SQL, /CREATE UNIQUE INDEX[\s\S]*created_at/i);
  assert.match(SQL, /idx_sprite_events_transition_lookup/i);
});
