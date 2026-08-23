PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS package_assets (
  package_id TEXT NOT NULL REFERENCES packages(id),
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY(package_id, asset_id)
);

CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  package_id TEXT NOT NULL REFERENCES packages(id),
  destination TEXT NOT NULL,
  published_ref TEXT NOT NULL UNIQUE,
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS trg_packages_no_update
BEFORE UPDATE ON packages
BEGIN
  SELECT RAISE(ABORT, 'packages are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_packages_no_delete
BEFORE DELETE ON packages
BEGIN
  SELECT RAISE(ABORT, 'packages are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_package_assets_no_update
BEFORE UPDATE ON package_assets
BEGIN
  SELECT RAISE(ABORT, 'package membership is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_package_assets_no_delete
BEFORE DELETE ON package_assets
BEGIN
  SELECT RAISE(ABORT, 'package membership is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_publications_no_update
BEFORE UPDATE ON publications
BEGIN
  SELECT RAISE(ABORT, 'publication records are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_publications_no_delete
BEFORE DELETE ON publications
BEGIN
  SELECT RAISE(ABORT, 'publication records are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_packaged_transition_requires_package
BEFORE INSERT ON transition_intents
WHEN NEW.to_status = 'packaged'
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM evidence e
      WHERE e.id = NEW.evidence_id
        AND e.asset_id = NEW.asset_id
        AND e.kind = 'package-integrity'
    ) THEN RAISE(ABORT, 'packaged requires matching package-integrity evidence')
    WHEN NOT EXISTS (
      SELECT 1
      FROM package_assets pa
      JOIN packages p ON p.id = pa.package_id
      JOIN evidence pe ON pe.id = pa.evidence_id
      WHERE pa.asset_id = NEW.asset_id
        AND pe.asset_id = NEW.asset_id
        AND pe.kind = 'package-integrity'
        AND pe.id = NEW.evidence_id
        AND length(p.sha256) = 64
        AND length(p.relative_path) > 0
    ) THEN RAISE(ABORT, 'packaged requires immutable package membership and hashed package record')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_published_transition_requires_publication
BEFORE INSERT ON transition_intents
WHEN NEW.to_status = 'published'
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM evidence e
      WHERE e.id = NEW.evidence_id
        AND e.asset_id = NEW.asset_id
        AND e.kind = 'publication'
    ) THEN RAISE(ABORT, 'published requires matching publication evidence')
    WHEN NOT EXISTS (
      SELECT 1
      FROM publications pub
      JOIN package_assets pa ON pa.package_id = pub.package_id AND pa.asset_id = pub.asset_id
      JOIN packages p ON p.id = pub.package_id
      WHERE pub.asset_id = NEW.asset_id
        AND pub.evidence_id = NEW.evidence_id
        AND length(pub.destination) > 0
        AND length(pub.published_ref) > 0
        AND length(p.sha256) = 64
    ) THEN RAISE(ABORT, 'published requires immutable publication record for a package containing the asset')
  END;
END;
