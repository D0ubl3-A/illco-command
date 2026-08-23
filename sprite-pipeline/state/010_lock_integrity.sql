PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lock_intents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lock_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('acquire','heartbeat','release','recover')),
  owner TEXT NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(id),
  expected_owner TEXT,
  created_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE TABLE IF NOT EXISTS lock_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lock_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('acquire','heartbeat','release','recover')),
  owner TEXT NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(id),
  prior_owner TEXT,
  heartbeat_at TEXT,
  expires_at TEXT,
  intent_id INTEGER NOT NULL UNIQUE REFERENCES lock_intents(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lock_intents_key ON lock_intents(lock_key, consumed_at, id);
CREATE INDEX IF NOT EXISTS idx_lock_events_key ON lock_events(lock_key, id);
CREATE INDEX IF NOT EXISTS idx_locks_expiry ON locks(expires_at);

CREATE TRIGGER IF NOT EXISTS lock_insert_requires_intent
BEFORE INSERT ON locks
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM lock_intents i
    WHERE i.lock_key = NEW.lock_key
      AND i.action = 'acquire'
      AND i.owner = NEW.owner
      AND i.run_id = NEW.run_id
      AND i.consumed_at IS NULL
  ) THEN RAISE(ABORT, 'lock acquire requires matching unconsumed intent') END;
END;

CREATE TRIGGER IF NOT EXISTS lock_insert_audit
AFTER INSERT ON locks
BEGIN
  INSERT INTO lock_events(lock_key, action, owner, run_id, prior_owner, heartbeat_at, expires_at, intent_id, created_at)
  SELECT NEW.lock_key, 'acquire', NEW.owner, NEW.run_id, NULL, NEW.heartbeat_at, NEW.expires_at, i.id, strftime('%Y-%m-%dT%H:%M:%fZ','now')
  FROM lock_intents i
  WHERE i.lock_key = NEW.lock_key AND i.action='acquire' AND i.owner=NEW.owner AND i.run_id=NEW.run_id AND i.consumed_at IS NULL
  ORDER BY i.id DESC LIMIT 1;
  UPDATE lock_intents SET consumed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id=(SELECT intent_id FROM lock_events WHERE lock_key=NEW.lock_key ORDER BY id DESC LIMIT 1);
END;

CREATE TRIGGER IF NOT EXISTS lock_update_requires_intent
BEFORE UPDATE ON locks
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM lock_intents i
    WHERE i.lock_key = OLD.lock_key
      AND i.owner = NEW.owner
      AND i.run_id = NEW.run_id
      AND i.consumed_at IS NULL
      AND (
        (i.action='heartbeat' AND OLD.owner=NEW.owner AND OLD.run_id=NEW.run_id)
        OR
        (i.action='recover' AND i.expected_owner=OLD.owner AND julianday(OLD.expires_at) <= julianday('now'))
      )
  ) THEN RAISE(ABORT, 'lock update requires owner heartbeat or expired-lock recovery intent') END;
END;

CREATE TRIGGER IF NOT EXISTS lock_update_audit
AFTER UPDATE ON locks
BEGIN
  INSERT INTO lock_events(lock_key, action, owner, run_id, prior_owner, heartbeat_at, expires_at, intent_id, created_at)
  SELECT NEW.lock_key, i.action, NEW.owner, NEW.run_id, OLD.owner, NEW.heartbeat_at, NEW.expires_at, i.id, strftime('%Y-%m-%dT%H:%M:%fZ','now')
  FROM lock_intents i
  WHERE i.lock_key=NEW.lock_key AND i.owner=NEW.owner AND i.run_id=NEW.run_id AND i.consumed_at IS NULL
    AND ((i.action='heartbeat' AND OLD.owner=NEW.owner AND OLD.run_id=NEW.run_id)
      OR (i.action='recover' AND i.expected_owner=OLD.owner))
  ORDER BY i.id DESC LIMIT 1;
  UPDATE lock_intents SET consumed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id=(SELECT intent_id FROM lock_events WHERE lock_key=NEW.lock_key ORDER BY id DESC LIMIT 1);
END;

CREATE TRIGGER IF NOT EXISTS lock_delete_requires_intent
BEFORE DELETE ON locks
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM lock_intents i
    WHERE i.lock_key=OLD.lock_key AND i.action='release' AND i.owner=OLD.owner AND i.run_id=OLD.run_id AND i.consumed_at IS NULL
  ) THEN RAISE(ABORT, 'lock release requires matching owner intent') END;
END;

CREATE TRIGGER IF NOT EXISTS lock_delete_audit
AFTER DELETE ON locks
BEGIN
  INSERT INTO lock_events(lock_key, action, owner, run_id, prior_owner, heartbeat_at, expires_at, intent_id, created_at)
  SELECT OLD.lock_key, 'release', OLD.owner, OLD.run_id, OLD.owner, OLD.heartbeat_at, OLD.expires_at, i.id, strftime('%Y-%m-%dT%H:%M:%fZ','now')
  FROM lock_intents i
  WHERE i.lock_key=OLD.lock_key AND i.action='release' AND i.owner=OLD.owner AND i.run_id=OLD.run_id AND i.consumed_at IS NULL
  ORDER BY i.id DESC LIMIT 1;
  UPDATE lock_intents SET consumed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id=(SELECT intent_id FROM lock_events WHERE lock_key=OLD.lock_key ORDER BY id DESC LIMIT 1);
END;

CREATE TRIGGER IF NOT EXISTS lock_events_no_update
BEFORE UPDATE ON lock_events BEGIN SELECT RAISE(ABORT, 'lock events are immutable'); END;
CREATE TRIGGER IF NOT EXISTS lock_events_no_delete
BEFORE DELETE ON lock_events BEGIN SELECT RAISE(ABORT, 'lock events are immutable'); END;
CREATE TRIGGER IF NOT EXISTS consumed_lock_intents_no_update
BEFORE UPDATE ON lock_intents
WHEN OLD.consumed_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'consumed lock intents are immutable'); END;
CREATE TRIGGER IF NOT EXISTS lock_intents_no_delete
BEFORE DELETE ON lock_intents BEGIN SELECT RAISE(ABORT, 'lock intents are append-only'); END;
