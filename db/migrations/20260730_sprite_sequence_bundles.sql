BEGIN;

CREATE TABLE IF NOT EXISTS sprite_sequence_bundles (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES sprite_runs(id),
  character_asset_id text REFERENCES sprite_assets(id),
  fx_family_id text,
  camera text NOT NULL,
  facing text NOT NULL CHECK (facing IN ('left','right','front','back')),
  frame_rate numeric(8,3) NOT NULL CHECK (frame_rate > 0 AND frame_rate <= 240),
  duration_ms integer NOT NULL CHECK (duration_ms > 0),
  anticipation_frame integer NOT NULL CHECK (anticipation_frame >= 0),
  contact_frame integer NOT NULL CHECK (contact_frame >= 0),
  follow_through_frame integer NOT NULL CHECK (follow_through_frame >= 0),
  recovery_frame integer NOT NULL CHECK (recovery_frame >= 0),
  fx_origin jsonb,
  fx_direction jsonb,
  fx_scale numeric,
  collision_suggestion text NOT NULL,
  sound_slot text NOT NULL,
  engine_export_results jsonb NOT NULL,
  bundle_sha256 char(64) NOT NULL UNIQUE CHECK (bundle_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (character_asset_id IS NOT NULL OR fx_family_id IS NOT NULL),
  CHECK (anticipation_frame <= contact_frame),
  CHECK (contact_frame <= follow_through_frame),
  CHECK (follow_through_frame <= recovery_frame),
  CHECK (fx_family_id IS NULL OR (fx_origin IS NOT NULL AND fx_direction IS NOT NULL AND fx_scale > 0))
);

CREATE TABLE IF NOT EXISTS sprite_sequence_frames (
  sequence_id text NOT NULL REFERENCES sprite_sequence_bundles(id) ON DELETE RESTRICT,
  frame_index integer NOT NULL CHECK (frame_index >= 0),
  asset_id text NOT NULL REFERENCES sprite_assets(id),
  duration_ms integer NOT NULL CHECK (duration_ms > 0),
  pivot_x numeric(8,6) NOT NULL CHECK (pivot_x BETWEEN 0 AND 1),
  pivot_y numeric(8,6) NOT NULL CHECK (pivot_y BETWEEN 0 AND 1),
  phase text NOT NULL,
  file_sha256 char(64) NOT NULL CHECK (file_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sequence_id, frame_index),
  UNIQUE (sequence_id, asset_id)
);

CREATE OR REPLACE FUNCTION prevent_sequence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'validated sequence records are immutable';
END;
$$;

DROP TRIGGER IF EXISTS sprite_sequence_bundle_immutable ON sprite_sequence_bundles;
CREATE TRIGGER sprite_sequence_bundle_immutable
BEFORE UPDATE OR DELETE ON sprite_sequence_bundles
FOR EACH ROW EXECUTE FUNCTION prevent_sequence_mutation();

DROP TRIGGER IF EXISTS sprite_sequence_frame_immutable ON sprite_sequence_frames;
CREATE TRIGGER sprite_sequence_frame_immutable
BEFORE UPDATE OR DELETE ON sprite_sequence_frames
FOR EACH ROW EXECUTE FUNCTION prevent_sequence_mutation();

CREATE INDEX IF NOT EXISTS idx_sprite_sequence_run ON sprite_sequence_bundles(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sprite_sequence_character ON sprite_sequence_bundles(character_asset_id);
CREATE INDEX IF NOT EXISTS idx_sprite_sequence_fx ON sprite_sequence_bundles(fx_family_id);

COMMIT;
