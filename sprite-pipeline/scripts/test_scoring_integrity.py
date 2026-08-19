#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from bootstrap_state import ROOT, THEME_ID


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def setup_db(path: Path) -> None:
    schema = (ROOT / 'state' / 'schema.sql').read_text(encoding='utf-8')
    migrations = sorted((ROOT / 'state').glob('[0-9][0-9][0-9]_*.sql'))
    with sqlite3.connect(path) as con:
        con.executescript(schema)
        for migration in migrations:
            con.executescript(migration.read_text(encoding='utf-8'))
        con.execute("INSERT INTO themes(id,version,name,status,created_at) VALUES(?,?,?,?,?)", (THEME_ID,1,'Scoring Integrity Test','active',now()))
        con.execute("INSERT INTO runs(id,theme_id,started_at,code_version,schema_version,score) VALUES(?,?,?,?,?,0)", ('run-score-1',THEME_ID,now(),'test',13))
        con.execute("INSERT INTO runs(id,theme_id,started_at,code_version,schema_version,score) VALUES(?,?,?,?,?,0)", ('run-score-2',THEME_ID,now(),'test',13))
        con.commit()


def add_evidence(con: sqlite3.Connection, run_id: str, name: str) -> int:
    cur = con.execute(
        "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
        (run_id,None,'score-proof',f'evidence/{run_id}/{name}.json',f'{run_id}-{name:0<64}'[:64],now()),
    )
    return int(cur.lastrowid)


def expect_integrity_error(fn, message: str) -> None:
    try:
        fn()
        raise AssertionError(message)
    except sqlite3.IntegrityError:
        pass


def main() -> None:
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / 'scores.sqlite3'
        setup_db(db)
        with sqlite3.connect(db) as con:
            con.execute('PRAGMA foreign_keys=ON')
            e1 = add_evidence(con, 'run-score-1', 'arch')
            e2 = add_evidence(con, 'run-score-1', 'continuity')
            e_other = add_evidence(con, 'run-score-2', 'other')

            caps = dict(con.execute('SELECT category,max_points FROM scoring_categories').fetchall())
            assert len(caps) == 10
            assert sum(caps.values()) == 10000
            assert caps['architecture_orchestration'] == 1200
            assert caps['commercial_engine_readiness'] == 900

            con.execute(
                "INSERT INTO scores(run_id,category,points,evidence_id,created_at) VALUES(?,?,?,?,?)",
                ('run-score-1','architecture_orchestration',1200,e1,now()),
            )
            assert con.execute("SELECT score FROM runs WHERE id='run-score-1'").fetchone()[0] == 1200

            con.execute(
                "INSERT INTO scores(run_id,category,points,evidence_id,created_at) VALUES(?,?,?,?,?)",
                ('run-score-1','continuity_state',900,e2,now()),
            )
            assert con.execute("SELECT score FROM runs WHERE id='run-score-1'").fetchone()[0] == 2100

            expect_integrity_error(
                lambda: con.execute("INSERT INTO scores(run_id,category,points,evidence_id,created_at) VALUES(?,?,?,?,?)",
                                    ('run-score-1','fake_category',1,e2,now())),
                'unknown scoring category unexpectedly accepted',
            )
            expect_integrity_error(
                lambda: con.execute("INSERT INTO scores(run_id,category,points,evidence_id,created_at) VALUES(?,?,?,?,?)",
                                    ('run-score-1','visual_quality',1001,e2,now())),
                'category cap overflow unexpectedly accepted',
            )
            expect_integrity_error(
                lambda: con.execute("INSERT INTO scores(run_id,category,points,evidence_id,created_at) VALUES(?,?,?,?,?)",
                                    ('run-score-1','manifest_integrity',500,e_other,now())),
                'cross-run score evidence unexpectedly accepted',
            )
            expect_integrity_error(
                lambda: con.execute("INSERT INTO scores(run_id,category,points,evidence_id,created_at) VALUES(?,?,?,?,?)",
                                    ('run-score-1','architecture_orchestration',1,e1,now())),
                'duplicate run/category score unexpectedly accepted',
            )
            expect_integrity_error(
                lambda: con.execute("UPDATE runs SET score=10000 WHERE id='run-score-1'"),
                'free-form run score mutation unexpectedly accepted',
            )
            expect_integrity_error(
                lambda: con.execute("UPDATE scoring_categories SET max_points=9999 WHERE category='architecture_orchestration'"),
                'scoring category mutation unexpectedly accepted',
            )
            expect_integrity_error(
                lambda: con.execute("DELETE FROM scoring_categories WHERE category='architecture_orchestration'"),
                'scoring category deletion unexpectedly accepted',
            )

            con.execute("DELETE FROM scores WHERE run_id='run-score-1' AND category='continuity_state'")
            assert con.execute("SELECT score FROM runs WHERE id='run-score-1'").fetchone()[0] == 1200

    print('scoring categories, caps, evidence linkage, uniqueness, and derived run totals passed')


if __name__ == '__main__':
    main()
