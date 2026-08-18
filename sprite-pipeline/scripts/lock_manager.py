#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "state" / "pipeline.sqlite3"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@dataclass(frozen=True)
class LockResult:
    acquired: bool
    action: str
    lock_key: str
    owner: str
    run_id: str


def _intent(con: sqlite3.Connection, lock_key: str, action: str, owner: str, run_id: str, expected_owner: str | None = None) -> None:
    con.execute(
        "INSERT INTO lock_intents(lock_key,action,owner,run_id,expected_owner,created_at) VALUES(?,?,?,?,?,?)",
        (lock_key, action, owner, run_id, expected_owner, iso(utcnow())),
    )


def acquire(lock_key: str, owner: str, run_id: str, ttl_seconds: int = 120, db: Path = DB) -> LockResult:
    now = utcnow()
    expiry = now + timedelta(seconds=ttl_seconds)
    with sqlite3.connect(db, timeout=30) as con:
        con.execute("PRAGMA foreign_keys=ON")
        con.execute("BEGIN IMMEDIATE")
        row = con.execute("SELECT owner,run_id,heartbeat_at,expires_at FROM locks WHERE lock_key=?", (lock_key,)).fetchone()
        if row is None:
            _intent(con, lock_key, "acquire", owner, run_id)
            con.execute("INSERT INTO locks(lock_key,owner,heartbeat_at,expires_at,run_id) VALUES(?,?,?,?,?)", (lock_key, owner, iso(now), iso(expiry), run_id))
            con.commit()
            return LockResult(True, "acquire", lock_key, owner, run_id)
        current_owner, current_run, _heartbeat, expires_at = row
        if current_owner == owner and current_run == run_id:
            _intent(con, lock_key, "heartbeat", owner, run_id)
            con.execute("UPDATE locks SET heartbeat_at=?, expires_at=? WHERE lock_key=?", (iso(now), iso(expiry), lock_key))
            con.commit()
            return LockResult(True, "heartbeat", lock_key, owner, run_id)
        if parse_iso(expires_at) <= now:
            _intent(con, lock_key, "recover", owner, run_id, current_owner)
            con.execute("UPDATE locks SET owner=?,run_id=?,heartbeat_at=?,expires_at=? WHERE lock_key=?", (owner, run_id, iso(now), iso(expiry), lock_key))
            con.commit()
            return LockResult(True, "recover", lock_key, owner, run_id)
        con.rollback()
        return LockResult(False, "contended", lock_key, owner, run_id)


def heartbeat(lock_key: str, owner: str, run_id: str, ttl_seconds: int = 120, db: Path = DB) -> bool:
    now = utcnow()
    with sqlite3.connect(db, timeout=30) as con:
        con.execute("PRAGMA foreign_keys=ON")
        con.execute("BEGIN IMMEDIATE")
        row = con.execute("SELECT owner,run_id FROM locks WHERE lock_key=?", (lock_key,)).fetchone()
        if row != (owner, run_id):
            con.rollback()
            return False
        _intent(con, lock_key, "heartbeat", owner, run_id)
        con.execute("UPDATE locks SET heartbeat_at=?,expires_at=? WHERE lock_key=?", (iso(now), iso(now + timedelta(seconds=ttl_seconds)), lock_key))
        con.commit()
        return True


def release(lock_key: str, owner: str, run_id: str, db: Path = DB) -> bool:
    with sqlite3.connect(db, timeout=30) as con:
        con.execute("PRAGMA foreign_keys=ON")
        con.execute("BEGIN IMMEDIATE")
        row = con.execute("SELECT owner,run_id FROM locks WHERE lock_key=?", (lock_key,)).fetchone()
        if row != (owner, run_id):
            con.rollback()
            return False
        _intent(con, lock_key, "release", owner, run_id)
        con.execute("DELETE FROM locks WHERE lock_key=?", (lock_key,))
        con.commit()
        return True
