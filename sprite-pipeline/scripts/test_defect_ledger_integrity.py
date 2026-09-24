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
        con.execute("INSERT INTO themes(id,version,name,status,created_at) VALUES(?,?,?,?,?)", (THEME_ID,1,'Defect Ledger Test','active',now()))
        con.commit()


def main() -> None:
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / 'defects.sqlite3'
        setup_db(db)
        with sqlite3.connect(db) as con:
            con.execute('PRAGMA foreign_keys=ON')
            try:
                con.execute("INSERT INTO defects(issue_id,severity,probability,impact,detectability,blocker,description,status,opened_at) VALUES(?,?,?,?,?,?,?,?,?)",
                            ('BAD-1',10,10,10,1,1,'incomplete','open',now()))
                raise AssertionError('incomplete defect unexpectedly accepted')
            except sqlite3.IntegrityError:
                pass

            ts = now()
            con.execute("""
                INSERT INTO defects(
                  issue_id,severity,probability,impact,detectability,blocker,description,status,opened_at,
                  subsystem,evidence_ref,score_loss,root_cause,repair_plan,owner_surgeon,
                  dependencies_json,validation_plan,regression_risk,updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                'DEF-001',10,9,10,2,1,'cross-range mutation risk','open',ts,
                'ownership','evidence/run-1.json',1200,'missing immutable guard','add trigger guards',42,
                '[]','mutation attempts must fail','low after trigger enforcement',ts
            ))
            votes = [
                ('DEF-001',1,'confirm',None),
                ('DEF-001',2,'confirm',None),
                ('DEF-001',3,'reject','evidence is insufficient'),
            ]
            for issue_id, surgeon_id, vote, note in votes:
                con.execute("INSERT INTO defect_votes(issue_id,surgeon_id,vote,dissent_note,created_at) VALUES(?,?,?,?,?)",
                            (issue_id,surgeon_id,vote,note,now()))
            row = con.execute("SELECT vote_count,dissent_count,score_loss,owner_surgeon FROM defects WHERE issue_id='DEF-001'").fetchone()
            assert row == (3,1,1200,42), row
            assert con.execute("SELECT COUNT(*) FROM defect_votes WHERE issue_id='DEF-001'").fetchone()[0] == 3

            try:
                con.execute("UPDATE defect_votes SET vote='confirm' WHERE issue_id='DEF-001' AND surgeon_id=3")
                raise AssertionError('defect vote mutation unexpectedly succeeded')
            except sqlite3.IntegrityError:
                pass
            try:
                con.execute("DELETE FROM defect_votes WHERE issue_id='DEF-001' AND surgeon_id=3")
                raise AssertionError('defect vote deletion unexpectedly succeeded')
            except sqlite3.IntegrityError:
                pass

            ranked = con.execute("SELECT issue_id FROM defects WHERE status='open' ORDER BY blocker DESC, severity DESC, score_loss DESC").fetchall()
            assert ranked[0][0] == 'DEF-001'

    print('defect ledger completeness, immutable votes, dissent accounting, and ranking evidence passed')


if __name__ == '__main__':
    main()
