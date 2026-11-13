PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS transition_intents (
  operation_key TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(asset_id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  evidence_id INTEGER NOT NULL REFERENCES evidence(id),
  created_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0 CHECK(consumed IN (0,1))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transition_intents_one_open_per_asset
ON transition_intents(asset_id)
WHERE consumed = 0;

CREATE TRIGGER IF NOT EXISTS trg_transition_intent_valid
BEFORE INSERT ON transition_intents
BEGIN
  SELECT CASE
    WHEN NEW.consumed <> 0 THEN RAISE(ABORT, 'new transition intent must be unconsumed')
    WHEN NOT EXISTS (
      SELECT 1 FROM assets a
      WHERE a.asset_id = NEW.asset_id AND a.status = NEW.from_status
    ) THEN RAISE(ABORT, 'transition intent from_status does not match asset')
    WHEN NOT EXISTS (
      SELECT 1 FROM transition_rules r
      WHERE r.from_status = NEW.from_status AND r.to_status = NEW.to_status
    ) THEN RAISE(ABORT, 'transition intent is not allowed')
    WHEN NOT EXISTS (
      SELECT 1 FROM evidence e
      WHERE e.id = NEW.evidence_id
        AND (e.asset_id = NEW.asset_id OR e.asset_id IS NULL)
    ) THEN RAISE(ABORT, 'transition evidence does not match asset')
  END;
END;

DROP TRIGGER IF EXISTS trg_assets_transition_guard;
CREATE TRIGGER trg_assets_transition_guard
BEFORE UPDATE OF status ON assets
WHEN NEW.status <> OLD.status
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM transition_rules r
      WHERE r.from_status = OLD.status AND r.to_status = NEW.status
    ) THEN RAISE(ABORT, 'illegal asset status transition')
    WHEN NOT EXISTS (
      SELECT 1 FROM transition_intents i
      WHERE i.asset_id = OLD.asset_id
        AND i.from_status = OLD.status
        AND i.to_status = NEW.status
        AND i.consumed = 0
    ) THEN RAISE(ABORT, 'status transition requires unconsumed evidence-backed intent')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_assets_transition_event
AFTER UPDATE OF status ON assets
WHEN NEW.status <> OLD.status
BEGIN
  INSERT INTO status_events(asset_id,from_status,to_status,operation_key,evidence_id,created_at)
  SELECT OLD.asset_id, OLD.status, NEW.status, i.operation_key, i.evidence_id, datetime('now')
  FROM transition_intents i
  WHERE i.asset_id = OLD.asset_id
    AND i.from_status = OLD.status
    AND i.to_status = NEW.status
    AND i.consumed = 0;

  UPDATE transition_intents
  SET consumed = 1
  WHERE asset_id = OLD.asset_id
    AND from_status = OLD.status
    AND to_status = NEW.status
    AND consumed = 0;
END;

CREATE TRIGGER IF NOT EXISTS trg_transition_intents_immutable_when_consumed
BEFORE UPDATE ON transition_intents
WHEN OLD.consumed = 1
BEGIN
  SELECT RAISE(ABORT, 'consumed transition intents are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_transition_intents_no_delete
BEFORE DELETE ON transition_intents
BEGIN
  SELECT RAISE(ABORT, 'transition intents are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_status_events_no_update
BEFORE UPDATE ON status_events
BEGIN
  SELECT RAISE(ABORT, 'status events are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_status_events_no_delete
BEFORE DELETE ON status_events
BEGIN
  SELECT RAISE(ABORT, 'status events are append-only');
END;
