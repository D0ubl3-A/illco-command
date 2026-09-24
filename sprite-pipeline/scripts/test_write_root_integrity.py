#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "state" / "pipeline.sqlite3"
THEME_ID = "original-claymation-celebrity-brawl-parody-v1"
NOW = datetime.now(timezone.utc).isoformat()


def blocked(con: sqlite3.Connection, sql: str, params: tuple, message: str) -> None:
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError as exc:
        assert message in str(exc), str(exc)
        return
    raise AssertionError(f"operation unexpectedly succeeded: {sql}")


def main() -> None:
    with sqlite3.connect(DB) as con:
        con.execute("PRAGMA foreign_keys = ON")
        run_id = "ci-write-root-run"
        con.execute(
            "INSERT OR IGNORE INTO runs(id,theme_id,started_at,code_version,schema_version,score) VALUES(?,?,?,?,?,?)",
            (run_id, THEME_ID, NOW, "ci", 19, 0),
        )

        # Generic evidence must stay inside evidence/.
        con.execute(
            "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            (run_id, "CHR-00001", "write-root-test", "evidence/runs/root-test/ok.json", "a" * 64, NOW),
        )
        blocked(
            con,
            "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            (run_id, "CHR-00001", "write-root-test", "other-dir/looks-safe.json", "b" * 64, NOW),
            "evidence path outside configured root",
        )

        # Render evidence is the asset itself and must match the type-specific root.
        con.execute(
            "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            (run_id, "CHR-00001", "render-file", "assets/characters/CHR-00001.png", "c" * 64, NOW),
        )
        blocked(
            con,
            "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            (run_id, "CHR-00003", "render-file", "assets/fx/CHR-00003.png", "d" * 64, NOW),
            "character render evidence outside configured root",
        )
        con.execute(
            "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            (run_id, "FX-00001", "render-file", "assets/fx/FX-00001.png", "e" * 64, NOW),
        )
        blocked(
            con,
            "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            (run_id, "FX-00002", "render-file", "assets/characters/FX-00002.png", "f" * 64, NOW),
            "fx render evidence outside configured root",
        )

        # Packages and archives cannot use arbitrary relative directories.
        con.execute(
            "INSERT INTO packages(id,run_id,engine,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            ("root-pkg-ok", run_id, "generic", "packages/root-test/pkg.zip", "1" * 64, NOW),
        )
        blocked(
            con,
            "INSERT INTO packages(id,run_id,engine,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            ("root-pkg-bad", run_id, "generic", "tmp/pkg.zip", "2" * 64, NOW),
            "package path outside configured root",
        )
        con.execute(
            "INSERT INTO archives(id,run_id,manifest_path,manifest_sha256,immutable,created_at) VALUES(?,?,?,?,?,?)",
            ("root-archive-ok", run_id, "evidence/archives/root-test/manifest.json", "3" * 64, 1, NOW),
        )
        blocked(
            con,
            "INSERT INTO archives(id,run_id,manifest_path,manifest_sha256,immutable,created_at) VALUES(?,?,?,?,?,?)",
            ("root-archive-bad", run_id, "evidence/runs/not-an-archive/manifest.json", "4" * 64, 1, NOW),
            "archive path outside configured root",
        )

        # Asset content paths are type-scoped as well.
        con.execute("UPDATE assets SET content_path='assets/characters/CHR-00001.png' WHERE asset_id='CHR-00001'")
        blocked(
            con,
            "UPDATE assets SET content_path='assets/fx/CHR-00003.png' WHERE asset_id='CHR-00003'",
            (),
            "character content path outside configured root",
        )
        con.execute("UPDATE assets SET content_path='assets/fx/FX-00001.png' WHERE asset_id='FX-00001'")
        blocked(
            con,
            "UPDATE assets SET content_path='assets/characters/FX-00002.png' WHERE asset_id='FX-00002'",
            (),
            "fx content path outside configured root",
        )
        con.rollback()

    print("configured write-root integrity gates passed")


if __name__ == "__main__":
    main()
