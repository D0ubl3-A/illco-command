#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "state" / "pipeline.sqlite3"
SCHEMA = ROOT / "state" / "schema.sql"
THEME_ID = "original-claymation-celebrity-brawl-parody-v1"


def asset_id(kind: str, ordinal: int) -> str:
    prefix = "CHR" if kind == "character" else "FX"
    return f"{prefix}-{ordinal:05d}"


def bootstrap() -> None:
    DB.parent.mkdir(parents=True, exist_ok=True)
    schema = SCHEMA.read_text(encoding="utf-8")
    migrations = sorted((ROOT / "state").glob("[0-9][0-9][0-9]_*.sql"))
    now = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(DB) as con:
        con.executescript(schema)
        for migration in migrations:
            con.executescript(migration.read_text(encoding="utf-8"))

        con.execute(
            "INSERT OR IGNORE INTO themes(id, version, name, status, created_at) VALUES(?,?,?,?,?)",
            (THEME_ID, 1, "Original Claymation Celebrity-Brawl Parody", "active", now),
        )

        for surgeon in range(1, 1001):
            kind = "character" if surgeon <= 500 else "fx"
            lane_start = (surgeon - 1) * 20 + 1 if kind == "character" else (surgeon - 501) * 20 + 1
            lane_end = lane_start + 19
            con.execute(
                "INSERT OR IGNORE INTO surgeon_lanes(surgeon_id,lane_start,lane_end,asset_type) VALUES(?,?,?,?)",
                (surgeon, lane_start, lane_end, kind),
            )
            for local_index in range(20):
                ordinal = lane_start + local_index
                aid = asset_id(kind, ordinal)
                con.execute(
                    "INSERT OR IGNORE INTO ownership(asset_id,surgeon_id,asset_type,ordinal) VALUES(?,?,?,?)",
                    (aid, surgeon, kind, ordinal),
                )
                con.execute(
                    "INSERT OR IGNORE INTO assets(asset_id,theme_id,category,name,status,updated_at) VALUES(?,?,?,?,?,?)",
                    (aid, THEME_ID, kind, aid, "planned", now),
                )

        counts = dict(con.execute("SELECT asset_type, COUNT(*) FROM ownership GROUP BY asset_type").fetchall())
        assert counts == {"character": 10000, "fx": 10000}, counts
        owners = con.execute("SELECT COUNT(DISTINCT surgeon_id) FROM ownership").fetchone()[0]
        assert owners == 1000, owners
        duplicates = con.execute(
            "SELECT COUNT(*) FROM (SELECT asset_id, COUNT(*) c FROM ownership GROUP BY asset_id HAVING c <> 1)"
        ).fetchone()[0]
        assert duplicates == 0, duplicates
        rules = con.execute("SELECT COUNT(*) FROM transition_rules").fetchone()[0]
        assert rules > 0, rules
        con.commit()

    print(f"initialized {DB}")
    print("ownership: 10,000 characters + 10,000 FX, exactly 20 per surgeon")
    print(f"transition rules loaded: {rules}")


if __name__ == "__main__":
    bootstrap()
