PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS transition_rules (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  requires_evidence INTEGER NOT NULL DEFAULT 1 CHECK(requires_evidence IN (0,1)),
  PRIMARY KEY(from_status, to_status)
);

INSERT OR IGNORE INTO transition_rules(from_status,to_status,requires_evidence) VALUES
('planned','queued',1),
('queued','rendering',1),
('rendering','rendered_unvalidated',1),
('rendered_unvalidated','validated',1),
('validated','packaged',1),
('packaged','published',1),
('planned','blocked',1),('queued','blocked',1),('rendering','blocked',1),('rendered_unvalidated','blocked',1),
('queued','retryable_failed',1),('rendering','retryable_failed',1),
('rendered_unvalidated','rejected_duplicate',1),('rendered_unvalidated','rejected_quality',1),
('rendered_unvalidated','rejected_ip',1),('rendered_unvalidated','rejected_policy',1),
('rendered_unvalidated','quarantined',1),('validated','quarantined',1),
('validated','retired',1),('packaged','retired',1),('published','retired',1),
('rejected_duplicate','replaced',1),('rejected_quality','replaced',1),('rejected_ip','replaced',1),
('blocked','queued',1),('retryable_failed','queued',1),('quarantined','queued',1),('replaced','queued',1);

CREATE TRIGGER IF NOT EXISTS trg_assets_transition_guard
BEFORE UPDATE OF status ON assets
WHEN NEW.status <> OLD.status
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM transition_rules r
      WHERE r.from_status = OLD.status AND r.to_status = NEW.status
    ) THEN RAISE(ABORT, 'illegal asset status transition')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_status_event_matches_asset
BEFORE INSERT ON status_events
WHEN NEW.from_status IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM transition_rules r
      WHERE r.from_status = NEW.from_status AND r.to_status = NEW.to_status
    ) THEN RAISE(ABORT, 'illegal status event transition')
  END;
END;
