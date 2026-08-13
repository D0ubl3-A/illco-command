-- This migration must run with transaction wrapping disabled because PostgreSQL
-- forbids CREATE INDEX CONCURRENTLY inside a transaction block.
-- Migration runners must execute each statement independently and record the
-- statement hash before advancing the schema version.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sprite_locks_recovered_by_run_v2
  ON sprite_locks(recovered_by_run_id)
  WHERE recovered_by_run_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sprite_locks_recovery_evidence_v2
  ON sprite_locks(recovery_evidence_id)
  WHERE recovery_evidence_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sprite_locks_expiry_active
  ON sprite_locks(expires_at, lock_key)
  WHERE released_at IS NULL;
