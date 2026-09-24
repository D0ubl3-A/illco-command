#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "state" / "schema.sql"
THEME = "test-theme-v1"
ASSET = "CHR-00001"
RUN = "run-package-publication-test"
NOW = datetime.now(timezone.utc).isoformat()


def expect_blocked(con: sqlite3.Connection, sql: str, params: tuple) -> None:
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError("truthfulness gate unexpectedly allowed transition intent")


def evidence(con: sqlite3.Connection, kind: str, path: str, digest: str) -> int:
    cur = con.execute(
        "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
        (RUN, ASSET, kind, path, digest, NOW),
    )
    return int(cur.lastrowid)


def package_evidence(con: sqlite3.Connection, kind: str, path: str, digest: str) -> int:
    cur = con.execute(
        "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
        (RUN, None, kind, path, digest, NOW),
    )
    return int(cur.lastrowid)


def main() -> None:
    con = sqlite3.connect(":memory:")
    try:
        con.executescript(SCHEMA.read_text(encoding="utf-8"))
        for migration in sorted((ROOT / "state").glob("[0-9][0-9][0-9]_*.sql")):
            con.executescript(migration.read_text(encoding="utf-8"))

        con.execute(
            "INSERT INTO themes(id,version,name,status,created_at) VALUES(?,?,?,?,?)",
            (THEME, 1, "test", "active", NOW),
        )
        con.execute(
            "INSERT INTO runs(id,theme_id,started_at,code_version,schema_version,score) VALUES(?,?,?,?,?,?)",
            (RUN, THEME, NOW, "test", 7, 0),
        )
        con.execute(
            "INSERT INTO surgeon_lanes(surgeon_id,lane_start,lane_end,asset_type) VALUES(?,?,?,?)",
            (1, 1, 20, "character"),
        )
        con.execute(
            "INSERT INTO ownership(asset_id,surgeon_id,asset_type,ordinal) VALUES(?,?,?,?)",
            (ASSET, 1, "character", 1),
        )
        # Initial insert is intentionally validated so this test isolates the package/publication gates.
        con.execute(
            "INSERT INTO assets(asset_id,theme_id,category,name,status,updated_at) VALUES(?,?,?,?,?,?)",
            (ASSET, THEME, "character", ASSET, "validated", NOW),
        )

        generic_id = evidence(con, "generic", "evidence/tests/generic.txt", "1" * 64)
        expect_blocked(
            con,
            "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
            ("pkg-generic", ASSET, "validated", "packaged", generic_id, NOW),
        )

        pkg_evidence = evidence(con, "package-integrity", "evidence/packages/pkg-1.sha256", "2" * 64)
        expect_blocked(
            con,
            "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
            ("pkg-no-membership", ASSET, "validated", "packaged", pkg_evidence, NOW),
        )

        con.execute(
            "INSERT INTO packages(id,run_id,engine,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
            ("pkg-1", RUN, "generic", "packages/pkg-1.zip", "3" * 64, NOW),
        )
        con.execute(
            "INSERT INTO package_assets(package_id,asset_id,evidence_id,created_at) VALUES(?,?,?,?)",
            ("pkg-1", ASSET, pkg_evidence, NOW),
        )

        # The package/publication fixture must satisfy the newer engine-package gate.
        # This is package-level evidence (asset_id NULL), as required by 018_engine_package_integrity.sql.
        engine_evidence_id = package_evidence(
            con,
            "engine-package-validation",
            "evidence/packages/pkg-1.engine-validation.json",
            "6" * 64,
        )
        con.execute(
            """
            INSERT INTO engine_package_validations(
                package_id,evidence_id,metadata_path,metadata_sha256,
                import_manifest_path,import_manifest_sha256,parser_version,
                parsed_ok,pngs_ok,sequences_ok,pivots_ok,collisions_ok,
                naming_ok,license_ok,changelog_ok,created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                "pkg-1",
                engine_evidence_id,
                "packages/pkg-1.metadata.json",
                "7" * 64,
                "packages/pkg-1.import-manifest.json",
                "8" * 64,
                "test-parser-v1",
                1, 1, 1, 1, 1, 1, 1, 1,
                NOW,
            ),
        )

        con.execute(
            "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
            ("pkg-good", ASSET, "validated", "packaged", pkg_evidence, NOW),
        )
        con.execute("UPDATE assets SET status='packaged', updated_at=? WHERE asset_id=?", (NOW, ASSET))
        assert con.execute("SELECT status FROM assets WHERE asset_id=?", (ASSET,)).fetchone()[0] == "packaged"

        pub_generic = evidence(con, "generic-publication", "evidence/publication/generic.txt", "4" * 64)
        expect_blocked(
            con,
            "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
            ("pub-generic", ASSET, "packaged", "published", pub_generic, NOW),
        )

        pub_evidence = evidence(con, "publication", "evidence/publication/pub-1.json", "5" * 64)
        expect_blocked(
            con,
            "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
            ("pub-no-record", ASSET, "packaged", "published", pub_evidence, NOW),
        )

        con.execute(
            "INSERT INTO publications(id,asset_id,package_id,destination,published_ref,evidence_id,created_at) VALUES(?,?,?,?,?,?,?)",
            ("pub-1", ASSET, "pkg-1", "test-store", "release://test-store/pkg-1", pub_evidence, NOW),
        )
        con.execute(
            "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
            ("pub-good", ASSET, "packaged", "published", pub_evidence, NOW),
        )
        con.execute("UPDATE assets SET status='published', updated_at=? WHERE asset_id=?", (NOW, ASSET))
        assert con.execute("SELECT status FROM assets WHERE asset_id=?", (ASSET,)).fetchone()[0] == "published"

        # Package membership and publication evidence are immutable.
        try:
            con.execute("DELETE FROM package_assets WHERE asset_id=?", (ASSET,))
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError("package membership deletion unexpectedly succeeded")
        try:
            con.execute("UPDATE publications SET destination='other' WHERE id='pub-1'")
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError("publication mutation unexpectedly succeeded")

        print("package and publication truthfulness gates passed")
    finally:
        con.close()


if __name__ == "__main__":
    main()
