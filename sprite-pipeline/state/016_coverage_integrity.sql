PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS coverage_dimensions (
  dimension TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL CHECK(asset_type IN ('character','fx','both')),
  required INTEGER NOT NULL DEFAULT 1 CHECK(required IN (0,1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coverage_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_id TEXT NOT NULL REFERENCES themes(id),
  dimension TEXT NOT NULL REFERENCES coverage_dimensions(dimension),
  value TEXT NOT NULL,
  min_count INTEGER NOT NULL CHECK(min_count >= 0),
  required INTEGER NOT NULL DEFAULT 1 CHECK(required IN (0,1)),
  created_at TEXT NOT NULL,
  UNIQUE(theme_id, dimension, value)
);

CREATE TABLE IF NOT EXISTS asset_coverage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  dimension TEXT NOT NULL REFERENCES coverage_dimensions(dimension),
  value TEXT NOT NULL,
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL,
  UNIQUE(asset_id, dimension, value)
);

CREATE TABLE IF NOT EXISTS coverage_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id),
  target_id INTEGER NOT NULL REFERENCES coverage_targets(id),
  observed_count INTEGER NOT NULL CHECK(observed_count >= 0),
  passed INTEGER NOT NULL CHECK(passed IN (0,1)),
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL,
  UNIQUE(run_id, target_id)
);

INSERT OR IGNORE INTO coverage_dimensions(dimension,asset_type,required,created_at) VALUES
('category','both',1,datetime('now')),
('subcategory','both',1,datetime('now')),
('action','character',1,datetime('now')),
('phase','character',1,datetime('now')),
('camera','both',1,datetime('now')),
('facing','both',1,datetime('now')),
('archetype','character',1,datetime('now')),
('age','character',1,datetime('now')),
('body','character',1,datetime('now')),
('height','character',1,datetime('now')),
('mobility','character',1,datetime('now')),
('costume','character',1,datetime('now')),
('arena_role','character',1,datetime('now')),
('expression','character',1,datetime('now')),
('silhouette','character',1,datetime('now')),
('fx_family','fx',1,datetime('now')),
('texture_type','fx',1,datetime('now')),
('destruction_sequence','fx',1,datetime('now')),
('background_variant','both',1,datetime('now')),
('engine_format','both',1,datetime('now'));

CREATE TRIGGER IF NOT EXISTS trg_coverage_dimensions_no_update BEFORE UPDATE ON coverage_dimensions BEGIN SELECT RAISE(ABORT,'coverage dimensions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_coverage_dimensions_no_delete BEFORE DELETE ON coverage_dimensions BEGIN SELECT RAISE(ABORT,'coverage dimensions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_coverage_targets_no_update BEFORE UPDATE ON coverage_targets BEGIN SELECT RAISE(ABORT,'coverage targets are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_coverage_targets_no_delete BEFORE DELETE ON coverage_targets BEGIN SELECT RAISE(ABORT,'coverage targets are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_asset_coverage_no_update BEFORE UPDATE ON asset_coverage BEGIN SELECT RAISE(ABORT,'asset coverage evidence is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_asset_coverage_no_delete BEFORE DELETE ON asset_coverage BEGIN SELECT RAISE(ABORT,'asset coverage evidence is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_coverage_results_no_update BEFORE UPDATE ON coverage_results BEGIN SELECT RAISE(ABORT,'coverage results are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_coverage_results_no_delete BEFORE DELETE ON coverage_results BEGIN SELECT RAISE(ABORT,'coverage results are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_asset_coverage_type_guard
BEFORE INSERT ON asset_coverage
BEGIN
  SELECT CASE
    WHEN (SELECT asset_type FROM coverage_dimensions WHERE dimension=NEW.dimension)='character'
      AND (SELECT asset_type FROM ownership WHERE asset_id=NEW.asset_id)!='character'
      THEN RAISE(ABORT,'character-only coverage dimension used by non-character asset')
    WHEN (SELECT asset_type FROM coverage_dimensions WHERE dimension=NEW.dimension)='fx'
      AND (SELECT asset_type FROM ownership WHERE asset_id=NEW.asset_id)!='fx'
      THEN RAISE(ABORT,'fx-only coverage dimension used by non-fx asset')
  END;
END;

CREATE INDEX IF NOT EXISTS idx_coverage_targets_theme ON coverage_targets(theme_id, dimension, value);
CREATE INDEX IF NOT EXISTS idx_asset_coverage_dimension ON asset_coverage(dimension, value, asset_id);
CREATE INDEX IF NOT EXISTS idx_coverage_results_run ON coverage_results(run_id, passed);
