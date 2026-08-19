PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS asset_manifest_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  manifest_version INTEGER NOT NULL CHECK(manifest_version >= 1),
  stage TEXT NOT NULL CHECK(stage IN ('planned','queued','rendered_unvalidated','validated','packaged','published')),
  theme_version INTEGER NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(id),
  operation_key TEXT NOT NULL UNIQUE,
  surgeon_id INTEGER NOT NULL REFERENCES surgeon_lanes(surgeon_id),
  category TEXT NOT NULL,
  subcategory TEXT,
  asset_name TEXT NOT NULL,
  bible_name TEXT NOT NULL,
  bible_version INTEGER NOT NULL CHECK(bible_version >= 1),
  action TEXT NOT NULL,
  facing TEXT NOT NULL,
  lead_hand_leg TEXT,
  prop_hand TEXT,
  mobility_side TEXT,
  mirror_rule TEXT NOT NULL,
  camera TEXT NOT NULL,
  framing TEXT NOT NULL,
  expression TEXT NOT NULL,
  phase TEXT NOT NULL,
  sequence_id TEXT,
  sequence_index INTEGER,
  sequence_length INTEGER,
  variation TEXT NOT NULL,
  intended_use TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  filename TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  content_path TEXT,
  full_prompt TEXT NOT NULL,
  negatives TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_version TEXT NOT NULL,
  parameters_json TEXT NOT NULL,
  width INTEGER NOT NULL CHECK(width > 0),
  height INTEGER NOT NULL CHECK(height > 0),
  format TEXT NOT NULL,
  color_mode TEXT,
  background_mode TEXT NOT NULL,
  alpha_mode TEXT,
  premultiplication TEXT,
  chroma_score REAL,
  edge_score REAL,
  clipping_score REAL,
  silhouette_score REAL,
  text_logo_scan TEXT,
  likeness_ip_scan TEXT,
  sha256 TEXT,
  phash TEXT,
  dhash TEXT,
  silhouette_signature TEXT,
  pose_signature TEXT,
  palette_signature TEXT,
  prompt_signature TEXT NOT NULL,
  duplicate_decision TEXT,
  duplicate_details_json TEXT,
  file_validation_status TEXT,
  sequence_validation_status TEXT,
  continuity_pointer TEXT NOT NULL,
  failure_class TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK(retry_count >= 0),
  replacement_asset_id TEXT REFERENCES assets(asset_id),
  archive_id TEXT REFERENCES archives(id),
  package_id TEXT REFERENCES packages(id),
  evidence_path TEXT,
  evidence_sha256 TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(asset_id, manifest_version),
  UNIQUE(asset_id, stage, manifest_version),
  CHECK((sequence_index IS NULL AND sequence_length IS NULL) OR
        (sequence_id IS NOT NULL AND sequence_index IS NOT NULL AND sequence_index >= 0 AND sequence_length IS NOT NULL AND sequence_length > 0 AND sequence_index < sequence_length)),
  CHECK(stage NOT IN ('rendered_unvalidated','validated','packaged','published') OR
        (content_path IS NOT NULL AND sha256 IS NOT NULL AND phash IS NOT NULL AND dhash IS NOT NULL AND color_mode IS NOT NULL)),
  CHECK(stage NOT IN ('validated','packaged','published') OR
        (chroma_score IS NOT NULL AND edge_score IS NOT NULL AND clipping_score IS NOT NULL AND silhouette_score IS NOT NULL AND
         text_logo_scan IS NOT NULL AND likeness_ip_scan IS NOT NULL AND file_validation_status = 'passed' AND
         evidence_path IS NOT NULL AND evidence_sha256 IS NOT NULL)),
  CHECK(stage NOT IN ('packaged','published') OR package_id IS NOT NULL),
  CHECK(stage <> 'published' OR archive_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_manifest_asset_stage
ON asset_manifest_versions(asset_id, stage, manifest_version DESC);

CREATE TRIGGER IF NOT EXISTS trg_manifest_ownership_match
BEFORE INSERT ON asset_manifest_versions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM ownership o
    JOIN assets a ON a.asset_id = o.asset_id
    JOIN themes t ON t.id = a.theme_id
    WHERE o.asset_id = NEW.asset_id
      AND o.surgeon_id = NEW.surgeon_id
      AND a.category = NEW.category
      AND t.version = NEW.theme_version
  ) THEN RAISE(ABORT, 'manifest ownership/theme/category mismatch') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_manifest_version_append_only
