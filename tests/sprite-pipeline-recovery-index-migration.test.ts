import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  process.cwd(),
  "db/migrations/20260731_sprite_pipeline_recovery_indexes_concurrently.sql",
);
const sql = readFileSync(migrationPath, "utf8");

test("recovery indexes use PostgreSQL concurrent creation", () => {
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => /CREATE\s+INDEX/i.test(statement));

  assert.equal(statements.length, 3);
  for (const statement of statements) {
    assert.match(statement, /CREATE\s+INDEX\s+CONCURRENTLY\s+IF\s+NOT\s+EXISTS/i);
  }
});

test("concurrent-index migration contains no transaction wrapper", () => {
  assert.doesNotMatch(sql, /\bBEGIN\s*;/i);
  assert.doesNotMatch(sql, /\bCOMMIT\s*;/i);
  assert.doesNotMatch(sql, /\bROLLBACK\s*;/i);
});

test("recovery indexes cover audit and stale-lock lookup paths", () => {
  assert.match(sql, /recovered_by_run_id/);
  assert.match(sql, /recovery_evidence_id/);
  assert.match(sql, /expires_at\s*,\s*lock_key/);
  assert.match(sql, /WHERE\s+released_at\s+IS\s+NULL/i);
});
