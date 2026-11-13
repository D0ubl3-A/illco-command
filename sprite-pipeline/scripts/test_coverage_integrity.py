#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sqlite3
from datetime import datetime, timezone

from bootstrap_state import bootstrap, DB, THEME_ID


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def expect_blocked(con: sqlite3.Connection, sql: str, args=()) -> None:
    try:
        con.execute(sql, args)
    except sqlite3.DatabaseError:
        con.rollback()
        return
    raise AssertionError(f"mutation unexpectedly allowed: {sql}")


def evidence(con: sqlite3.Connection, run_id: str, asset_id: str | None, kind: str, path: str) -> int:
    sha = hashlib.sha256(path.encode()).hexdigest()
    cur = con.execute(
        "insert into evidence(run_id,asset_id,kind,relative_path,sha256,created_at) values(?,?,?,?,?,?)",
        (run_id, asset_id, kind, path, sha, now()),
    )
    return int(cur.lastrowid)


def main() -> None:
    if DB.exists():
        DB.unlink()
    bootstrap()
    with sqlite3.connect(DB) as con:
        tables = {r[0] for r in con.execute("select name from sqlite_master where type='table'")}
        for name in ('coverage_dimensions','coverage_targets','asset_coverage','coverage_results'):
            assert name in tables

        assert con.execute("select count(*) from coverage_dimensions where required=1").fetchone()[0] >= 20
        run_id = 'coverage-integrity-test'
        con.execute(
            "insert into runs(id,theme_id,started_at,code_version,schema_version) values(?,?,?,?,?)",
            (run_id, THEME_ID, now(), 'test', 16),
        )
        char_evidence = evidence(con, run_id, 'CHR-00001', 'coverage', 'evidence/coverage/chr-00001-action.json')
        fx_evidence = evidence(con, run_id, 'FX-00001', 'coverage', 'evidence/coverage/fx-00001-family.json')
        result_evidence = evidence(con, run_id, None, 'coverage-matrix', 'evidence/coverage/matrix.json')

        con.execute(
            "insert into coverage_targets(theme_id,dimension,value,min_count,created_at) values(?,?,?,?,?)",
            (THEME_ID, 'action', 'idle', 1, now()),
        )
        target_id = con.execute(
            "select id from coverage_targets where theme_id=? and dimension='action' and value='idle'",
            (THEME_ID,),
        ).fetchone()[0]
        con.execute(
            "insert into asset_coverage(asset_id,dimension,value,evidence_id,created_at) values(?,?,?,?,?)",
            ('CHR-00001', 'action', 'idle', char_evidence, now()),
        )
        con.execute(
            "insert into asset_coverage(asset_id,dimension,value,evidence_id,created_at) values(?,?,?,?,?)",
            ('FX-00001', 'fx_family', 'impact', fx_evidence, now()),
        )
        observed = con.execute(
            "select count(distinct asset_id) from asset_coverage where dimension='action' and value='idle'",
        ).fetchone()[0]
        assert observed == 1
        con.execute(
            "insert into coverage_results(run_id,target_id,observed_count,passed,evidence_id,created_at) values(?,?,?,?,?,?)",
            (run_id, target_id, observed, 1, result_evidence, now()),
        )
        con.commit()

        expect_blocked(
            con,
            "insert into asset_coverage(asset_id,dimension,value,evidence_id,created_at) values(?,?,?,?,?)",
            ('FX-00001', 'action', 'idle', fx_evidence, now()),
        )
        expect_blocked(con, "update coverage_targets set min_count=0 where id=?", (target_id,))
        expect_blocked(con, "delete from asset_coverage where asset_id='CHR-00001' and dimension='action'")
        expect_blocked(con, "update coverage_results set passed=0 where run_id=? and target_id=?", (run_id, target_id))

        row = con.execute(
            "select observed_count,passed from coverage_results where run_id=? and target_id=?",
            (run_id, target_id),
        ).fetchone()
        assert row == (1, 1)

    print('coverage matrix integrity passed')


if __name__ == '__main__':
    main()
