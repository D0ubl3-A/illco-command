PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scoring_categories (
  category TEXT PRIMARY KEY,
  max_points INTEGER NOT NULL CHECK(max_points > 0),
  immutable INTEGER NOT NULL DEFAULT 1 CHECK(immutable = 1)
);

INSERT OR IGNORE INTO scoring_categories(category,max_points) VALUES
  ('architecture_orchestration',1200),
  ('continuity_state',1000),
  ('manifest_integrity',1000),
  ('render_truthfulness',1200),
  ('duplication',1000),
  ('character_coverage',900),
  ('fx_texture_coverage',900),
  ('visual_quality',1000),
  ('scalability_operations',900),
  ('commercial_engine_readiness',900);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_run_category
ON scores(run_id, category);

CREATE TRIGGER IF NOT EXISTS trg_scoring_categories_immutable_update
BEFORE UPDATE ON scoring_categories
BEGIN
  SELECT RAISE(ABORT, 'scoring categories are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_scoring_categories_immutable_delete
BEFORE DELETE ON scoring_categories
BEGIN
  SELECT RAISE(ABORT, 'scoring categories are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_scores_integrity_insert
BEFORE INSERT ON scores
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM scoring_categories c
      WHERE c.category = NEW.category
        AND NEW.points BETWEEN 0 AND c.max_points
    ) THEN RAISE(ABORT, 'score category unknown or exceeds category cap')
  END;
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM evidence e
      WHERE e.id = NEW.evidence_id
        AND e.run_id = NEW.run_id
    ) THEN RAISE(ABORT, 'score evidence must belong to the same run')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_scores_integrity_update
BEFORE UPDATE ON scores
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM scoring_categories c
      WHERE c.category = NEW.category
        AND NEW.points BETWEEN 0 AND c.max_points
    ) THEN RAISE(ABORT, 'score category unknown or exceeds category cap')
  END;
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM evidence e
      WHERE e.id = NEW.evidence_id
        AND e.run_id = NEW.run_id
    ) THEN RAISE(ABORT, 'score evidence must belong to the same run')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_scores_recompute_after_insert
AFTER INSERT ON scores
BEGIN
  UPDATE runs
  SET score = COALESCE((SELECT SUM(points) FROM scores WHERE run_id = NEW.run_id), 0)
  WHERE id = NEW.run_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_scores_recompute_after_update
AFTER UPDATE ON scores
BEGIN
  UPDATE runs
  SET score = COALESCE((SELECT SUM(points) FROM scores WHERE run_id = OLD.run_id), 0)
  WHERE id = OLD.run_id;
  UPDATE runs
  SET score = COALESCE((SELECT SUM(points) FROM scores WHERE run_id = NEW.run_id), 0)
  WHERE id = NEW.run_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_scores_recompute_after_delete
AFTER DELETE ON scores
BEGIN
  UPDATE runs
  SET score = COALESCE((SELECT SUM(points) FROM scores WHERE run_id = OLD.run_id), 0)
  WHERE id = OLD.run_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_runs_score_derived_only
BEFORE UPDATE OF score ON runs
WHEN NEW.score != COALESCE((SELECT SUM(points) FROM scores WHERE run_id = OLD.id), 0)
BEGIN
  SELECT RAISE(ABORT, 'run score must equal evidence-backed category total');
END;

CREATE TRIGGER IF NOT EXISTS trg_scores_total_cap_insert
BEFORE INSERT ON scores
WHEN COALESCE((SELECT SUM(points) FROM scores WHERE run_id = NEW.run_id),0) + NEW.points > 10000
BEGIN
  SELECT RAISE(ABORT, 'run score cannot exceed 10000');
END;

CREATE TRIGGER IF NOT EXISTS trg_scores_total_cap_update
BEFORE UPDATE OF points, run_id ON scores
WHEN COALESCE((SELECT SUM(points) FROM scores WHERE run_id = NEW.run_id AND id != OLD.id),0) + NEW.points > 10000
BEGIN
  SELECT RAISE(ABORT, 'run score cannot exceed 10000');
END;
