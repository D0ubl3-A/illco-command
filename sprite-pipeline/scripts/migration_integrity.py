#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ensure_ledger(con: sqlite3.Connection) -> None:
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS migration_history(
            filename TEXT PRIMARY KEY,
            sha256 TEXT NOT NULL CHECK(length(sha256)=64),
            applied_at TEXT NOT NULL
        )
        """
    )
    con.execute(
        """
        CREATE TRIGGER IF NOT EXISTS migration_history_no_update
        BEFORE UPDATE ON migration_history
        BEGIN
            SELECT RAISE(ABORT, 'migration history is immutable');
        END
        """
    )
    con.execute(
        """
        CREATE TRIGGER IF NOT EXISTS migration_history_no_delete
        BEFORE DELETE ON migration_history
        BEGIN
            SELECT RAISE(ABORT, 'migration history is immutable');
        END
        """
    )


def apply_migrations(con: sqlite3.Connection, state_dir: Path) -> int:
    ensure_ledger(con)
    migrations = sorted(state_dir.glob("[0-9][0-9][0-9]_*.sql"))
    seen_prefixes: dict[str, str] = {}

    for migration in migrations:
        prefix = migration.name.split("_", 1)[0]
        previous = seen_prefixes.get(prefix)
        if previous is not None:
            raise RuntimeError(
                f"duplicate migration version prefix {prefix}: {previous} and {migration.name}"
            )
        seen_prefixes[prefix] = migration.name

    for migration in migrations:
        digest = sha256_file(migration)
        row = con.execute(
            "SELECT sha256 FROM migration_history WHERE filename=?", (migration.name,)
        ).fetchone()
        if row is not None:
            if row[0] != digest:
                raise RuntimeError(
                    f"migration hash mismatch for {migration.name}: applied={row[0]} current={digest}"
                )
            continue

        con.executescript(migration.read_text(encoding="utf-8"))
        con.execute(
            "INSERT INTO migration_history(filename,sha256,applied_at) VALUES(?,?,?)",
            (migration.name, digest, datetime.now(timezone.utc).isoformat()),
        )

    return len(migrations)
