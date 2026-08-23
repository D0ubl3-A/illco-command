#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import sqlite3
import struct
from datetime import datetime, timezone
from pathlib import Path

from manifest_test_fixture import add_queue_manifest

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "state" / "pipeline.sqlite3"
THEME_ID = "original-claymation-celebrity-brawl-parody-v1"
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def expect_blocked(con: sqlite3.Connection, sql: str, params: tuple, message: str) -> None:
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError as exc:
        assert message in str(exc), str(exc)
        return
    raise AssertionError(f"mutation unexpectedly succeeded: {sql}")


def add_evidence(con: sqlite3.Connection, run_id: str, aid: str, kind: str, path: Path) -> int:
    now = datetime.now(timezone.utc).isoformat()
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    rel = path.relative_to(ROOT).as_posix()
    con.execute(
        "INSERT INTO evidence(run_id,asset_id,kind,relative_path,sha256,created_at) VALUES(?,?,?,?,?,?)",
        (run_id, aid, kind, rel, digest, now),
    )
    return con.execute("SELECT last_insert_rowid()").fetchone()[0]


def transition(con: sqlite3.Connection, aid: str, from_status: str, to_status: str, evidence_id: int, suffix: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    op = f"ci-render:{aid}:{from_status}:{to_status}:{suffix}"
    con.execute(
        "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
        (op, aid, from_status, to_status, evidence_id, now),
    )
    con.execute("UPDATE assets SET status=?, updated_at=? WHERE asset_id=?", (to_status, now, aid))


def png_dimensions(data: bytes) -> tuple[int, int]:
    assert data.startswith(b"\x89PNG\r\n\x1a\n"), "PNG signature missing"
    assert data[12:16] == b"IHDR", "PNG IHDR missing"
    return struct.unpack(">II", data[16:24])


def main() -> None:
    evidence_dir = ROOT / "evidence" / "test-runtime"
    asset_dir = ROOT / "assets" / "characters" / "test-runtime"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    asset_dir.mkdir(parents=True, exist_ok=True)

    generic_file = evidence_dir / "render-transition-generic.txt"
    generic_file.write_text("generic transition evidence; not a rendered asset\n", encoding="utf-8")
    render_file = asset_dir / "CHR-00002.png"
    render_file.write_bytes(PNG_1X1)

    with sqlite3.connect(DB) as con:
        con.execute("PRAGMA foreign_keys = ON")
        aid = "CHR-00002"
        assert con.execute("SELECT status FROM assets WHERE asset_id=?", (aid,)).fetchone()[0] == "planned"
        now = datetime.now(timezone.utc).isoformat()
        run_id = "ci-render-truth-run"
        con.execute(
            "INSERT OR IGNORE INTO runs(id,theme_id,started_at,code_version,schema_version,continuity_pointer,score) VALUES(?,?,?,?,?,?,?)",
            (run_id, THEME_ID, now, "ci", 14, aid, 0),
        )
        generic_evidence = add_evidence(con, run_id, aid, "transition-test", generic_file)
        add_queue_manifest(con, aid, run_id, "ci-render:manifest:CHR-00002:v1")
        transition(con, aid, "planned", "queued", generic_evidence, "1")
        transition(con, aid, "queued", "rendering", generic_evidence, "2")

        # A generic evidence row must never be enough to claim a render exists.
        expect_blocked(
            con,
            "INSERT INTO transition_intents(operation_key,asset_id,from_status,to_status,evidence_id,created_at) VALUES(?,?,?,?,?,?)",
            ("ci-render-fake", aid, "rendering", "rendered_unvalidated", generic_evidence, now),
            "rendered_unvalidated requires registered real file evidence",
        )

        # Register a file only after it physically exists, opens as PNG, has non-zero bytes, dimensions, and a computed hash.
        raw = render_file.read_bytes()
        width, height = png_dimensions(raw)
        assert len(raw) > 0 and width > 0 and height > 0
        render_evidence = add_evidence(con, run_id, aid, "render-file", render_file)
        digest = hashlib.sha256(raw).hexdigest()
        rel = render_file.relative_to(ROOT).as_posix()
        con.execute(
            "INSERT INTO file_registrations(asset_id,evidence_id,relative_path,sha256,byte_size,mime,extension,width,height,color_mode,open_ok,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (aid, render_evidence, rel, digest, len(raw), "image/png", ".png", width, height, "RGBA", 1, now),
        )

        transition(con, aid, "rendering", "rendered_unvalidated", render_evidence, "3")
        assert con.execute("SELECT status FROM assets WHERE asset_id=?", (aid,)).fetchone()[0] == "rendered_unvalidated"
        assert con.execute("SELECT count(*) FROM file_registrations WHERE asset_id=?", (aid,)).fetchone()[0] == 1

        # Registered file evidence is immutable and append-only.
        reg_id = con.execute("SELECT id FROM file_registrations WHERE asset_id=?", (aid,)).fetchone()[0]
        expect_blocked(con, "UPDATE file_registrations SET byte_size=1 WHERE id=?", (reg_id,), "file registrations are immutable")
        expect_blocked(con, "DELETE FROM file_registrations WHERE id=?", (reg_id,), "file registrations are append-only")
        con.rollback()

    print("manifest-gated render truthfulness gate passed")


if __name__ == "__main__":
    main()
