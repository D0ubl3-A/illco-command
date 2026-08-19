#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from bootstrap_state import ROOT, THEME_ID
from manifest_test_fixture import add_queue_manifest


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def setup_db(path: Path) -> None:
    schema = (ROOT / 'state' / 'schema.sql').read_text(encoding='utf-8')
    migrations = sorted((ROOT / 'state').glob('[0-9][0-9][0-9]_*.sql'))
    with sqlite3.connect(path) as con:
        con.executescript(schema)
        for migration in migrations:
            con.executescript(migration.read_text(encoding='utf-8'))
        ts = now()
        con.execute("INSERT INTO themes(id,version,name,status,created_at) VALUES(?,?,?,?,?)", (THEME_ID,1,'Manifest Integrity Test','active',ts))
        con.execute("INSERT INTO runs(id,theme_id,started_at,code_version,schema_version,continuity_pointer,score) VALUES(?,?,?,?,?,?,0)", ('run-manifest-1',THEME_ID,ts,'test',14,'CHR-00001'))
        con.execute("INSERT INTO surgeon_lanes(surgeon_id,lane_start,lane_end,asset_type) VALUES(1,1,20,'character')")
        con.execute("INSERT INTO ownership(asset_id,surgeon_id,asset_type,ordinal) VALUES('CHR-00001',1,'character',1)")
        con.execute("INSERT INTO assets(asset_id,theme_id,category,name,status,updated_at) VALUES('CHR-00001',?,?,?,'planned',?)", (THEME_ID,'character','CHR-00001',ts))
        con.commit()


def expect_integrity_error(fn, contains: str | None = None) -> None:
    try:
        fn()
        raise AssertionError('mutation unexpectedly succeeded')
    except sqlite3.IntegrityError as exc:
        if contains is not None:
            assert contains in str(exc), str(exc)


def main() -> None:
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / 'manifest.sqlite3'
        setup_db(db)
        with sqlite3.connect(db) as con:
            con.execute('PRAGMA foreign_keys=ON')
            ts = now()
            evidence_id = con.execute(
                "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
                ('run-manifest-1','CHR-00001','transition-test','evidence/manifest/test.txt','1'*64,ts),
            ).lastrowid
            con.execute(
                "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
                ('manifest:no-row','CHR-00001','planned','queued',evidence_id,ts),
            )
            expect_integrity_error(
                lambda: con.execute("UPDATE assets SET status='queued',updated_at=? WHERE asset_id='CHR-00001'", (ts,)),
                'queued requires latest queued manifest',
            )
            assert con.execute("SELECT consumed FROM transition_intents WHERE operation_key='manifest:no-row'").fetchone()[0] == 0

            manifest_id = add_queue_manifest(con, 'CHR-00001', 'run-manifest-1', 'manifest:v1')
            assert manifest_id > 0
            row = con.execute("SELECT stage,surgeon_id,category,manifest_version FROM asset_manifest_versions WHERE id=?", (manifest_id,)).fetchone()
            assert row == ('queued',1,'character',1), row

            expect_integrity_error(
                lambda: con.execute("UPDATE asset_manifest_versions SET camera='changed' WHERE id=?", (manifest_id,)),
                'asset manifest versions are immutable',
            )
            expect_integrity_error(
                lambda: con.execute("DELETE FROM asset_manifest_versions WHERE id=?", (manifest_id,)),
                'asset manifest versions are immutable',
            )
            expect_integrity_error(
                lambda: con.execute(
                    "INSERT INTO asset_manifest_versions(asset_id,manifest_version,stage,theme_version,run_id,operation_key,surgeon_id,category,asset_name,bible_name,bible_version,action,facing,mirror_rule,camera,framing,expression,phase,variation,intended_use,tags_json,filename,relative_path,full_prompt,negatives,provider,model_version,parameters_json,width,height,format,background_mode,prompt_signature,continuity_pointer,created_at) SELECT asset_id,3,stage,theme_version,run_id,'manifest:skip',surgeon_id,category,asset_name,bible_name,bible_version,action,facing,mirror_rule,camera,framing,expression,phase,variation,intended_use,tags_json,filename,relative_path,full_prompt,negatives,provider,model_version,parameters_json,width,height,format,background_mode,prompt_signature,continuity_pointer,created_at FROM asset_manifest_versions WHERE id=?",
                    (manifest_id,),
                ),
                'manifest version must append exactly once',
            )

            con.execute("UPDATE assets SET status='queued',updated_at=? WHERE asset_id='CHR-00001'", (ts,))
            assert con.execute("SELECT status FROM assets WHERE asset_id='CHR-00001'").fetchone()[0] == 'queued'
            assert con.execute("SELECT consumed FROM transition_intents WHERE operation_key='manifest:no-row'").fetchone()[0] == 1

    print('append-only manifest versions and queue admission gate passed')


if __name__ == '__main__':
    main()
