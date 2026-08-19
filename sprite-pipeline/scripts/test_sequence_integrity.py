#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from migration_integrity import apply_migrations

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "state" / "schema.sql"
THEME = "original-claymation-celebrity-brawl-parody-v1"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def expect_abort(con: sqlite3.Connection, sql: str, params: tuple) -> None:
    """Probe a failing statement without rolling back unrelated fixture state."""
    con.execute("SAVEPOINT expect_abort")
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        con.execute("ROLLBACK TO expect_abort")
        con.execute("RELEASE expect_abort")
        return
    else:
        con.execute("ROLLBACK TO expect_abort")
        con.execute("RELEASE expect_abort")
        raise AssertionError("expected SQLite integrity failure")


def main() -> None:
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / "sequence-test.sqlite3"
        with sqlite3.connect(db) as con:
            con.executescript(SCHEMA.read_text(encoding="utf-8"))
            apply_migrations(con, ROOT / "state")
            t = now()
            con.execute("INSERT INTO themes(id,version,name,status,created_at) VALUES(?,?,?,?,?)", (THEME,1,"test","active",t))
            con.execute("INSERT INTO runs(id,theme_id,started_at,code_version,schema_version) VALUES(?,?,?,?,?)", ("run-seq",THEME,t,"test",17))
            con.execute("INSERT INTO surgeon_lanes(surgeon_id,lane_start,lane_end,asset_type) VALUES(1,1,20,'character')")
            con.execute("INSERT INTO ownership(asset_id,surgeon_id,asset_type,ordinal) VALUES('CHR-00001',1,'character',1)")
            con.execute("INSERT INTO assets(asset_id,theme_id,category,name,status,updated_at) VALUES('CHR-00001',?,'character','test','planned',?)", (THEME,t))

            con.execute(
                "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
                ("run-seq","CHR-00001","sequence-validation","evidence/seq-good.json","a"*64,t),
            )
            seq_evidence = con.execute("SELECT id FROM evidence WHERE relative_path='evidence/seq-good.json'").fetchone()[0]
            con.execute(
                "INSERT INTO sequence_bundles(id,run_id,asset_id,sequence_type,camera,facing,frame_rate,duration,anticipation_frame,contact_frame,follow_through_frame,recovery_frame,completeness,synchronization_passed,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                ("SEQ-GOOD","run-seq","CHR-00001","punch","medium","right",24.0,4.0/24.0,0,1,2,3,1.0,1,t),
            )
            for i in range(4):
                sha = f"{i+1:064x}"
                path = f"evidence/frame-{i}.json"
                con.execute("INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)", ("run-seq","CHR-00001","frame",path,sha,t))
                eid = con.execute("SELECT id FROM evidence WHERE relative_path=?", (path,)).fetchone()[0]
                con.execute(
                    "INSERT INTO frames(sequence_id,asset_id,frame_index,relative_path,sha256,phase,evidence_id,created_at) VALUES(?,?,?,?,?,?,?,?)",
                    ("SEQ-GOOD","CHR-00001",i,f"assets/characters/seq-good-{i}.png",sha,("anticipation","contact","follow_through","recovery")[i],eid,t),
                )
            con.execute(
                "INSERT INTO sequence_validations(sequence_id,expected_frame_count,synchronization_passed,timing_error_seconds,evidence_id,tool_version,created_at) VALUES(?,?,?,?,?,?,?)",
                ("SEQ-GOOD",4,1,0.0,seq_evidence,"sequence-test/1",t),
            )
            assert con.execute("SELECT COUNT(*) FROM sequence_validations WHERE sequence_id='SEQ-GOOD'").fetchone()[0] == 1

            con.execute(
                "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
                ("run-seq","CHR-00001","sequence-validation","evidence/seq-bad.json","b"*64,t),
            )
            bad_evidence = con.execute("SELECT id FROM evidence WHERE relative_path='evidence/seq-bad.json'").fetchone()[0]
            con.execute(
                "INSERT INTO sequence_bundles(id,run_id,asset_id,sequence_type,frame_rate,duration,anticipation_frame,contact_frame,follow_through_frame,recovery_frame,completeness,synchronization_passed,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                ("SEQ-BAD","run-seq","CHR-00001","kick",24.0,4.0/24.0,0,2,1,3,1.0,1,t),
            )
            for i in (0,1,3,4):
                sha = f"{i+10:064x}"
                path = f"evidence/bad-frame-{i}.json"
                con.execute("INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)", ("run-seq","CHR-00001","frame",path,sha,t))
                eid = con.execute("SELECT id FROM evidence WHERE relative_path=?", (path,)).fetchone()[0]
                con.execute("INSERT INTO frames(sequence_id,asset_id,frame_index,relative_path,sha256,phase,evidence_id,created_at) VALUES(?,?,?,?,?,?,?,?)", ("SEQ-BAD","CHR-00001",i,f"assets/characters/seq-bad-{i}.png",sha,"phase",eid,t))

            expect_abort(
                con,
                "INSERT INTO sequence_validations(sequence_id,expected_frame_count,synchronization_passed,timing_error_seconds,evidence_id,tool_version,created_at) VALUES(?,?,?,?,?,?,?)",
                ("SEQ-BAD",4,1,0.0,bad_evidence,"sequence-test/1",t),
            )

            assert con.execute("SELECT COUNT(*) FROM sequence_validations WHERE sequence_id='SEQ-GOOD'").fetchone()[0] == 1
            expect_abort(
                con,
                "UPDATE sequence_validations SET timing_error_seconds=0.1 WHERE sequence_id='SEQ-GOOD'",
                (),
            )
            assert con.execute("SELECT timing_error_seconds FROM sequence_validations WHERE sequence_id='SEQ-GOOD'").fetchone()[0] == 0.0

        print("sequence integrity passed: contiguous frames, phase order, timing, evidence and immutability enforced")


if __name__ == "__main__":
    main()
