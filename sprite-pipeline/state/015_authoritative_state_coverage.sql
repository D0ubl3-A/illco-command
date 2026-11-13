PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS run_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id),
  step_key TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  evidence_id INTEGER REFERENCES evidence(id),
  UNIQUE(run_id, step_key)
);

CREATE TABLE IF NOT EXISTS asset_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  version INTEGER NOT NULL CHECK(version >= 1),
  content_sha256 TEXT,
  manifest_version INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(asset_id, version)
);

CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  prompt_version TEXT NOT NULL,
  bible_type TEXT NOT NULL CHECK(bible_type IN ('character','fx')),
  bible_id TEXT NOT NULL,
  bible_version INTEGER NOT NULL CHECK(bible_version >= 1),
  full_prompt TEXT NOT NULL,
  negatives TEXT,
  provider TEXT,
  model_version TEXT,
  parameters_json TEXT,
  prompt_sha256 TEXT NOT NULL CHECK(length(prompt_sha256)=64),
  created_at TEXT NOT NULL,
  UNIQUE(asset_id, prompt_version)
);

CREATE TABLE IF NOT EXISTS character_bibles (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version >= 1),
  name TEXT NOT NULL,
  bible_json TEXT NOT NULL,
  originality_declaration TEXT NOT NULL,
  prohibited_likeness_notes TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK(length(sha256)=64),
  locked INTEGER NOT NULL DEFAULT 1 CHECK(locked=1),
  created_at TEXT NOT NULL,
  PRIMARY KEY(id, version),
  UNIQUE(sha256)
);

CREATE TABLE IF NOT EXISTS fx_bibles (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version >= 1),
  name TEXT NOT NULL,
  bible_json TEXT NOT NULL,
  originality_declaration TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK(length(sha256)=64),
  locked INTEGER NOT NULL DEFAULT 1 CHECK(locked=1),
  created_at TEXT NOT NULL,
  PRIMARY KEY(id, version),
  UNIQUE(sha256)
);

CREATE TABLE IF NOT EXISTS sequence_bundles (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  asset_id TEXT REFERENCES assets(asset_id),
  sequence_type TEXT NOT NULL,
  camera TEXT,
  facing TEXT,
  frame_rate REAL NOT NULL CHECK(frame_rate > 0),
  duration REAL NOT NULL CHECK(duration >= 0),
  anticipation_frame INTEGER,
  contact_frame INTEGER,
  follow_through_frame INTEGER,
  recovery_frame INTEGER,
  pivot_json TEXT,
  fx_origin_json TEXT,
  fx_direction_json TEXT,
  fx_scale_json TEXT,
  collision_suggestion_json TEXT,
  sound_slot TEXT,
  completeness REAL NOT NULL DEFAULT 0 CHECK(completeness BETWEEN 0 AND 1),
  synchronization_passed INTEGER CHECK(synchronization_passed IN (0,1)),
  engine_export_result TEXT,
  evidence_id INTEGER REFERENCES evidence(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS frames (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_id TEXT NOT NULL REFERENCES sequence_bundles(id),
  asset_id TEXT REFERENCES assets(asset_id),
  frame_index INTEGER NOT NULL CHECK(frame_index >= 0),
  relative_path TEXT,
  sha256 TEXT CHECK(sha256 IS NULL OR length(sha256)=64),
  phase TEXT,
  pivot_json TEXT,
  evidence_id INTEGER REFERENCES evidence(id),
  created_at TEXT NOT NULL,
  UNIQUE(sequence_id, frame_index)
);

CREATE TABLE IF NOT EXISTS replacements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  old_asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  new_asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  reason TEXT NOT NULL,
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL,
  UNIQUE(old_asset_id, new_asset_id)
);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id),
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  unit TEXT,
  dimensions_json TEXT,
  observed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id),
  severity INTEGER NOT NULL CHECK(severity BETWEEN 1 AND 10),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence_id INTEGER REFERENCES evidence(id),
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TRIGGER IF NOT EXISTS trg_asset_versions_no_update BEFORE UPDATE ON asset_versions BEGIN SELECT RAISE(ABORT,'asset versions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_asset_versions_no_delete BEFORE DELETE ON asset_versions BEGIN SELECT RAISE(ABORT,'asset versions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_prompts_no_update BEFORE UPDATE ON prompts BEGIN SELECT RAISE(ABORT,'prompts are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_prompts_no_delete BEFORE DELETE ON prompts BEGIN SELECT RAISE(ABORT,'prompts are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_character_bibles_no_update BEFORE UPDATE ON character_bibles BEGIN SELECT RAISE(ABORT,'character bibles are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_character_bibles_no_delete BEFORE DELETE ON character_bibles BEGIN SELECT RAISE(ABORT,'character bibles are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_fx_bibles_no_update BEFORE UPDATE ON fx_bibles BEGIN SELECT RAISE(ABORT,'fx bibles are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_fx_bibles_no_delete BEFORE DELETE ON fx_bibles BEGIN SELECT RAISE(ABORT,'fx bibles are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_sequence_bundles_no_update BEFORE UPDATE ON sequence_bundles BEGIN SELECT RAISE(ABORT,'sequence bundles are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_sequence_bundles_no_delete BEFORE DELETE ON sequence_bundles BEGIN SELECT RAISE(ABORT,'sequence bundles are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_frames_no_update BEFORE UPDATE ON frames BEGIN SELECT RAISE(ABORT,'frames are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_frames_no_delete BEFORE DELETE ON frames BEGIN SELECT RAISE(ABORT,'frames are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_replacements_no_update BEFORE UPDATE ON replacements BEGIN SELECT RAISE(ABORT,'replacement lineage is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_replacements_no_delete BEFORE DELETE ON replacements BEGIN SELECT RAISE(ABORT,'replacement lineage is immutable'); END;

CREATE INDEX IF NOT EXISTS idx_prompts_asset ON prompts(asset_id, prompt_version);
CREATE INDEX IF NOT EXISTS idx_sequences_asset ON sequence_bundles(asset_id, sequence_type);
CREATE INDEX IF NOT EXISTS idx_frames_sequence ON frames(sequence_id, frame_index);
CREATE INDEX IF NOT EXISTS idx_metrics_run_name ON metrics(run_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_alerts_run_severity ON alerts(run_id, severity, resolved_at);
