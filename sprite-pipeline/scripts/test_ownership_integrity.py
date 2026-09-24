#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "state" / "pipeline.sqlite3"


def expect_blocked(con: sqlite3.Connection, sql: str, params: tuple = ()) -> None:
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"mutation unexpectedly succeeded: {sql}")


def main() -> None:
    with sqlite3.connect(DB) as con:
        before_ownership = con.execute("SELECT COUNT(*) FROM ownership").fetchone()[0]
        before_lanes = con.execute("SELECT COUNT(*) FROM surgeon_lanes").fetchone()[0]

        expect_blocked(
            con,
            "UPDATE ownership SET surgeon_id = 2 WHERE asset_id = 'CHR-00001'",
        )
        expect_blocked(
            con,
            "DELETE FROM ownership WHERE asset_id = 'CHR-00001'",
        )
        expect_blocked(
            con,
            "UPDATE surgeon_lanes SET lane_start = 2 WHERE surgeon_id = 1",
        )
        expect_blocked(
            con,
            "DELETE FROM surgeon_lanes WHERE surgeon_id = 1",
        )
        expect_blocked(
            con,
            "INSERT INTO ownership(asset_id,surgeon_id,asset_type,ordinal) VALUES(?,?,?,?)",
            ("CHR-00021-X", 1, "character", 21),
        )
        expect_blocked(
            con,
            "INSERT INTO ownership(asset_id,surgeon_id,asset_type,ordinal) VALUES(?,?,?,?)",
            ("FX-00001", 1, "fx", 1),
        )

        assert con.execute("SELECT COUNT(*) FROM ownership").fetchone()[0] == before_ownership
        assert con.execute("SELECT COUNT(*) FROM surgeon_lanes").fetchone()[0] == before_lanes
        assert con.execute("SELECT surgeon_id FROM ownership WHERE asset_id='CHR-00001'").fetchone()[0] == 1
        con.rollback()

    print("ownership immutability and cross-range guards passed")


if __name__ == "__main__":
    main()