BEFORE INSERT ON asset_manifest_versions
BEGIN
  SELECT CASE WHEN NEW.manifest_version <> COALESCE((
    SELECT MAX(manifest_version) + 1 FROM asset_manifest_versions WHERE asset_id = NEW.asset_id
  ), 1) THEN RAISE(ABORT, 'manifest version must append exactly once') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_manifest_no_update
BEFORE UPDATE ON asset_manifest_versions
BEGIN
  SELECT RAISE(ABORT, 'asset manifest versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_manifest_no_delete
BEFORE DELETE ON asset_manifest_versions
BEGIN
  SELECT RAISE(ABORT, 'asset manifest versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_manifest_required_for_queue
BEFORE UPDATE OF status ON assets
WHEN NEW.status = 'queued' AND OLD.status <> NEW.status
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM asset_manifest_versions m
    WHERE m.asset_id = NEW.asset_id
      AND m.stage = 'queued'
      AND m.manifest_version = (SELECT MAX(m2.manifest_version) FROM asset_manifest_versions m2 WHERE m2.asset_id = NEW.asset_id)
  ) THEN RAISE(ABORT, 'queued requires latest queued manifest') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_manifest_required_for_rendered
BEFORE UPDATE OF status ON assets
WHEN NEW.status = 'rendered_unvalidated' AND OLD.status <> NEW.status
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM asset_manifest_versions m
    WHERE m.asset_id = NEW.asset_id
      AND m.stage = 'rendered_unvalidated'
      AND m.manifest_version = (SELECT MAX(m2.manifest_version) FROM asset_manifest_versions m2 WHERE m2.asset_id = NEW.asset_id)
  ) THEN RAISE(ABORT, 'rendered_unvalidated requires latest rendered manifest') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_manifest_required_for_validated
BEFORE UPDATE OF status ON assets
WHEN NEW.status = 'validated' AND OLD.status <> NEW.status
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM asset_manifest_versions m
    WHERE m.asset_id = NEW.asset_id
      AND m.stage = 'validated'
      AND m.manifest_version = (SELECT MAX(m2.manifest_version) FROM asset_manifest_versions m2 WHERE m2.asset_id = NEW.asset_id)
  ) THEN RAISE(ABORT, 'validated requires latest validated manifest') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_manifest_required_for_packaged
BEFORE UPDATE OF status ON assets
WHEN NEW.status = 'packaged' AND OLD.status <> NEW.status
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM asset_manifest_versions m
    WHERE m.asset_id = NEW.asset_id
      AND m.stage = 'packaged'
      AND m.manifest_version = (SELECT MAX(m2.manifest_version) FROM asset_manifest_versions m2 WHERE m2.asset_id = NEW.asset_id)
  ) THEN RAISE(ABORT, 'packaged requires latest packaged manifest') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_manifest_required_for_published
BEFORE UPDATE OF status ON assets
WHEN NEW.status = 'published' AND OLD.status <> NEW.status
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM asset_manifest_versions m
    WHERE m.asset_id = NEW.asset_id
      AND m.stage = 'published'
      AND m.manifest_version = (SELECT MAX(m2.manifest_version) FROM asset_manifest_versions m2 WHERE m2.asset_id = NEW.asset_id)
  ) THEN RAISE(ABORT, 'published requires latest published manifest') END;
END;
