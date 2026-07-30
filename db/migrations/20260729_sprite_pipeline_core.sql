BEGIN;

CREATE TABLE IF NOT EXISTS sprite_runs (
  id text PRIMARY KEY,
  theme_id text NOT NULL,
  theme_version text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  continuity_pointer text,
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 10000)
);

CREATE TABLE IF NOT EXISTS sprite_assets (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('character','fx')),
  ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 10000),
  owner_surgeon integer NOT NULL CHECK (owner_surgeon BETWEEN 1 AND 1000),
  state text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  operation_key char(64) NOT NULL UNIQUE,
  content_sha256 char(64),
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind, ordinal)
);

CREATE TABLE IF NOT EXISTS sprite_status_events (
  id bigserial PRIMARY KEY,
  asset_id text NOT NULL REFERENCES sprite_assets(id),
  from_state text,
  to_state text NOT NULL,
  run_id text NOT NULL REFERENCES sprite_runs(id),
  surgeon_id integer NOT NULL CHECK (surgeon_id BETWEEN 1 AND 1000),
  evidence_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprite_locks (
  lock_key text PRIMARY KEY,
  owner_run_id text NOT NULL,
  surgeon_id integer,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  CHECK (expires_at > acquired_at)
);

CREATE TABLE IF NOT EXISTS sprite_evidence (
  id bigserial PRIMARY KEY,
  control_id text NOT NULL,
  test_version text NOT NULL,
  raw_result jsonb NOT NULL,
  passed boolean NOT NULL,
  evidence_path text NOT NULL,
  evidence_sha256 char(64) NOT NULL,
  run_id text NOT NULL REFERENCES sprite_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprite_defects (
  id text PRIMARY KEY,
  subsystem text NOT NULL,
  severity integer NOT NULL CHECK (severity BETWEEN 1 AND 10),
  probability integer NOT NULL CHECK (probability BETWEEN 1 AND 10),
  impact integer NOT NULL CHECK (impact BETWEEN 1 AND 10),
  release_blocker boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  root_cause text,
  proposed_repair text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sprite_assets_state ON sprite_assets(state);
CREATE INDEX IF NOT EXISTS idx_sprite_events_asset ON sprite_status_events(asset_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sprite_evidence_run ON sprite_evidence(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sprite_defects_blockers ON sprite_defects(release_blocker, status, severity DESC);

COMMIT;
