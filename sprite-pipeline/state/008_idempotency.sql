PRAGMA foreign_keys = ON;

-- Canonical operation ledger. A logical operation may be claimed exactly once.
-- The composite UNIQUE guard prevents a caller from bypassing idempotency by
-- supplying a different operation_key for the same canonical inputs.
CREATE TABLE IF NOT EXISTS operation_results (
  operation_key TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL REFERENCES themes(id),
  theme_version INTEGER NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(id),
  surgeon_id INTEGER NOT NULL REFERENCES surgeon_lanes(surgeon_id),
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  prompt_version TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_version TEXT NOT NULL,
  attempt INTEGER NOT NULL CHECK(attempt >= 1),
  state TEXT NOT NULL CHECK(state IN ('claimed','completed','failed')),
  result_kind TEXT,
  result_ref TEXT,
  result_sha256 TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(theme_id, theme_version, run_id, surgeon_id, asset_id, prompt_version, provider, model_version, attempt)
);

CREATE TRIGGER IF NOT EXISTS operation_results_no_delete
BEFORE DELETE ON operation_results
BEGIN
  SELECT RAISE(ABORT, 'operation ledger is immutable');
END;

-- Canonical identity fields may never change after first claim.
CREATE TRIGGER IF NOT EXISTS operation_results_identity_immutable
BEFORE UPDATE ON operation_results
WHEN NEW.operation_key <> OLD.operation_key
  OR NEW.theme_id <> OLD.theme_id
  OR NEW.theme_version <> OLD.theme_version
  OR NEW.run_id <> OLD.run_id
  OR NEW.surgeon_id <> OLD.surgeon_id
  OR NEW.asset_id <> OLD.asset_id
  OR NEW.prompt_version <> OLD.prompt_version
  OR NEW.provider <> OLD.provider
  OR NEW.model_version <> OLD.model_version
  OR NEW.attempt <> OLD.attempt
  OR NEW.created_at <> OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'operation identity is immutable');
END;

-- Completed canonical results are final. Replays must read, never rewrite.
CREATE TRIGGER IF NOT EXISTS operation_results_completed_immutable
BEFORE UPDATE ON operation_results
WHEN OLD.state = 'completed'
BEGIN
  SELECT RAISE(ABORT, 'completed operation result is immutable');
END;

CREATE INDEX IF NOT EXISTS idx_operation_results_asset
ON operation_results(asset_id, state, created_at);
