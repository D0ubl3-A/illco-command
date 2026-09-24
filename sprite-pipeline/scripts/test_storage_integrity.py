#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "state" / "schema.sql"
NOW = datetime.now(timezone.utc).isoformat()
THEME = "storage-test-theme"
RUN = "storage-test-run"
ASSET = "CHR-00001"


def blocked(con: sqlite3.Connection, sql: str, params: tuple = ()) -> None:
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"operation unexpectedly succeeded: {sql}")


def main() -> None:
    con = sqlite3.connect(":memory:")
    try:
        con.executescript(SCHEMA.read_text(encoding="utf-8"))
        for migration in sorted((ROOT / "state").glob("[0-9][0-9][0-9]_*.sql")):
            con.executescript(migration.read_text(encoding="utf-8"))

        con.execute("INSERT INTO themes(id,version,name,status,created_at) VALUES(?,?,?,?,?)", (THEME,1,"storage test","active",NOW))
        con.execute("INSERT INTO runs(id,theme_id,started_at,code_version,schema_version,score) VALUES(?,?,?,?,?,?)", (RUN,THEME,NOW,"test",10,0))
        con.execute("INSERT INTO surgeon_lanes(surgeon_id,lane_start,lane_end,asset_type) VALUES(?,?,?,?)", (1,1,20,"character"))
        con.execute("INSERT INTO ownership(asset_id,surgeon_id,asset_type,ordinal) VALUES(?,?,?,?)", (ASSET,1,"character",1))
        con.execute("INSERT INTO assets(asset_id,theme_id,category,name,status,updated_at) VALUES(?,?,?,?,?,?)", (ASSET,THEME,"character",ASSET,"planned",NOW))

        # Safe relative evidence is accepted.
        con.execute(
            "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            (RUN, ASSET, "test", "evidence/runs/storage-test/result.json", "a"*64, NOW),
        )

        # Absolute, traversal and Windows-style paths are rejected.
        bad_paths = (
            "/tmp/escape.json",
            "../escape.json",
            "evidence/../escape.json",
            "evidence/run/..",
            "C:/escape.json",
            "evidence\\escape.json",
        )
        for i, path in enumerate(bad_paths, start=1):
            blocked(
                con,
                "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
                (RUN, ASSET, "bad", path, f"{i:064x}", NOW),
            )

        # Evidence cannot be rewritten or removed.
        blocked(con, "UPDATE evidence SET kind='changed' WHERE relative_path=?", ("evidence/runs/storage-test/result.json",))
        blocked(con, "DELETE FROM evidence WHERE relative_path=?", ("evidence/runs/storage-test/result.json",))

        # Package and archive storage paths are also fail-closed.
        blocked(
            con,
            "INSERT INTO packages(id,run_id,engine,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            ("pkg-bad", RUN, "generic", "../pkg.zip", "b"*64, NOW),
        )
        con.execute(
            "INSERT INTO packages(id,run_id,engine,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            ("pkg-good", RUN, "generic", "packages/run/pkg-good.zip", "c"*64, NOW),
        )

        blocked(
            con,
            "INSERT INTO archives(id,run_id,manifest_path,manifest_sha256,immutable,created_at) VALUES(?,?,?,?,?,?)",
            ("archive-bad", RUN, "/absolute/manifest.json", "d"*64, 1, NOW),
        )
        con.execute(
            "INSERT INTO archives(id,run_id,manifest_path,manifest_sha256,immutable,created_at) VALUES(?,?,?,?,?,?)",
            ("archive-good", RUN, "evidence/archives/storage-test/manifest.json", "e"*64, 1, NOW),
        )
        blocked(con, "UPDATE archives SET manifest_path='other.json' WHERE id='archive-good'")
        blocked(con, "DELETE FROM archives WHERE id='archive-good'")

        # Asset content paths cannot escape the storage root semantics.
        blocked(con, "UPDATE assets SET content_path='../escape.png' WHERE asset_id=?", (ASSET,))
        con.execute("UPDATE assets SET content_path='assets/characters/CHR-00001.png' WHERE asset_id=?", (ASSET,))

        print("storage path, immutable evidence and archive integrity gates passed")
    finally:
        con.close()


if __name__ == "__main__":
    main()
