PRAGMA foreign_keys = ON;

-- Fail closed when a relative path is syntactically safe but points outside the
-- production roots declared in config/production.json. Render-file evidence is
-- intentionally the immutable asset path itself, so it is restricted to the
-- matching character/FX root rather than the evidence directory.
CREATE TRIGGER IF NOT EXISTS trg_evidence_write_root
BEFORE INSERT ON evidence
BEGIN
  SELECT CASE
    WHEN NEW.kind = 'render-file'
         AND NEW.asset_id LIKE 'CHR-%'
         AND NEW.relative_path NOT LIKE 'assets/characters/%'
      THEN RAISE(ABORT, 'character render evidence outside configured root')
    WHEN NEW.kind = 'render-file'
         AND NEW.asset_id LIKE 'FX-%'
         AND NEW.relative_path NOT LIKE 'assets/fx/%'
      THEN RAISE(ABORT, 'fx render evidence outside configured root')
    WHEN NEW.kind <> 'render-file'
         AND NEW.relative_path NOT LIKE 'evidence/%'
      THEN RAISE(ABORT, 'evidence path outside configured root')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_packages_write_root
BEFORE INSERT ON packages
BEGIN
  SELECT CASE WHEN NEW.relative_path NOT LIKE 'packages/%'
    THEN RAISE(ABORT, 'package path outside configured root') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_archives_write_root
BEFORE INSERT ON archives
BEGIN
  SELECT CASE WHEN NEW.manifest_path NOT LIKE 'evidence/archives/%'
    THEN RAISE(ABORT, 'archive path outside configured root') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_file_registrations_write_root
BEFORE INSERT ON file_registrations
BEGIN
  SELECT CASE
    WHEN (SELECT category FROM assets WHERE asset_id = NEW.asset_id) = 'character'
         AND NEW.relative_path NOT LIKE 'assets/characters/%'
      THEN RAISE(ABORT, 'character file path outside configured root')
    WHEN (SELECT category FROM assets WHERE asset_id = NEW.asset_id) = 'fx'
         AND NEW.relative_path NOT LIKE 'assets/fx/%'
      THEN RAISE(ABORT, 'fx file path outside configured root')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_assets_content_write_root_insert
BEFORE INSERT ON assets
WHEN NEW.content_path IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NEW.category = 'character' AND NEW.content_path NOT LIKE 'assets/characters/%'
      THEN RAISE(ABORT, 'character content path outside configured root')
    WHEN NEW.category = 'fx' AND NEW.content_path NOT LIKE 'assets/fx/%'
      THEN RAISE(ABORT, 'fx content path outside configured root')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_assets_content_write_root_update
BEFORE UPDATE OF content_path ON assets
WHEN NEW.content_path IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NEW.category = 'character' AND NEW.content_path NOT LIKE 'assets/characters/%'
      THEN RAISE(ABORT, 'character content path outside configured root')
    WHEN NEW.category = 'fx' AND NEW.content_path NOT LIKE 'assets/fx/%'
      THEN RAISE(ABORT, 'fx content path outside configured root')
  END;
END;
