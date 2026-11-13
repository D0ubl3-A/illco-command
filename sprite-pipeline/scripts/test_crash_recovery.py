#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import shutil
import sqlite3
import tempfile
from pathlib import Path

from crash_recovery import atomic_register_file, recover_claimed_operation
from idempotency import OperationIdentity, claim_operation, complete_operation

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DB = ROOT / 'state' / 'pipeline.sqlite3'
THEME_ID = 'original-claymation-celebrity-brawl-parody-v1'


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    assert SOURCE_DB.exists() and SOURCE_DB.stat().st_size > 0
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        db = td_path / 'pipeline.sqlite3'
        shutil.copy2(SOURCE_DB, db)
        con = sqlite3.connect(db)
        con.execute('PRAGMA foreign_keys=ON')
        con.execute(
            "INSERT INTO runs(id,theme_id,started_at,code_version,schema_version,continuity_pointer,score) VALUES(?,?,?,?,?,?,?)",
            ('crash-run', THEME_ID, '2026-08-19T00:00:00Z', 'test', 10, 'CHR-00001', 0),
        )
        con.commit()

        identity = OperationIdentity(
            theme_id=THEME_ID,
            theme_version=1,
            run_id='crash-run',
            surgeon_id=1,
            asset_id='CHR-00001',
            prompt_version='p1',
            provider='fixture',
            model_version='fixture-v1',
            attempt=1,
        )

        # Boundary 1: uncommitted DB writes disappear after simulated process loss.
        con.execute('BEGIN IMMEDIATE')
        con.execute(
            "INSERT INTO retries(asset_id,attempt,failure_class,detail,created_at) VALUES(?,?,?,?,?)",
            ('CHR-00001', 99, 'crash-fixture', 'must rollback', '2026-08-19T00:00:00Z'),
        )
        con.rollback()
        assert con.execute("SELECT COUNT(*) FROM retries WHERE attempt=99").fetchone()[0] == 0

        # Boundary 2: operation claim is durable and deterministic across replay.
        key, created = claim_operation(con, identity)
        assert created is True
        same_key, created_again = claim_operation(con, identity)
        assert same_key == key and created_again is False
        assert con.execute('SELECT COUNT(*) FROM operation_results WHERE operation_key=?', (key,)).fetchone()[0] == 1

        # Boundary 3: crash after temp write but before atomic rename.
        temp_path = td_path / 'artifact.png.tmp'
        final_path = td_path / 'artifact.png'
        temp_path.write_bytes(b'partial-but-nonempty-fixture')
        result = recover_claimed_operation(con, key, final_path=final_path, temp_path=temp_path)
        assert result.action == 'removed-orphan-temp'
        assert not temp_path.exists() and not final_path.exists()
        assert con.execute('SELECT state FROM operation_results WHERE operation_key=?', (key,)).fetchone()[0] == 'claimed'

        # Retry the same logical operation: no duplicate operation row, one final artifact.
        retry_temp = td_path / 'artifact.retry.tmp'
        payload = b'canonical-render-fixture-v1'
        retry_temp.write_bytes(payload)
        file_sha, file_size = atomic_register_file(retry_temp, final_path)
        assert file_size == len(payload) and file_sha == digest(payload)
        assert final_path.exists() and not retry_temp.exists()

        # Boundary 4: crash after atomic rename but before DB completion.
        result = recover_claimed_operation(con, key, final_path=final_path)
        assert result.action == 'completed-from-final'
        assert result.result_sha256 == file_sha
        row = con.execute(
            'SELECT state,result_ref,result_sha256 FROM operation_results WHERE operation_key=?',
            (key,),
        ).fetchone()
        assert row == ('completed', str(final_path), file_sha)

        # Boundary 5: replay after completion is read-only and stable.
        result2 = recover_claimed_operation(con, key, final_path=final_path)
        assert result2.action == 'already-completed'
        complete_operation(
            con,
            key,
            result_kind='artifact',
            result_ref=str(final_path),
            result_sha256=file_sha,
        )
        assert con.execute('SELECT COUNT(*) FROM operation_results WHERE operation_key=?', (key,)).fetchone()[0] == 1
        assert len(list(td_path.glob('artifact.png'))) == 1

        # Conflicting completion must fail closed.
        try:
            complete_operation(
                con,
                key,
                result_kind='artifact',
                result_ref=str(final_path),
                result_sha256='0' * 64,
            )
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError('conflicting replay was accepted')

        con.close()
    print('crash recovery replay/rollback/rename reconciliation passed')


if __name__ == '__main__':
    main()
