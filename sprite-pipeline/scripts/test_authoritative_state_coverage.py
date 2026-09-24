#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

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


def main() -> None:
    if DB.exists():
        DB.unlink()
    bootstrap()
    required = {
        'run_steps','asset_versions','prompts','character_bibles','fx_bibles',
        'sequence_bundles','frames','replacements','metrics','alerts'
    }
    with sqlite3.connect(DB) as con:
        tables = {r[0] for r in con.execute("select name from sqlite_master where type='table'")}
        missing = required - tables
        assert not missing, missing

        run_id = 'state-coverage-test'
        con.execute("insert into runs(id,theme_id,started_at,code_version,schema_version) values(?,?,?,?,?)",
                    (run_id, THEME_ID, now(), 'test', 15))
        bible_json = '{"role":"original fictional fighter","locked":true}'
        cb_hash = hashlib.sha256(bible_json.encode()).hexdigest()
        fx_json = '{"family":"impact puff","alpha":"straight"}'
        fx_hash = hashlib.sha256(fx_json.encode()).hexdigest()
        con.execute("insert into character_bibles(id,version,name,bible_json,originality_declaration,prohibited_likeness_notes,sha256,created_at) values(?,?,?,?,?,?,?,?)",
                    ('char-bible-001',1,'Original Fighter',bible_json,'original fictional design','no real-person likeness',cb_hash,now()))
        con.execute("insert into fx_bibles(id,version,name,bible_json,originality_declaration,sha256,created_at) values(?,?,?,?,?,?,?)",
                    ('fx-bible-001',1,'Impact Puff',fx_json,'original fictional effect',fx_hash,now()))
        ptxt = 'Render original clay fighter on pure green background.'
        phash = hashlib.sha256(ptxt.encode()).hexdigest()
        con.execute("insert into prompts(asset_id,prompt_version,bible_type,bible_id,bible_version,full_prompt,prompt_sha256,created_at) values(?,?,?,?,?,?,?,?)",
                    ('CHR-00001','p1','character','char-bible-001',1,ptxt,phash,now()))
        con.execute("insert into asset_versions(asset_id,version,created_at) values(?,?,?)", ('CHR-00001',1,now()))
        con.execute("insert into sequence_bundles(id,run_id,asset_id,sequence_type,frame_rate,duration,completeness,created_at) values(?,?,?,?,?,?,?,?)",
                    ('seq-001',run_id,'CHR-00001','idle',24.0,0.5,0.0,now()))
        con.execute("insert into frames(sequence_id,asset_id,frame_index,phase,created_at) values(?,?,?,?,?)",
                    ('seq-001','CHR-00001',0,'idle',now()))
        con.execute("insert into metrics(run_id,metric_name,metric_value,unit,observed_at) values(?,?,?,?,?)",
                    (run_id,'queue_depth',0,'assets',now()))
        con.execute("insert into alerts(run_id,severity,alert_type,message,created_at) values(?,?,?,?,?)",
                    (run_id,5,'continuity','test alert',now()))
        con.commit()

        expect_blocked(con, "update character_bibles set name='mutated' where id='char-bible-001' and version=1")
        expect_blocked(con, "delete from fx_bibles where id='fx-bible-001' and version=1")
        expect_blocked(con, "update prompts set full_prompt='mutated' where asset_id='CHR-00001' and prompt_version='p1'")
        expect_blocked(con, "delete from asset_versions where asset_id='CHR-00001' and version=1")
        expect_blocked(con, "update sequence_bundles set duration=9 where id='seq-001'")
        expect_blocked(con, "delete from frames where sequence_id='seq-001' and frame_index=0")

        assert con.execute("select count(*) from character_bibles").fetchone()[0] == 1
        assert con.execute("select count(*) from fx_bibles").fetchone()[0] == 1
        assert con.execute("select count(*) from prompts").fetchone()[0] == 1
        assert con.execute("select count(*) from sequence_bundles").fetchone()[0] == 1
        assert con.execute("select count(*) from frames").fetchone()[0] == 1
        assert con.execute("select count(*) from metrics").fetchone()[0] == 1
        assert con.execute("select count(*) from alerts").fetchone()[0] == 1

    print('authoritative state coverage and immutability passed')


if __name__ == '__main__':
    main()
