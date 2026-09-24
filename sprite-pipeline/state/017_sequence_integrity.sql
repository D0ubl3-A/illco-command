PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sequence_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_id TEXT NOT NULL UNIQUE REFERENCES sequence_bundles(id),
  expected_frame_count INTEGER NOT NULL CHECK(expected_frame_count > 0),
  synchronization_passed INTEGER NOT NULL CHECK(synchronization_passed = 1),
  timing_error_seconds REAL NOT NULL CHECK(timing_error_seconds >= 0),
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  tool_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS trg_sequence_validation_integrity
BEFORE INSERT ON sequence_validations
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM sequence_bundles s
    JOIN evidence e ON e.id = NEW.evidence_id
    WHERE s.id = NEW.sequence_id
      AND e.run_id = s.run_id
      AND e.kind = 'sequence-validation'
  ) THEN RAISE(ABORT,'sequence validation requires same-run sequence-validation evidence') END;

  SELECT CASE WHEN (
    SELECT COUNT(*) FROM frames f WHERE f.sequence_id = NEW.sequence_id
  ) <> NEW.expected_frame_count
  THEN RAISE(ABORT,'sequence frame count mismatch') END;

  SELECT CASE WHEN (
    SELECT MIN(frame_index) FROM frames f WHERE f.sequence_id = NEW.sequence_id
  ) <> 0 OR (
    SELECT MAX(frame_index) FROM frames f WHERE f.sequence_id = NEW.sequence_id
  ) <> NEW.expected_frame_count - 1
  THEN RAISE(ABORT,'sequence frame indexes are not contiguous') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM frames f
    WHERE f.sequence_id = NEW.sequence_id
      AND (f.relative_path IS NULL OR f.sha256 IS NULL OR length(f.sha256) <> 64 OR f.evidence_id IS NULL)
  ) THEN RAISE(ABORT,'sequence frames require path hash and evidence') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM frames f
    JOIN sequence_bundles s ON s.id = f.sequence_id
    LEFT JOIN evidence e ON e.id = f.evidence_id
    WHERE f.sequence_id = NEW.sequence_id
      AND (e.id IS NULL OR e.run_id <> s.run_id OR e.asset_id IS NOT f.asset_id)
  ) THEN RAISE(ABORT,'sequence frame evidence mismatch') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM sequence_bundles s
    WHERE s.id = NEW.sequence_id
      AND s.synchronization_passed IS NOT 1
  ) THEN RAISE(ABORT,'sequence bundle synchronization not passed') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM sequence_bundles s
    WHERE s.id = NEW.sequence_id
      AND ABS(s.duration - (CAST(NEW.expected_frame_count AS REAL) / s.frame_rate)) > (1.0 / s.frame_rate)
  ) THEN RAISE(ABORT,'sequence duration/frame-rate mismatch') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM sequence_bundles s
    WHERE s.id = NEW.sequence_id
      AND (
        (s.anticipation_frame IS NOT NULL AND (s.anticipation_frame < 0 OR s.anticipation_frame >= NEW.expected_frame_count)) OR
        (s.contact_frame IS NOT NULL AND (s.contact_frame < 0 OR s.contact_frame >= NEW.expected_frame_count)) OR
        (s.follow_through_frame IS NOT NULL AND (s.follow_through_frame < 0 OR s.follow_through_frame >= NEW.expected_frame_count)) OR
        (s.recovery_frame IS NOT NULL AND (s.recovery_frame < 0 OR s.recovery_frame >= NEW.expected_frame_count)) OR
        (s.anticipation_frame IS NOT NULL AND s.contact_frame IS NOT NULL AND s.anticipation_frame > s.contact_frame) OR
        (s.contact_frame IS NOT NULL AND s.follow_through_frame IS NOT NULL AND s.contact_frame > s.follow_through_frame) OR
        (s.follow_through_frame IS NOT NULL AND s.recovery_frame IS NOT NULL AND s.follow_through_frame > s.recovery_frame)
      )
  ) THEN RAISE(ABORT,'sequence phase ordering invalid') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_sequence_validations_no_update
BEFORE UPDATE ON sequence_validations BEGIN SELECT RAISE(ABORT,'sequence validations are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_sequence_validations_no_delete
BEFORE DELETE ON sequence_validations BEGIN SELECT RAISE(ABORT,'sequence validations are immutable'); END;

CREATE INDEX IF NOT EXISTS idx_sequence_validations_sequence ON sequence_validations(sequence_id);
