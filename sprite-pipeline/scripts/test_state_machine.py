#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "state" / "pipeline.sqlite3"


def main() -> None:
    with sqlite3.connect(DB) as con:
        aid = "CHR-00001"
        original = con.execute("SELECT status FROM assets WHERE asset_id=?", (aid,)).fetchone()[0]
        assert original == "planned", original

        # Legal transition must succeed.
        con.execute("UPDATE assets SET status='queued' WHERE asset_id=?", (aid,))
        assert con.execute("SELECT status FROM assets WHERE asset_id=?", (aid,)).fetchone()[0] == "queued"

        # Illegal transition must fail closed.
        try:
            con.execute("UPDATE assets SET status='published' WHERE asset_id=?", (aid,))
        except sqlite3.IntegrityError as exc:
            assert "illegal asset status transition" in str(exc)
        else:
            raise AssertionError("illegal queued->published transition was accepted")

        # Restore through an allowed exception path for deterministic replay.
        con.execute("UPDATE assets SET status='blocked' WHERE asset_id=?", (aid,))
        con.execute("UPDATE assets SET status='queued' WHERE asset_id=?", (aid,))
        con.rollback()

    print("state-machine transition guard passed")


if __name__ == "__main__":
    main()
