PRAGMA foreign_keys = ON;

CREATE TRIGGER IF NOT EXISTS trg_ownership_lane_guard
BEFORE INSERT ON ownership
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM surgeon_lanes s
      WHERE s.surgeon_id = NEW.surgeon_id
        AND s.asset_type = NEW.asset_type
        AND NEW.ordinal BETWEEN s.lane_start AND s.lane_end
    ) THEN RAISE(ABORT, 'cross-range ownership violation')
  END;

  SELECT CASE
    WHEN NEW.asset_id <> CASE
      WHEN NEW.asset_type = 'character' THEN printf('CHR-%05d', NEW.ordinal)
      WHEN NEW.asset_type = 'fx' THEN printf('FX-%05d', NEW.ordinal)
    END THEN RAISE(ABORT, 'asset id does not match ownership type/ordinal')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_ownership_no_update
BEFORE UPDATE ON ownership
BEGIN
  SELECT RAISE(ABORT, 'ownership mapping is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_ownership_no_delete
BEFORE DELETE ON ownership
BEGIN
  SELECT RAISE(ABORT, 'ownership mapping is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_surgeon_lanes_no_update
BEFORE UPDATE ON surgeon_lanes
BEGIN
  SELECT RAISE(ABORT, 'surgeon lane mapping is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_surgeon_lanes_no_delete
BEFORE DELETE ON surgeon_lanes
BEGIN
  SELECT RAISE(ABORT, 'surgeon lane mapping is immutable');
END;
