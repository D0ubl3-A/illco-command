#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "state" / "schema.sql"
THEME = "test-theme-v1"
ASSET = "CHR-00001"
RUN = "run-engine-package-test"
NOW = datetime.now(timezone.utc).isoformat()


def expect_blocked(con: sqlite3.Connection, sql: str, params: tuple) -> None:
    con.execute("SAVEPOINT negative_probe")
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        con.execute("ROLLBACK TO negative_probe")
        con.execute("RELEASE negative_probe")
        return
    con.execute("ROLLBACK TO negative_probe")
    con.execute("RELEASE negative_probe")
    raise AssertionError("engine package integrity gate unexpectedly allowed invalid write")


def main() -> None:
    con = sqlite3.connect(":memory:")
    try:
        con.executescript(SCHEMA.read_text(encoding="utf-8"))
        for migration in sorted((ROOT / "state").glob("[0-9][0-9][0-9]_*.sql")):
            con.executescript(migration.read_text(encoding="utf-8"))

        con.execute("INSERT INTO themes(id,version,name,status,created_at) VALUES(?,?,?,?,?)", (THEME,1,"test","active",NOW))
        con.execute("INSERT INTO runs(id,theme_id,started_at,code_version,schema_version,score) VALUES(?,?,?,?,?,?)", (RUN,THEME,NOW,"test",18,0))
        con.execute("INSERT INTO surgeon_lanes(surgeon_id,lane_start,lane_end,asset_type) VALUES(?,?,?,?)", (1,1,20,"character"))
        con.execute("INSERT INTO ownership(asset_id,surgeon_id,asset_type,ordinal) VALUES(?,?,?,?)", (ASSET,1,"character",1))
        con.execute("INSERT INTO assets(asset_id,theme_id,category,name,status,updated_at) VALUES(?,?,?,?,?,?)", (ASSET,THEME,"character",ASSET,"validated",NOW))

        pkg_evidence = con.execute(
            "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            (RUN,ASSET,"package-integrity","packages/pkg-1.sha256","1"*64,NOW),
        ).lastrowid
        con.execute("INSERT INTO packages(id,run_id,engine,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)", ("pkg-1",RUN,"unity","packages/pkg-1.zip","2"*64,NOW))
        con.execute("INSERT INTO package_assets(package_id,asset_id,evidence_id,created_at) VALUES(?,?,?,?)", ("pkg-1",ASSET,pkg_evidence,NOW))

        # Package membership alone must not satisfy the engine-readiness gate.
        expect_blocked(
            con,
            "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
            ("pkg-no-engine-validation",ASSET,"validated","packaged",pkg_evidence,NOW),
        )

        engine_evidence = con.execute(
            "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            (RUN,None,"engine-package-validation","packages/pkg-1.engine-validation.json","3"*64,NOW),
        ).lastrowid

        invalid = (
            "pkg-1",engine_evidence,"packages/pkg-1/frame-data.json","4"*64,
            "packages/pkg-1/import-manifest.json","5"*64,"engine-validator/1.0",
            1,1,1,1,1,0,1,1,NOW,
        )
        expect_blocked(
            con,
            "INSERT INTO engine_package_validations(package_id,evidence_id,metadata_path,metadata_sha256,import_manifest_path,import_manifest_sha256,parser_version,parsed_ok,pngs_ok,sequences_ok,pivots_ok,collisions_ok,naming_ok,license_ok,changelog_ok,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            invalid,
        )

        valid = list(invalid)
        valid[12] = 1
        con.execute(
            "INSERT INTO engine_package_validations(package_id,evidence_id,metadata_path,metadata_sha256,import_manifest_path,import_manifest_sha256,parser_version,parsed_ok,pngs_ok,sequences_ok,pivots_ok,collisions_ok,naming_ok,license_ok,changelog_ok,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            tuple(valid),
        )

        con.execute(
            "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
            ("pkg-engine-good",ASSET,"validated","packaged",pkg_evidence,NOW),
        )
        con.execute("UPDATE assets SET status='packaged', updated_at=? WHERE asset_id=?", (NOW,ASSET))
        assert con.execute("SELECT status FROM assets WHERE asset_id=?", (ASSET,)).fetchone()[0] == "packaged"

        expect_blocked(con, "UPDATE engine_package_validations SET parser_version=? WHERE package_id=?", ("tampered", "pkg-1"))
        expect_blocked(con, "DELETE FROM engine_package_validations WHERE package_id=?", ("pkg-1",))
        assert con.execute("SELECT count(*) FROM engine_package_validations WHERE package_id='pkg-1'").fetchone()[0] == 1

        print("engine package integrity gate passed")
    finally:
        con.close()


if __name__ == "__main__":
    main()
