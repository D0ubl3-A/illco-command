BEGIN;

ALTER TABLE sprite_locks
  ADD COLUMN IF NOT EXISTS recovery_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovered_by_run_id text REFERENCES sprite_runs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS recovery_evidence_id bigint REFERENCES sprite_evidence(id) ON DELETE RESTRICT;

-- Lookup support only. Exactly-once transition identity is enforced by the
-- deterministic operation-key table introduced in the replay-token migration.
CREATE INDEX IF NOT EXISTS idx_sprite_events_transition_lookup
  ON sprite_status_events(asset_id, run_id, surgeon_id, from_state, to_state);

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

  IF NOT EXISTS (SELECT 1 FROM sprite_runs WHERE id = p_new_owner_run_id) THEN
    RAISE EXCEPTION 'Recovery owner run % does not exist', p_new_owner_run_id;
  END IF;

  IF p_evidence_id IS NULL OR NOT EXISTS (SELECT 1 FROM sprite_evidence WHERE id = p_evidence_id) THEN
    RAISE EXCEPTION 'Valid recovery evidence is required';
  END IF;

  SELECT * INTO current_lock
  FROM sprite_locks
  WHERE lock_key = p_lock_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO sprite_locks(
      lock_key, owner_run_id, surgeon_id, expires_at,
      recovered_by_run_id, recovery_evidence_id
    )
    VALUES (
      p_lock_key, p_new_owner_run_id, p_surgeon_id, now() + p_ttl,
      p_new_owner_run_id, p_evidence_id
    )
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

-- Legacy transition entrypoint retained only for fail-closed compatibility.
-- All callers must use transition_sprite_asset_v2 with a canonical operation key.
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
BEGIN
  RAISE EXCEPTION 'transition_sprite_asset is deprecated; use transition_sprite_asset_v2 with a canonical operation key';
END;
$$;

COMMIT;
