-- This migration must run with transaction wrapping disabled.
-- Constraint validation scans historical rows without holding the ADD CONSTRAINT
-- transaction open; failures preserve the already-installed NOT VALID constraints.

ALTER TABLE sprite_locks
  VALIDATE CONSTRAINT sprite_locks_recovered_by_run_fk;

ALTER TABLE sprite_locks
  VALIDATE CONSTRAINT sprite_locks_recovery_evidence_fk;
