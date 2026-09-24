#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from bootstrap_state import ROOT, THEME_ID
from lock_manager import acquire, heartbeat, release, iso


def setup_db(path: Path) -> None:
    schema = (ROOT / 'state' / 'schema.sql').read_text(encoding='utf-8')
    migrations = sorted((ROOT / 'state').glob('[0-9][0-9][0-9]_*.sql'))
    now = iso(datetime.now(timezone.utc))
    with sqlite3.connect(path) as con:
        con.executescript(schema)
        for migration in migrations:
            con.executescript(migration.read_text(encoding='utf-8'))
        con.execute("INSERT INTO themes(id,version,name,status,created_at) VALUES(?,?,?,?,?)", (THEME_ID,1,'Lock Test','active',now))
        for rid in ('run-a','run-b'):
            con.execute("INSERT INTO runs(id,theme_id,started_at,code_version,schema_version,score) VALUES(?,?,?,?,?,0)", (rid,THEME_ID,now,'test',9))
        con.commit()


def main() -> None:
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / 'locks.sqlite3'
        setup_db(db)

        a = acquire('asset:CHR-00001', 'surgeon-0001', 'run-a', ttl_seconds=60, db=db)
        assert a.acquired and a.action == 'acquire'

        b = acquire('asset:CHR-00001', 'surgeon-0002', 'run-b', ttl_seconds=60, db=db)
        assert not b.acquired and b.action == 'contended'

        assert not heartbeat('asset:CHR-00001', 'surgeon-0002', 'run-b', db=db)
        assert heartbeat('asset:CHR-00001', 'surgeon-0001', 'run-a', ttl_seconds=60, db=db)

        with sqlite3.connect(db) as con:
            con.execute("PRAGMA foreign_keys=ON")
            try:
                con.execute("UPDATE locks SET owner='intruder' WHERE lock_key='asset:CHR-00001'")
                raise AssertionError('direct lock mutation unexpectedly succeeded')
            except sqlite3.IntegrityError:
                pass
            except sqlite3.OperationalError:
                pass
            expired = iso(datetime.now(timezone.utc) - timedelta(seconds=5))
            con.execute("INSERT INTO lock_intents(lock_key,action,owner,run_id,created_at) VALUES(?,?,?,?,?)", ('asset:CHR-00002','acquire','surgeon-0001','run-a',iso(datetime.now(timezone.utc))))
            con.execute("INSERT INTO locks(lock_key,owner,heartbeat_at,expires_at,run_id) VALUES(?,?,?,?,?)", ('asset:CHR-00002','surgeon-0001',expired,expired,'run-a'))
            con.commit()

        recovered = acquire('asset:CHR-00002', 'surgeon-0002', 'run-b', ttl_seconds=60, db=db)
        assert recovered.acquired and recovered.action == 'recover'
        assert not release('asset:CHR-00002', 'surgeon-0001', 'run-a', db=db)
        assert release('asset:CHR-00002', 'surgeon-0002', 'run-b', db=db)

        with sqlite3.connect(db) as con:
            actions = [r[0] for r in con.execute("SELECT action FROM lock_events ORDER BY id").fetchall()]
            assert actions == ['acquire','heartbeat','acquire','recover','release'], actions
            assert con.execute("SELECT COUNT(*) FROM locks").fetchone()[0] == 1
            assert con.execute("SELECT COUNT(*) FROM lock_intents WHERE consumed_at IS NULL").fetchone()[0] == 0
            event_id = con.execute("SELECT id FROM lock_events LIMIT 1").fetchone()[0]
            try:
                con.execute("DELETE FROM lock_events WHERE id=?", (event_id,))
                raise AssertionError('lock event deletion unexpectedly succeeded')
            except sqlite3.IntegrityError:
                pass
            except sqlite3.OperationalError:
                pass

    print('lock integrity, contention, heartbeat, owner release, and stale recovery passed')


if __name__ == '__main__':
    main()
