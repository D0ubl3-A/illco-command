#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / 'state' / 'pipeline.sqlite3'


def must_fail(con: sqlite3.Connection, sql: str, params=()) -> None:
    try:
        con.execute(sql, params)
    except sqlite3.DatabaseError:
        return
    raise AssertionError(f'expected failure: {sql}')


def main() -> None:
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB) as con:
        con.execute('PRAGMA foreign_keys=ON')
        run_id = 'dup-test-run'
        con.execute(
            "INSERT OR IGNORE INTO runs(id,theme_id,started_at,code_version,schema_version,score) VALUES(?,?,?,?,?,0)",
            (run_id, 'original-claymation-celebrity-brawl-parody-v1', now, 'duplicate-test', 9),
        )
        evidence_ids = []
        for i, aid in enumerate(('CHR-00001','CHR-00002','FX-00001'), 1):
            sha = f'{i:064x}'
            path = f'evidence/duplicate-test/{aid}-{i}.json'
            con.execute(
                "INSERT OR IGNORE INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
                (run_id, aid, 'duplicate-signature', path, sha, now),
            )
            eid = con.execute('SELECT id FROM evidence WHERE relative_path=?', (path,)).fetchone()[0]
            evidence_ids.append(eid)

        con.execute(
            "INSERT INTO asset_signatures(asset_id,sha256,phash,dhash,silhouette_signature,pose_signature,palette_signature,prompt_signature,fx_geometry_signature,tool_versions_json,evidence_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            ('CHR-00001','a'*64,'0011223344556677','8899aabbccddeeff','sil-a','pose-a','pal-a','prompt-a',None,'{"sha256":"builtin","phash":"test","dhash":"test"}',evidence_ids[0]),
        )
        con.execute(
            "INSERT INTO asset_signatures(asset_id,sha256,phash,dhash,silhouette_signature,pose_signature,palette_signature,prompt_signature,fx_geometry_signature,tool_versions_json,evidence_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            ('CHR-00002','b'*64,'0011223344556678','8899aabbccddeefe','sil-b','pose-b','pal-b','prompt-b',None,'{"sha256":"builtin","phash":"test","dhash":"test"}',evidence_ids[1]),
        )
        con.execute(
            "INSERT INTO asset_signatures(asset_id,sha256,phash,dhash,silhouette_signature,pose_signature,palette_signature,prompt_signature,fx_geometry_signature,tool_versions_json,evidence_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            ('FX-00001','c'*64,'1111222233334444','aaaabbbbccccdddd','sil-fx','pose-fx','pal-fx','prompt-fx','geom-fx','{"sha256":"builtin","phash":"test","dhash":"test"}',evidence_ids[2]),
        )

        must_fail(con,
            "INSERT INTO asset_signatures(asset_id,sha256,phash,dhash,silhouette_signature,pose_signature,palette_signature,prompt_signature,tool_versions_json,evidence_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
            ('CHR-00003','a'*64,'x','y','s','p','q','r','{}',evidence_ids[0]))

        con.execute(
            "INSERT INTO duplicate_candidates(asset_a,asset_b,method,raw_score,threshold,decision,evidence_id,tool_version) VALUES(?,?,?,?,?,?,?,?)",
            ('CHR-00001','CHR-00002','phash',1.0,8.0,'reject_duplicate',evidence_ids[1],'imagehash-v1'),
        )
        must_fail(con,
            "INSERT INTO duplicate_candidates(asset_a,asset_b,method,raw_score,threshold,decision,evidence_id,tool_version) VALUES(?,?,?,?,?,?,?,?)",
            ('CHR-00002','CHR-00001','phash',1.0,8.0,'reject_duplicate',evidence_ids[1],'imagehash-v1'))
        must_fail(con, "UPDATE duplicate_candidates SET decision='not_duplicate' WHERE asset_a='CHR-00001'")
        must_fail(con, "DELETE FROM asset_signatures WHERE asset_id='CHR-00001'")
        must_fail(con, "UPDATE duplicate_thresholds SET threshold=99 WHERE method='phash'")

        con.execute(
            "INSERT INTO similarity_exceptions(asset_a,asset_b,method,reason,approved_by,evidence_id) VALUES(?,?,?,?,?,?)",
            ('CHR-00001','CHR-00002','pose','same action sequence continuity','test-suite',evidence_ids[0]),
        )
        must_fail(con, "UPDATE similarity_exceptions SET reason='changed' WHERE asset_a='CHR-00001'")

        methods = con.execute('SELECT count(*) FROM duplicate_thresholds').fetchone()[0]
        assert methods >= 8, methods
        sigs = con.execute('SELECT count(*) FROM asset_signatures').fetchone()[0]
        assert sigs == 3, sigs
        con.rollback()

    print('duplicate integrity regression passed')


if __name__ == '__main__':
    main()
