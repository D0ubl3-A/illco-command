BEGIN;

CREATE TABLE IF NOT EXISTS sprite_runs (
  id text PRIMARY KEY,
  theme_id text NOT NULL,
  theme_version text NOT NULL,
  status text NOT NULL CHECK (status IN (
    'planned','running','recovering','blocked','completed','failed','cancelled'
  )),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  continuity_pointer text,
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 10000),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE IF NOT EXISTS sprite_assets (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('character','fx')),
  ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 10000),
  owner_surgeon integer NOT NULL CHECK (owner_surgeon BETWEEN 1 AND 1000),
  state text NOT NULL CHECK (state IN (
    'planned','queued','rendering','rendered_unvalidated','validated','packaged','published',
    'retryable_failed','blocked','rejected_duplicate','rejected_quality','rejected_ip',
    'rejected_policy','quarantined','retired','replaced'
  )),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  operation_key char(64) NOT NULL UNIQUE CHECK (operation_key ~ '^[0-9a-f]{64}$'),
  content_sha256 char(64) CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$'),
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind, ordinal),
  CHECK (updated_at >= created_at)
);

CREATE TABLE IF NOT EXISTS sprite_evidence (
  id bigserial PRIMARY KEY,
  control_id text NOT NULL CHECK (btrim(control_id) <> ''),
  test_version text NOT NULL CHECK (btrim(test_version) <> ''),
  raw_result jsonb NOT NULL,
  passed boolean NOT NULL,
  evidence_path text NOT NULL CHECK (btrim(evidence_path) <> ''),
  evidence_sha256 char(64) NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  run_id text NOT NULL REFERENCES sprite_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprite_status_events (
  id bigserial PRIMARY KEY,
  asset_id text NOT NULL REFERENCES sprite_assets(id),
  from_state text CHECK (from_state IS NULL OR from_state IN (
    'planned','queued','rendering','rendered_unvalidated','validated','packaged','published',
    'retryable_failed','blocked','rejected_duplicate','rejected_quality','rejected_ip',
    'rejected_policy','quarantined','retired','replaced'
  )),
  to_state text NOT NULL CHECK (to_state IN (
    'planned','queued','rendering','rendered_unvalidated','validated','packaged','published',
    'retryable_failed','blocked','rejected_duplicate','rejected_quality','rejected_ip',
    'rejected_policy','quarantined','retired','replaced'
  )),
  run_id text NOT NULL REFERENCES sprite_runs(id),
  surgeon_id integer NOT NULL CHECK (surgeon_id BETWEEN 1 AND 1000),
  evidence_id bigint REFERENCES sprite_evidence(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_state IS NULL OR from_state <> to_state)
);

CREATE TABLE IF NOT EXISTS sprite_locks (
  lock_key text PRIMARY KEY CHECK (btrim(lock_key) <> ''),
  owner_run_id text NOT NULL REFERENCES sprite_runs(id),
  surgeon_id integer CHECK (surgeon_id IS NULL OR surgeon_id BETWEEN 1 AND 1000),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  CHECK (expires_at > acquired_at),
  CHECK (heartbeat_at >= acquired_at),
  CHECK (released_at IS NULL OR released_at >= acquired_at)
);

CREATE TABLE IF NOT EXISTS sprite_defects (
  id text PRIMARY KEY,
  subsystem text NOT NULL CHECK (btrim(subsystem) <> ''),
  severity integer NOT NULL CHECK (severity BETWEEN 1 AND 10),
  probability integer NOT NULL CHECK (probability BETWEEN 1 AND 10),
  impact integer NOT NULL CHECK (impact BETWEEN 1 AND 10),
  release_blocker boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN (
    'open','triaged','repairing','validating','resolved','wont_fix','duplicate','quarantined'
  )),
  root_cause text,
  proposed_repair text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CHECK (closed_at IS NULL OR closed_at >= opened_at),
  CHECK ((status IN ('resolved','wont_fix','duplicate')) = (closed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_sprite_assets_state ON sprite_assets(state);
CREATE INDEX IF NOT EXISTS idx_sprite_events_asset ON sprite_status_events(asset_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sprite_evidence_run ON sprite_evidence(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sprite_defects_blockers ON sprite_defects(release_blocker, status, severity DESC);

COMMIT;
