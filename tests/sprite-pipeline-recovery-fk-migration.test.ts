import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const addPath = "db/migrations/20260731_sprite_pipeline_recovery_foreign_keys.sql";
const validatePath = "db/migrations/20260731_sprite_pipeline_recovery_validate_foreign_keys.sql";
const indexPath = "db/migrations/20260731_sprite_pipeline_recovery_indexes_concurrently.sql";

test("recovery foreign keys are added without validating historical rows in the same transaction", async () => {
  const sql = await readFile(addPath, "utf8");
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /NOT VALID;/g);
  assert.doesNotMatch(sql, /VALIDATE CONSTRAINT/);
  assert.doesNotMatch(sql, /CREATE INDEX/);
  assert.match(sql, /COMMIT;/m);
});

test("historical recovery rows are validated in a separate no-transaction migration", async () => {
  const sql = await readFile(validatePath, "utf8");
  assert.doesNotMatch(sql, /\bBEGIN\b|\bCOMMIT\b/);
  assert.match(sql, /VALIDATE CONSTRAINT sprite_locks_recovered_by_run_fk/);
  assert.match(sql, /VALIDATE CONSTRAINT sprite_locks_recovery_evidence_fk/);
});

test("recovery lookup indexes are created concurrently outside a transaction", async () => {
  const sql = await readFile(indexPath, "utf8");
  assert.doesNotMatch(sql, /\bBEGIN\b|\bCOMMIT\b/);
  assert.equal((sql.match(/CREATE INDEX CONCURRENTLY IF NOT EXISTS/g) ?? []).length >= 2, true);
});
