PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS duplicate_thresholds (
  method TEXT PRIMARY KEY,
  threshold REAL NOT NULL,
  comparator TEXT NOT NULL CHECK(comparator IN ('lte','gte','eq')),
  tool_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO duplicate_thresholds(method, threshold, comparator, tool_version) VALUES
  ('sha256', 1.0, 'eq', 'builtin-sha256-v1'),
  ('phash', 8.0, 'lte', 'imagehash-v1'),
  ('dhash', 8.0, 'lte', 'imagehash-v1'),
  ('silhouette', 0.95, 'gte', 'silhouette-iou-v1'),
  ('pose', 0.94, 'gte', 'pose-sim-v1'),
  ('palette', 0.96, 'gte', 'palette-sim-v1'),
  ('prompt', 0.97, 'gte', 'prompt-embedding-v1'),
  ('fx_geometry', 0.95, 'gte', 'fx-geometry-v1');

CREATE TABLE IF NOT EXISTS asset_signatures (
  asset_id TEXT PRIMARY KEY REFERENCES assets(asset_id),
  sha256 TEXT NOT NULL,
  phash TEXT NOT NULL,
  dhash TEXT NOT NULL,
  silhouette_signature TEXT NOT NULL,
  pose_signature TEXT NOT NULL,
  palette_signature TEXT NOT NULL,
  prompt_signature TEXT NOT NULL,
  fx_geometry_signature TEXT,
  tool_versions_json TEXT NOT NULL,
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sha256)
);

CREATE TABLE IF NOT EXISTS duplicate_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_a TEXT NOT NULL REFERENCES assets(asset_id),
  asset_b TEXT NOT NULL REFERENCES assets(asset_id),
  method TEXT NOT NULL REFERENCES duplicate_thresholds(method),
  raw_score REAL NOT NULL,
  threshold REAL NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('pending','allow_sequence','allow_exception','reject_duplicate','not_duplicate')),
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  tool_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(asset_a < asset_b),
  UNIQUE(asset_a, asset_b, method)
);

CREATE TABLE IF NOT EXISTS similarity_exceptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_a TEXT NOT NULL REFERENCES assets(asset_id),
  asset_b TEXT NOT NULL REFERENCES assets(asset_id),
  method TEXT NOT NULL REFERENCES duplicate_thresholds(method),
  reason TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(asset_a < asset_b),
  UNIQUE(asset_a, asset_b, method)
);

CREATE TRIGGER IF NOT EXISTS trg_asset_signatures_no_update
BEFORE UPDATE ON asset_signatures
BEGIN
  SELECT RAISE(ABORT, 'asset signatures are immutable; create replacement asset/version');
END;

CREATE TRIGGER IF NOT EXISTS trg_asset_signatures_no_delete
BEFORE DELETE ON asset_signatures
BEGIN
  SELECT RAISE(ABORT, 'asset signatures are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_duplicate_thresholds_no_update
BEFORE UPDATE ON duplicate_thresholds
BEGIN
  SELECT RAISE(ABORT, 'duplicate thresholds are immutable; version the method');
END;

CREATE TRIGGER IF NOT EXISTS trg_duplicate_thresholds_no_delete
BEFORE DELETE ON duplicate_thresholds
BEGIN
  SELECT RAISE(ABORT, 'duplicate thresholds are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_duplicate_candidates_no_update
BEFORE UPDATE ON duplicate_candidates
BEGIN
  SELECT RAISE(ABORT, 'duplicate decisions are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_duplicate_candidates_no_delete
BEFORE DELETE ON duplicate_candidates
BEGIN
  SELECT RAISE(ABORT, 'duplicate decisions are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_similarity_exceptions_no_update
BEFORE UPDATE ON similarity_exceptions
BEGIN
  SELECT RAISE(ABORT, 'similarity exceptions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_similarity_exceptions_no_delete
BEFORE DELETE ON similarity_exceptions
BEGIN
  SELECT RAISE(ABORT, 'similarity exceptions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_signature_asset_hash_match
BEFORE INSERT ON asset_signatures
WHEN EXISTS(
  SELECT 1 FROM assets a
  WHERE a.asset_id = NEW.asset_id
    AND a.sha256 IS NOT NULL
    AND lower(a.sha256) <> lower(NEW.sha256)
)
BEGIN
  SELECT RAISE(ABORT, 'signature SHA-256 does not match registered asset SHA-256');
END;
