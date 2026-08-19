PRAGMA foreign_keys = ON;

ALTER TABLE defects ADD COLUMN subsystem TEXT;
ALTER TABLE defects ADD COLUMN evidence_ref TEXT;
ALTER TABLE defects ADD COLUMN score_loss INTEGER NOT NULL DEFAULT 0 CHECK(score_loss >= 0);
ALTER TABLE defects ADD COLUMN root_cause TEXT;
ALTER TABLE defects ADD COLUMN repair_plan TEXT;
ALTER TABLE defects ADD COLUMN owner_surgeon INTEGER CHECK(owner_surgeon BETWEEN 1 AND 1000);
ALTER TABLE defects ADD COLUMN dependencies_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE defects ADD COLUMN validation_plan TEXT;
ALTER TABLE defects ADD COLUMN regression_risk TEXT;
ALTER TABLE defects ADD COLUMN vote_count INTEGER NOT NULL DEFAULT 0 CHECK(vote_count >= 0);
ALTER TABLE defects ADD COLUMN dissent_count INTEGER NOT NULL DEFAULT 0 CHECK(dissent_count >= 0);
ALTER TABLE defects ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS defect_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id TEXT NOT NULL REFERENCES defects(issue_id),
  surgeon_id INTEGER NOT NULL CHECK(surgeon_id BETWEEN 1 AND 1000),
  vote TEXT NOT NULL CHECK(vote IN ('confirm','reject','abstain')),
  dissent_note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(issue_id, surgeon_id)
);

CREATE TRIGGER IF NOT EXISTS trg_defect_complete_insert
BEFORE INSERT ON defects
WHEN NEW.subsystem IS NULL
  OR NEW.root_cause IS NULL
  OR NEW.repair_plan IS NULL
  OR NEW.owner_surgeon IS NULL
  OR NEW.validation_plan IS NULL
  OR NEW.regression_risk IS NULL
  OR NEW.updated_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'defect ledger requires complete ranking and repair metadata');
END;

CREATE TRIGGER IF NOT EXISTS trg_defect_vote_insert
AFTER INSERT ON defect_votes
BEGIN
  UPDATE defects
  SET vote_count = vote_count + 1,
      dissent_count = dissent_count + CASE WHEN NEW.vote = 'reject' OR NEW.dissent_note IS NOT NULL THEN 1 ELSE 0 END,
      updated_at = NEW.created_at
  WHERE issue_id = NEW.issue_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_defect_vote_immutable_update
BEFORE UPDATE ON defect_votes
BEGIN
  SELECT RAISE(ABORT, 'defect votes are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_defect_vote_immutable_delete
BEFORE DELETE ON defect_votes
BEGIN
  SELECT RAISE(ABORT, 'defect votes are immutable');
END;

CREATE INDEX IF NOT EXISTS idx_defect_votes_issue ON defect_votes(issue_id, surgeon_id);
CREATE INDEX IF NOT EXISTS idx_defects_rank ON defects(blocker DESC, severity DESC, score_loss DESC, status);
