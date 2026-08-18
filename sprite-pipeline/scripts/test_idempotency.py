#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "state" / "pipeline.sqlite3"
sys.path.insert(0, str(ROOT / "scripts"))

from idempotency import OperationIdentity, claim_operation, complete_operation  # noqa: E402

THEME = "original-claymation-celebrity-brawl-parody-v1"
RUN = "idempotency-test-run"


def main() -> None:
    with sqlite3.connect(DB, isolation_level=None) as con:
        con.execute("PRAGMA foreign_keys = ON")
        con.execute(
            """
            INSERT OR IGNORE INTO runs(
              id,theme_id,started_at,code_version,schema_version,continuity_pointer,score
            ) VALUES(?,?,?,?,?,?,?)
            """,
            (RUN, THEME, "2026-08-19T00:00:00Z", "test", 8, "CHR-00001", 0),
        )

        identity = OperationIdentity(
            theme_id=THEME,
            theme_version=1,
            run_id=RUN,
            surgeon_id=1,
            asset_id="CHR-00001",
            prompt_version="p1",
            provider="test-provider",
            model_version="test-model-v1",
            attempt=1,
        )

        keys = []
        created_flags = []
        for _ in range(100):
            key, created = claim_operation(con, identity)
            keys.append(key)
            created_flags.append(created)

        assert len(set(keys)) == 1
        assert created_flags.count(True) == 1
        assert created_flags.count(False) == 99
        assert con.execute(
            "SELECT COUNT(*) FROM operation_results WHERE asset_id='CHR-00001' AND attempt=1"
        ).fetchone()[0] == 1

        key = keys[0]
        complete_operation(
            con,
            key,
            result_kind="render",
            result_ref="content/aa/bb.png",
            result_sha256="a" * 64,
        )
        # Exact replay is a read-equivalent no-op.
        complete_operation(
            con,
            key,
            result_kind="render",
            result_ref="content/aa/bb.png",
            result_sha256="a" * 64,
        )

        try:
            complete_operation(
                con,
                key,
                result_kind="render",
                result_ref="content/changed.png",
                result_sha256="b" * 64,
            )
            raise AssertionError("conflicting replay unexpectedly succeeded")
        except sqlite3.IntegrityError:
            pass

        try:
            con.execute(
                "UPDATE operation_results SET asset_id='CHR-00002' WHERE operation_key=?",
                (key,),
            )
            raise AssertionError("identity mutation unexpectedly succeeded")
        except sqlite3.IntegrityError:
            pass

        try:
            con.execute("DELETE FROM operation_results WHERE operation_key=?", (key,))
            raise AssertionError("ledger deletion unexpectedly succeeded")
        except sqlite3.IntegrityError:
            pass

        identity2 = OperationIdentity(**{**identity.__dict__, "attempt": 2})
        key2, created2 = claim_operation(con, identity2)
        assert created2 and key2 != key
        assert con.execute(
            "SELECT COUNT(*) FROM operation_results WHERE asset_id='CHR-00001'"
        ).fetchone()[0] == 2

    print("idempotency replay invariants passed")


if __name__ == "__main__":
    main()
