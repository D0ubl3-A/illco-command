BEGIN;

ALTER TABLE sprite_locks
  ADD COLUMN IF NOT EXISTS recovery_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovered_by_run_id text,
  ADD COLUMN IF NOT EXISTS recovery_evidence_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sprite_events_transition_once
  ON sprite_status_events(asset_id, from_state, to_state, run_id, surgeon_id, created_at);

CREATE OR REPLACE FUNCTION recover_sprite_lock(
  p_lock_key text,
  p_new_owner_run_id text,
  p_surgeon_id integer,
  p_ttl interval,
  p_evidence_id bigint
) RETURNS sprite_locks
LANGUAGE plpgsql
AS $$
DECLARE
  current_lock sprite_locks;
BEGIN
  IF p_ttl <= interval '0 seconds' THEN
    RAISE EXCEPTION 'Lock TTL must be positive';
  END IF;

  SELECT * INTO current_lock
  FROM sprite_locks
  WHERE lock_key = p_lock_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO sprite_locks(lock_key, owner_run_id, surgeon_id, expires_at)
    VALUES (p_lock_key, p_new_owner_run_id, p_surgeon_id, now() + p_ttl)
    RETURNING * INTO current_lock;
    RETURN current_lock;
  END IF;

  IF current_lock.released_at IS NULL AND current_lock.expires_at > now() THEN
    RAISE EXCEPTION 'Lock % is active and owned by %', p_lock_key, current_lock.owner_run_id;
  END IF;

  UPDATE sprite_locks
  SET owner_run_id = p_new_owner_run_id,
      surgeon_id = p_surgeon_id,
      acquired_at = now(),
      heartbeat_at = now(),
      expires_at = now() + p_ttl,
      released_at = NULL,
      recovery_count = recovery_count + 1,
      recovered_by_run_id = p_new_owner_run_id,
      recovery_evidence_id = p_evidence_id
  WHERE lock_key = p_lock_key
  RETURNING * INTO current_lock;

  RETURN current_lock;
END;
$$;

CREATE OR REPLACE FUNCTION transition_sprite_asset(
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
BEGIN
  SELECT * INTO current_asset
  FROM sprite_assets
  WHERE id = p_asset_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset % does not exist', p_asset_id;
  END IF;

  IF current_asset.owner_surgeon <> p_surgeon_id THEN
    RAISE EXCEPTION 'Ownership violation for asset %', p_asset_id;
  END IF;

  IF current_asset.state <> p_expected_state THEN
    IF current_asset.state = p_next_state THEN
      RETURN current_asset;
    END IF;
    RAISE EXCEPTION 'State conflict for asset %: expected %, actual %', p_asset_id, p_expected_state, current_asset.state;
  END IF;

  IF p_next_state IN ('rendered_unvalidated','validated','packaged','published') AND p_evidence_id IS NULL THEN
    RAISE EXCEPTION 'Evidence is required for completion state %', p_next_state;
  END IF;

  UPDATE sprite_assets
  SET state = p_next_state, updated_at = now()
  WHERE id = p_asset_id
  RETURNING * INTO current_asset;

  INSERT INTO sprite_status_events(asset_id, from_state, to_state, run_id, surgeon_id, evidence_id)
  VALUES (p_asset_id, p_expected_state, p_next_state, p_run_id, p_surgeon_id, p_evidence_id);

  RETURN current_asset;
END;
$$;

COMMIT;
