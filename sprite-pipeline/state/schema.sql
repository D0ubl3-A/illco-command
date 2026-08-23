PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL REFERENCES themes(id),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  code_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  continuity_pointer TEXT,
  score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 10000)
);

CREATE TABLE IF NOT EXISTS surgeon_lanes (
  surgeon_id INTEGER PRIMARY KEY CHECK(surgeon_id BETWEEN 1 AND 1000),
  lane_start INTEGER NOT NULL,
  lane_end INTEGER NOT NULL,
  asset_type TEXT NOT NULL CHECK(asset_type IN ('character','fx')),
  immutable INTEGER NOT NULL DEFAULT 1 CHECK(immutable = 1)
);

CREATE TABLE IF NOT EXISTS ownership (
  asset_id TEXT PRIMARY KEY,
  surgeon_id INTEGER NOT NULL REFERENCES surgeon_lanes(surgeon_id),
  asset_type TEXT NOT NULL CHECK(asset_type IN ('character','fx')),
  ordinal INTEGER NOT NULL,
  UNIQUE(surgeon_id, ordinal)
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id TEXT PRIMARY KEY REFERENCES ownership(asset_id),
  theme_id TEXT NOT NULL REFERENCES themes(id),
  version INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL,
  subcategory TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('planned','queued','rendering','rendered_unvalidated','validated','packaged','published','retryable_failed','blocked','rejected_duplicate','rejected_quality','rejected_ip','rejected_policy','quarantined','retired','replaced')),
  filename TEXT UNIQUE,
  content_path TEXT UNIQUE,
  sha256 TEXT UNIQUE,
  prompt_version TEXT,
  provider TEXT,
  model_version TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS status_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  evidence_id INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(operation_key, asset_id, to_status)
);

CREATE TABLE IF NOT EXISTS locks (
  lock_key TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(id)
);

CREATE TABLE IF NOT EXISTS retries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  attempt INTEGER NOT NULL,
  failure_class TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(asset_id, attempt)
);

CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id),
  asset_id TEXT REFERENCES assets(asset_id),
  kind TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(relative_path),
  UNIQUE(sha256)
);

CREATE TABLE IF NOT EXISTS validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  test_name TEXT NOT NULL,
  passed INTEGER NOT NULL CHECK(passed IN (0,1)),
  raw_value TEXT,
  tool_version TEXT NOT NULL,
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS duplicates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_a TEXT NOT NULL REFERENCES assets(asset_id),
  asset_b TEXT NOT NULL REFERENCES assets(asset_id),
  method TEXT NOT NULL,
  raw_score REAL NOT NULL,
  threshold REAL NOT NULL,
  decision TEXT NOT NULL,
  evidence_id INTEGER REFERENCES evidence(id),
  UNIQUE(asset_a, asset_b, method)
);

CREATE TABLE IF NOT EXISTS archives (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  manifest_path TEXT NOT NULL UNIQUE,
  manifest_sha256 TEXT NOT NULL UNIQUE,
  immutable INTEGER NOT NULL DEFAULT 1 CHECK(immutable = 1),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  engine TEXT NOT NULL CHECK(engine IN ('unity','godot','unreal','generic')),
  relative_path TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS defects (
  issue_id TEXT PRIMARY KEY,
  severity INTEGER NOT NULL CHECK(severity BETWEEN 1 AND 10),
  probability INTEGER NOT NULL CHECK(probability BETWEEN 1 AND 10),
  impact INTEGER NOT NULL CHECK(impact BETWEEN 1 AND 10),
  detectability INTEGER NOT NULL CHECK(detectability BETWEEN 1 AND 10),
  blocker INTEGER NOT NULL CHECK(blocker IN (0,1)),
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS repairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id TEXT NOT NULL REFERENCES defects(issue_id),
  owner_surgeon INTEGER NOT NULL,
  description TEXT NOT NULL,
  evidence_id INTEGER REFERENCES evidence(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id),
  category TEXT NOT NULL,
  points INTEGER NOT NULL CHECK(points >= 0),
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_status_events_asset ON status_events(asset_id, created_at);
CREATE INDEX IF NOT EXISTS idx_validations_asset ON validations(asset_id, passed);
CREATE INDEX IF NOT EXISTS idx_defects_blocker ON defects(blocker, severity, status);
