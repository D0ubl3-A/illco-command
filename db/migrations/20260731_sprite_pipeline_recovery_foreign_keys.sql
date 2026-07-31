BEGIN;

-- Repair recovery-audit referential integrity without rewriting prior immutable migrations.
-- NOT VALID allows deployment against an existing populated table while still enforcing
-- the constraint for all new writes; the explicit VALIDATE step proves historical rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sprite_locks_recovered_by_run_fk'
      AND conrelid = 'sprite_locks'::regclass
  ) THEN
    ALTER TABLE sprite_locks
      ADD CONSTRAINT sprite_locks_recovered_by_run_fk
      FOREIGN KEY (recovered_by_run_id)
      REFERENCES sprite_runs(id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sprite_locks_recovery_evidence_fk'
      AND conrelid = 'sprite_locks'::regclass
  ) THEN
    ALTER TABLE sprite_locks
      ADD CONSTRAINT sprite_locks_recovery_evidence_fk
      FOREIGN KEY (recovery_evidence_id)
      REFERENCES sprite_evidence(id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END
$$;

ALTER TABLE sprite_locks
  VALIDATE CONSTRAINT sprite_locks_recovered_by_run_fk;

ALTER TABLE sprite_locks
  VALIDATE CONSTRAINT sprite_locks_recovery_evidence_fk;

CREATE INDEX IF NOT EXISTS idx_sprite_locks_recovered_by_run
  ON sprite_locks(recovered_by_run_id)
  WHERE recovered_by_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sprite_locks_recovery_evidence
  ON sprite_locks(recovery_evidence_id)
  WHERE recovery_evidence_id IS NOT NULL;

COMMIT;
