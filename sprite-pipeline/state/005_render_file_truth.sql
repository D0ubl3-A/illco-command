PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS file_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  relative_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK(byte_size > 0),
  mime TEXT NOT NULL,
  extension TEXT NOT NULL,
  width INTEGER NOT NULL CHECK(width > 0),
  height INTEGER NOT NULL CHECK(height > 0),
  color_mode TEXT NOT NULL,
  open_ok INTEGER NOT NULL CHECK(open_ok = 1),
  created_at TEXT NOT NULL,
  UNIQUE(asset_id),
  UNIQUE(relative_path),
  UNIQUE(sha256)
);

CREATE TRIGGER IF NOT EXISTS trg_file_registration_matches_evidence
BEFORE INSERT ON file_registrations
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM evidence e
      WHERE e.id = NEW.evidence_id
        AND e.asset_id = NEW.asset_id
        AND e.relative_path = NEW.relative_path
        AND e.sha256 = NEW.sha256
        AND e.kind = 'render-file'
    ) THEN RAISE(ABORT, 'file registration requires matching render-file evidence')
    WHEN NEW.mime <> 'image/png' THEN RAISE(ABORT, 'rendered sprite must be image/png')
    WHEN lower(NEW.extension) <> '.png' THEN RAISE(ABORT, 'rendered sprite must use .png extension')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_file_registrations_no_update
BEFORE UPDATE ON file_registrations
BEGIN
  SELECT RAISE(ABORT, 'file registrations are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_file_registrations_no_delete
BEFORE DELETE ON file_registrations
BEGIN
  SELECT RAISE(ABORT, 'file registrations are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_render_transition_requires_file
BEFORE INSERT ON transition_intents
WHEN NEW.to_status = 'rendered_unvalidated'
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM file_registrations f
      JOIN evidence e ON e.id = f.evidence_id
      WHERE f.asset_id = NEW.asset_id
        AND f.evidence_id = NEW.evidence_id
        AND f.open_ok = 1
        AND f.byte_size > 0
        AND e.kind = 'render-file'
    ) THEN RAISE(ABORT, 'rendered_unvalidated requires registered real file evidence')
  END;
END;
