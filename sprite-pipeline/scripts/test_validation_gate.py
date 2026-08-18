#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / 'state' / 'pipeline.sqlite3'
ASSET = 'CHR-00001'
RUN = 'validation-gate-test-run'


def must_fail(fn, label: str) -> None:
    try:
        fn()
    except sqlite3.IntegrityError:
        return
    except sqlite3.OperationalError:
        return
    raise AssertionError(f'{label}: expected SQLite rejection')


def main() -> None:
    with sqlite3.connect(DB) as con:
        con.execute('PRAGMA foreign_keys = ON')
        now = "2026-08-19T00:00:00+00:00"
        theme = con.execute('SELECT id FROM themes LIMIT 1').fetchone()[0]
        con.execute(
            'INSERT OR IGNORE INTO runs(id,theme_id,started_at,code_version,schema_version,score) VALUES(?,?,?,?,?,0)',
            (RUN, theme, now, 'validation-gate-test', 6),
        )

        # Drive the asset to rendered_unvalidated using real registered PNG evidence.
        png = b'\x89PNG\r\n\x1a\nvalidation-gate-fixture'
        sha = hashlib.sha256(png).hexdigest()
        rel = 'sprite-pipeline/evidence/tests/CHR-00001.png'
        con.execute(
            'INSERT OR IGNORE INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)',
            (RUN, ASSET, 'render-file', rel, sha, now),
        )
        render_eid = con.execute('SELECT id FROM evidence WHERE sha256=?', (sha,)).fetchone()[0]
        con.execute(
            'INSERT OR IGNORE INTO file_registrations(asset_id,evidence_id,relative_path,sha256,byte_size,mime,extension,width,height,color_mode,open_ok,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
            (ASSET, render_eid, rel, sha, len(png), 'image/png', '.png', 64, 64, 'RGBA', 1, now),
        )

        for idx, (frm, to) in enumerate((('planned','queued'),('queued','rendering'))):
            ev_sha = hashlib.sha256(f'{ASSET}:{frm}:{to}'.encode()).hexdigest()
            ev_rel = f'sprite-pipeline/evidence/tests/{ASSET}-{to}.txt'
            con.execute(
                'INSERT OR IGNORE INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)',
                (RUN, ASSET, 'transition', ev_rel, ev_sha, now),
            )
            eid = con.execute('SELECT id FROM evidence WHERE sha256=?', (ev_sha,)).fetchone()[0]
            op = f'validation-gate-{idx}-{to}'
            con.execute(
                'INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)',
                (op, ASSET, frm, to, eid, now),
            )
            con.execute('UPDATE assets SET status=?, updated_at=? WHERE asset_id=?', (to, now, ASSET))

        con.execute(
            'INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)',
            ('validation-gate-rendered', ASSET, 'rendering', 'rendered_unvalidated', render_eid, now),
        )
        con.execute('UPDATE assets SET status=?, updated_at=? WHERE asset_id=?', ('rendered_unvalidated', now, ASSET))

        suite_sha = hashlib.sha256(b'validation-suite').hexdigest()
        suite_rel = 'sprite-pipeline/evidence/tests/CHR-00001-validation-suite.json'
        con.execute(
            'INSERT OR IGNORE INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)',
            (RUN, ASSET, 'validation-suite', suite_rel, suite_sha, now),
        )
        suite_eid = con.execute('SELECT id FROM evidence WHERE sha256=?', (suite_sha,)).fetchone()[0]

        must_fail(
            lambda: con.execute(
                'INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)',
                ('validation-gate-too-early', ASSET, 'rendered_unvalidated', 'validated', suite_eid, now),
            ),
            'validated with zero mandatory tests',
        )

        required = [r[0] for r in con.execute(
            "SELECT test_name FROM validation_requirements WHERE asset_type='character' AND mandatory=1 ORDER BY test_name"
        )]
        assert required, 'character validation requirements missing'

        for test_name in required[:-1]:
            con.execute(
                'INSERT INTO validations(asset_id,test_name,passed,raw_value,tool_version,evidence_id,created_at) VALUES(?,?,?,?,?,?,?)',
                (ASSET, test_name, 1, 'pass', 'test-suite/1', suite_eid, now),
            )

        must_fail(
            lambda: con.execute(
                'INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)',
                ('validation-gate-incomplete', ASSET, 'rendered_unvalidated', 'validated', suite_eid, now),
            ),
            'validated with incomplete mandatory suite',
        )

        con.execute(
            'INSERT INTO validations(asset_id,test_name,passed,raw_value,tool_version,evidence_id,created_at) VALUES(?,?,?,?,?,?,?)',
            (ASSET, required[-1], 1, 'pass', 'test-suite/1', suite_eid, now),
        )
        con.execute(
            'INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)',
            ('validation-gate-complete', ASSET, 'rendered_unvalidated', 'validated', suite_eid, now),
        )
        con.execute('UPDATE assets SET status=?, updated_at=? WHERE asset_id=?', ('validated', now, ASSET))
        assert con.execute('SELECT status FROM assets WHERE asset_id=?', (ASSET,)).fetchone()[0] == 'validated'
        con.rollback()

    print('mandatory validation gate passed')


if __name__ == '__main__':
    main()
