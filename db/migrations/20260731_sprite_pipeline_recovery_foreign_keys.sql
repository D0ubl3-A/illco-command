BEGIN;

-- Add recovery-audit referential integrity without rewriting prior immutable migrations.
-- NOT VALID immediately protects new writes while allowing historical rows to be
-- checked in a separate no-transaction validation migration.
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

COMMIT;
