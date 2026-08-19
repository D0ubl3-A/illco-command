#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from manifest_test_fixture import add_queue_manifest

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "state" / "pipeline.sqlite3"
THEME_ID = "original-claymation-celebrity-brawl-parody-v1"


def expect_blocked(con: sqlite3.Connection, sql: str, params: tuple = (), message: str | None = None) -> None:
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError as exc:
        if message is not None:
            assert message in str(exc), str(exc)
        return
    raise AssertionError(f"mutation unexpectedly succeeded: {sql}")


def prepare_evidence(con: sqlite3.Connection, aid: str) -> int:
    now = datetime.now(timezone.utc).isoformat()
    run_id = "ci-state-machine-run"
    con.execute(
        "INSERT OR IGNORE INTO runs(id,theme_id,started_at,code_version,schema_version,continuity_pointer,score) VALUES(?,?,?,?,?,?,?)",
        (run_id, THEME_ID, now, "ci", 14, aid, 0),
    )
    evidence_dir = ROOT / "evidence" / "test-runtime"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    evidence_file = evidence_dir / "status-machine.txt"
    evidence_file.write_text("CI transition evidence fixture\n", encoding="utf-8")
    digest = hashlib.sha256(evidence_file.read_bytes()).hexdigest()
    rel = evidence_file.relative_to(ROOT).as_posix()
    con.execute(
        "INSERT OR IGNORE INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
        (run_id, aid, "transition-test", rel, digest, now),
    )
    return con.execute("SELECT id FROM evidence WHERE relative_path=?", (rel,)).fetchone()[0]


def transition(con: sqlite3.Connection, aid: str, from_status: str, to_status: str, evidence_id: int, suffix: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    operation_key = f"ci:{aid}:{from_status}:{to_status}:{suffix}"
    con.execute(
        "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
        (operation_key, aid, from_status, to_status, evidence_id, now),
    )
    con.execute("UPDATE assets SET status=?, updated_at=? WHERE asset_id=?", (to_status, now, aid))
    event = con.execute(
        "SELECT from_status,to_status,evidence_id FROM status_events WHERE operation_key=? AND asset_id=?",
        (operation_key, aid),
    ).fetchone()
    assert event == (from_status, to_status, evidence_id), event
    assert con.execute("SELECT consumed FROM transition_intents WHERE operation_key=?", (operation_key,)).fetchone()[0] == 1


def main() -> None:
    with sqlite3.connect(DB) as con:
        con.execute("PRAGMA foreign_keys = ON")
        aid = "CHR-00001"
        original = con.execute("SELECT status FROM assets WHERE asset_id=?", (aid,)).fetchone()[0]
        assert original == "planned", original
        evidence_id = prepare_evidence(con, aid)

        # Even a legal edge must fail when callers try to bypass the evidence-backed intent.
        expect_blocked(
            con,
            "UPDATE assets SET status='queued' WHERE asset_id=?",
            (aid,),
        )

        # Queue admission also requires an immutable versioned manifest bound to the correct owner.
        add_queue_manifest(con, aid, "ci-state-machine-run", "ci:manifest:CHR-00001:v1")

        # Evidence-backed legal transition must atomically update state, append an event, and consume the intent.
        transition(con, aid, "planned", "queued", evidence_id, "1")
        assert con.execute("SELECT status FROM assets WHERE asset_id=?", (aid,)).fetchone()[0] == "queued"

        # Illegal transition must fail closed even without an intent.
        expect_blocked(
            con,
            "UPDATE assets SET status='published' WHERE asset_id=?",
            (aid,),
            "illegal asset status transition",
        )

        # Status-event history is immutable/append-only.
        event_id = con.execute("SELECT id FROM status_events WHERE asset_id=? ORDER BY id DESC LIMIT 1", (aid,)).fetchone()[0]
        expect_blocked(con, "UPDATE status_events SET to_status='published' WHERE id=?", (event_id,), "status events are immutable")
        expect_blocked(con, "DELETE FROM status_events WHERE id=?", (event_id,), "status events are append-only")

        # Continue through allowed exception paths using new evidence-backed intents.
        transition(con, aid, "queued", "blocked", evidence_id, "2")
        transition(con, aid, "blocked", "queued", evidence_id, "3")
        con.rollback()

    print("atomic evidence-backed state-machine and manifest queue guard passed")


if __name__ == "__main__":
    main()
