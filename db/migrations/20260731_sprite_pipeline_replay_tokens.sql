BEGIN;

CREATE TABLE IF NOT EXISTS sprite_operation_replays (
  operation_key char(64) PRIMARY KEY,
  asset_id text NOT NULL REFERENCES sprite_assets(id) ON DELETE RESTRICT,
  run_id text NOT NULL REFERENCES sprite_runs(id) ON DELETE RESTRICT,
  surgeon_id integer NOT NULL CHECK (surgeon_id BETWEEN 1 AND 1000),
  expected_state text NOT NULL,
  next_state text NOT NULL,
  evidence_id bigint REFERENCES sprite_evidence(id) ON DELETE RESTRICT,
  result_state text NOT NULL,
  result_asset_version integer NOT NULL,
  result_content_sha256 char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (operation_key ~ '^[a-f0-9]{64}$'),
  CHECK (result_content_sha256 IS NULL OR result_content_sha256 ~ '^[a-f0-9]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sprite_events_transition_operation
  ON sprite_status_events(asset_id, run_id, surgeon_id, from_state, to_state, evidence_id);

CREATE OR REPLACE FUNCTION transition_sprite_asset_v2(
  p_operation_key char(64),
  p_asset_id text,
  p_expected_state text,
  p_next_state text,
  p_run_id text,
  p_surgeon_id integer,
  p_evidence_id bigint
) RETURNS sprite_assets
LANGUAGE plpgsql
AS $$
DECLARE
  current_asset sprite_assets;
  replay sprite_operation_replays;
BEGIN
  IF p_operation_key !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'operation key must be a lowercase SHA-256 digest';
  END IF;

  SELECT * INTO replay
  FROM sprite_operation_replays
  WHERE operation_key = p_operation_key
  FOR UPDATE;

  IF FOUND THEN
    IF replay.asset_id <> p_asset_id
       OR replay.run_id <> p_run_id
       OR replay.surgeon_id <> p_surgeon_id
       OR replay.expected_state <> p_expected_state
       OR replay.next_state <> p_next_state
       OR replay.evidence_id IS DISTINCT FROM p_evidence_id THEN
      RAISE EXCEPTION 'operation key replay payload mismatch for %', p_operation_key;
    END IF;

    SELECT * INTO current_asset FROM sprite_assets WHERE id = replay.asset_id;
    IF NOT FOUND OR current_asset.state <> replay.result_state OR current_asset.version <> replay.result_asset_version THEN
      RAISE EXCEPTION 'canonical replay result diverged for operation %', p_operation_key;
    END IF;
    RETURN current_asset;
  END IF;

  SELECT * INTO current_asset
  FROM sprite_assets
  WHERE id = p_asset_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Asset % does not exist', p_asset_id; END IF;
  IF current_asset.owner_surgeon <> p_surgeon_id THEN RAISE EXCEPTION 'Ownership violation for asset %', p_asset_id; END IF;
  IF current_asset.state <> p_expected_state THEN
    RAISE EXCEPTION 'State conflict for asset %: expected %, actual %', p_asset_id, p_expected_state, current_asset.state;
  END IF;
  IF p_next_state IN ('rendered_unvalidated','validated','packaged','published') AND p_evidence_id IS NULL THEN
    RAISE EXCEPTION 'Evidence is required for completion state %', p_next_state;
  END IF;

  UPDATE sprite_assets
  SET state = p_next_state, version = version + 1, updated_at = now()
  WHERE id = p_asset_id
  RETURNING * INTO current_asset;

  INSERT INTO sprite_status_events(asset_id, from_state, to_state, run_id, surgeon_id, evidence_id)
  VALUES (p_asset_id, p_expected_state, p_next_state, p_run_id, p_surgeon_id, p_evidence_id);

  INSERT INTO sprite_operation_replays(
    operation_key, asset_id, run_id, surgeon_id, expected_state, next_state,
    evidence_id, result_state, result_asset_version, result_content_sha256
  ) VALUES (
    p_operation_key, p_asset_id, p_run_id, p_surgeon_id, p_expected_state, p_next_state,
    p_evidence_id, current_asset.state, current_asset.version, current_asset.content_sha256
  );

  RETURN current_asset;
END;
$$;

COMMIT;
