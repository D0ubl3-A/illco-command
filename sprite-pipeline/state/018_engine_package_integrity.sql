PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS engine_package_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id TEXT NOT NULL UNIQUE REFERENCES packages(id),
  evidence_id INTEGER NOT NULL UNIQUE REFERENCES evidence(id),
  metadata_path TEXT NOT NULL,
  metadata_sha256 TEXT NOT NULL CHECK(length(metadata_sha256) = 64),
  import_manifest_path TEXT NOT NULL,
  import_manifest_sha256 TEXT NOT NULL CHECK(length(import_manifest_sha256) = 64),
  parser_version TEXT NOT NULL,
  parsed_ok INTEGER NOT NULL CHECK(parsed_ok IN (0,1)),
  pngs_ok INTEGER NOT NULL CHECK(pngs_ok IN (0,1)),
  sequences_ok INTEGER NOT NULL CHECK(sequences_ok IN (0,1)),
  pivots_ok INTEGER NOT NULL CHECK(pivots_ok IN (0,1)),
  collisions_ok INTEGER NOT NULL CHECK(collisions_ok IN (0,1)),
  naming_ok INTEGER NOT NULL CHECK(naming_ok IN (0,1)),
  license_ok INTEGER NOT NULL CHECK(license_ok IN (0,1)),
  changelog_ok INTEGER NOT NULL CHECK(changelog_ok IN (0,1)),
  created_at TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS trg_engine_package_validation_insert_guard
BEFORE INSERT ON engine_package_validations
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM packages p
      JOIN evidence e ON e.id = NEW.evidence_id
      WHERE p.id = NEW.package_id
        AND e.run_id = p.run_id
        AND e.asset_id IS NULL
        AND e.kind = 'engine-package-validation'
    ) THEN RAISE(ABORT, 'engine package validation requires same-run package-level evidence')
    WHEN length(NEW.metadata_path) = 0 OR length(NEW.import_manifest_path) = 0 OR length(NEW.parser_version) = 0
      THEN RAISE(ABORT, 'engine package validation requires metadata, import manifest and parser version')
    WHEN NEW.parsed_ok <> 1 OR NEW.pngs_ok <> 1 OR NEW.sequences_ok <> 1 OR NEW.pivots_ok <> 1
      OR NEW.collisions_ok <> 1 OR NEW.naming_ok <> 1 OR NEW.license_ok <> 1 OR NEW.changelog_ok <> 1
      THEN RAISE(ABORT, 'engine package validation requires every mandatory import gate to pass')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_engine_package_validations_no_update
BEFORE UPDATE ON engine_package_validations
BEGIN
  SELECT RAISE(ABORT, 'engine package validations are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_engine_package_validations_no_delete
BEFORE DELETE ON engine_package_validations
BEGIN
  SELECT RAISE(ABORT, 'engine package validations are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_packaged_transition_requires_engine_validation
BEFORE INSERT ON transition_intents
WHEN NEW.to_status = 'packaged'
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM package_assets pa
      JOIN packages p ON p.id = pa.package_id
      JOIN engine_package_validations epv ON epv.package_id = p.id
      WHERE pa.asset_id = NEW.asset_id
        AND epv.parsed_ok = 1
        AND epv.pngs_ok = 1
        AND epv.sequences_ok = 1
        AND epv.pivots_ok = 1
        AND epv.collisions_ok = 1
        AND epv.naming_ok = 1
        AND epv.license_ok = 1
        AND epv.changelog_ok = 1
    ) THEN RAISE(ABORT, 'packaged requires validated engine import metadata for containing package')
  END;
END;
