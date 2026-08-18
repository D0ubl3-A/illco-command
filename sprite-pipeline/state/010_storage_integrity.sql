PRAGMA foreign_keys = ON;

-- Fail closed on path traversal/absolute paths for every persisted storage path.
-- Paths are repository-relative and must use forward slashes.
CREATE TRIGGER IF NOT EXISTS trg_evidence_safe_path
BEFORE INSERT ON evidence
BEGIN
  SELECT CASE WHEN NEW.relative_path = ''
    OR substr(NEW.relative_path,1,1) = '/'
    OR NEW.relative_path GLOB '[A-Za-z]:*'
    OR instr(NEW.relative_path, char(92)) > 0
    OR NEW.relative_path = '..'
    OR NEW.relative_path LIKE '../%'
    OR NEW.relative_path LIKE '%/../%'
    OR NEW.relative_path LIKE '%/..'
  THEN RAISE(ABORT, 'unsafe evidence path') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_packages_safe_path
BEFORE INSERT ON packages
BEGIN
  SELECT CASE WHEN NEW.relative_path = ''
    OR substr(NEW.relative_path,1,1) = '/'
    OR NEW.relative_path GLOB '[A-Za-z]:*'
    OR instr(NEW.relative_path, char(92)) > 0
    OR NEW.relative_path = '..'
    OR NEW.relative_path LIKE '../%'
    OR NEW.relative_path LIKE '%/../%'
    OR NEW.relative_path LIKE '%/..'
  THEN RAISE(ABORT, 'unsafe package path') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_archives_safe_path
BEFORE INSERT ON archives
BEGIN
  SELECT CASE WHEN NEW.manifest_path = ''
    OR substr(NEW.manifest_path,1,1) = '/'
    OR NEW.manifest_path GLOB '[A-Za-z]:*'
    OR instr(NEW.manifest_path, char(92)) > 0
    OR NEW.manifest_path = '..'
    OR NEW.manifest_path LIKE '../%'
    OR NEW.manifest_path LIKE '%/../%'
    OR NEW.manifest_path LIKE '%/..'
  THEN RAISE(ABORT, 'unsafe archive path') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_file_registrations_safe_path
BEFORE INSERT ON file_registrations
BEGIN
  SELECT CASE WHEN NEW.relative_path = ''
    OR substr(NEW.relative_path,1,1) = '/'
    OR NEW.relative_path GLOB '[A-Za-z]:*'
    OR instr(NEW.relative_path, char(92)) > 0
    OR NEW.relative_path = '..'
    OR NEW.relative_path LIKE '../%'
    OR NEW.relative_path LIKE '%/../%'
    OR NEW.relative_path LIKE '%/..'
  THEN RAISE(ABORT, 'unsafe registered file path') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_assets_content_path_safe_insert
BEFORE INSERT ON assets
WHEN NEW.content_path IS NOT NULL
BEGIN
  SELECT CASE WHEN NEW.content_path = ''
    OR substr(NEW.content_path,1,1) = '/'
    OR NEW.content_path GLOB '[A-Za-z]:*'
    OR instr(NEW.content_path, char(92)) > 0
    OR NEW.content_path = '..'
    OR NEW.content_path LIKE '../%'
    OR NEW.content_path LIKE '%/../%'
    OR NEW.content_path LIKE '%/..'
  THEN RAISE(ABORT, 'unsafe asset content path') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_assets_content_path_safe_update
BEFORE UPDATE OF content_path ON assets
WHEN NEW.content_path IS NOT NULL
BEGIN
  SELECT CASE WHEN NEW.content_path = ''
    OR substr(NEW.content_path,1,1) = '/'
    OR NEW.content_path GLOB '[A-Za-z]:*'
    OR instr(NEW.content_path, char(92)) > 0
    OR NEW.content_path = '..'
    OR NEW.content_path LIKE '../%'
    OR NEW.content_path LIKE '%/../%'
    OR NEW.content_path LIKE '%/..'
  THEN RAISE(ABORT, 'unsafe asset content path') END;
END;

-- Evidence and archives are append-only truth records.
CREATE TRIGGER IF NOT EXISTS trg_evidence_no_update
BEFORE UPDATE ON evidence
BEGIN
  SELECT RAISE(ABORT, 'evidence is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_evidence_no_delete
BEFORE DELETE ON evidence
BEGIN
  SELECT RAISE(ABORT, 'evidence is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_archives_no_update
BEFORE UPDATE ON archives
BEGIN
  SELECT RAISE(ABORT, 'archives are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_archives_no_delete
BEFORE DELETE ON archives
BEGIN
  SELECT RAISE(ABORT, 'archives are immutable');
END;
