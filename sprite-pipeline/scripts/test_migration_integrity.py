#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import tempfile
from pathlib import Path

from migration_integrity import apply_migrations


def main() -> None:
    with tempfile.TemporaryDirectory() as td:
        state = Path(td)
        (state / "001_alpha.sql").write_text("CREATE TABLE alpha(id INTEGER PRIMARY KEY);\n", encoding="utf-8")
        db = state / "test.sqlite3"
        with sqlite3.connect(db) as con:
            assert apply_migrations(con, state) == 1
            first = con.execute("SELECT filename,sha256 FROM migration_history").fetchall()
            assert len(first) == 1
            assert apply_migrations(con, state) == 1
            second = con.execute("SELECT filename,sha256 FROM migration_history").fetchall()
            assert second == first

        (state / "001_alpha.sql").write_text("CREATE TABLE alpha(id INTEGER PRIMARY KEY, changed TEXT);\n", encoding="utf-8")
        with sqlite3.connect(db) as con:
            try:
                apply_migrations(con, state)
            except RuntimeError as e:
                assert "hash mismatch" in str(e)
            else:
                raise AssertionError("edited applied migration was not rejected")

    with tempfile.TemporaryDirectory() as td:
        state = Path(td)
        (state / "001_a.sql").write_text("SELECT 1;\n", encoding="utf-8")
        (state / "001_b.sql").write_text("SELECT 2;\n", encoding="utf-8")
        with sqlite3.connect(state / "dup.sqlite3") as con:
            try:
                apply_migrations(con, state)
            except RuntimeError as e:
                assert "duplicate migration version prefix" in str(e)
            else:
                raise AssertionError("duplicate migration version prefix was not rejected")

    print("migration integrity tests passed")


if __name__ == "__main__":
    main()
