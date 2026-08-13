BEGIN;

CREATE TABLE IF NOT EXISTS sprite_bibles (
  id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  kind text NOT NULL CHECK (kind IN ('character','fx','texture')),
  name text NOT NULL,
  specification jsonb NOT NULL,
  originality_declaration text NOT NULL,
  prohibited_likeness_notes text NOT NULL DEFAULT '',
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  content_sha256 char(64) NOT NULL,
  PRIMARY KEY (id, version),
  CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof(specification) = 'object')
);

CREATE TABLE IF NOT EXISTS sprite_action_grammars (
  id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  action text NOT NULL,
  required_phases jsonb NOT NULL,
  optional_phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  illegal_orders jsonb NOT NULL DEFAULT '[]'::jsonb,
  min_frames integer NOT NULL CHECK (min_frames > 0),
  max_frames integer NOT NULL CHECK (max_frames >= min_frames),
  timing_rules jsonb NOT NULL,
  content_sha256 char(64) NOT NULL,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version),
  CHECK (jsonb_typeof(required_phases) = 'array'),
  CHECK (jsonb_array_length(required_phases) > 0),
  CHECK (content_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE TABLE IF NOT EXISTS sprite_sequence_bundles (
  id text PRIMARY KEY,
  asset_id text NOT NULL REFERENCES sprite_assets(id),
  bible_id text NOT NULL,
  bible_version integer NOT NULL,
  grammar_id text NOT NULL,
  grammar_version integer NOT NULL,
  frame_rate numeric(8,3) NOT NULL CHECK (frame_rate > 0),
  duration_ms integer NOT NULL CHECK (duration_ms > 0),
  facing text NOT NULL,
  camera text NOT NULL,
  pivot jsonb NOT NULL,
  synchronization jsonb NOT NULL,
  engine_export_result jsonb,
  completeness_passed boolean NOT NULL DEFAULT false,
  timing_passed boolean NOT NULL DEFAULT false,
  evidence_id bigint REFERENCES sprite_evidence(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (bible_id, bible_version) REFERENCES sprite_bibles(id, version),
  FOREIGN KEY (grammar_id, grammar_version) REFERENCES sprite_action_grammars(id, version),
  CHECK (jsonb_typeof(pivot) = 'object'),
  CHECK (jsonb_typeof(synchronization) = 'object')
);

CREATE TABLE IF NOT EXISTS sprite_sequence_frames (
  sequence_id text NOT NULL REFERENCES sprite_sequence_bundles(id) ON DELETE RESTRICT,
  frame_index integer NOT NULL CHECK (frame_index >= 0),
  asset_version integer NOT NULL CHECK (asset_version > 0),
  phase text NOT NULL,
  timestamp_ms integer NOT NULL CHECK (timestamp_ms >= 0),
  contact boolean NOT NULL DEFAULT false,
  recovery boolean NOT NULL DEFAULT false,
  file_sha256 char(64) NOT NULL,
  PRIMARY KEY (sequence_id, frame_index),
  CHECK (file_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sprite_bible_locked_version
  ON sprite_bibles(id) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sprite_sequence_asset ON sprite_sequence_bundles(asset_id);
CREATE INDEX IF NOT EXISTS idx_sprite_sequence_frames_phase ON sprite_sequence_frames(sequence_id, phase);

COMMIT;
