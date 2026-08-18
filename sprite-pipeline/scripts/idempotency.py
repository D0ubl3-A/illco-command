#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class OperationIdentity:
    theme_id: str
    theme_version: int
    run_id: str
    surgeon_id: int
    asset_id: str
    prompt_version: str
    provider: str
    model_version: str
    attempt: int

    def canonical_payload(self) -> str:
        parts = (
            self.theme_id,
            str(self.theme_version),
            self.run_id,
            str(self.surgeon_id),
            self.asset_id,
            self.prompt_version,
            self.provider,
            self.model_version,
            str(self.attempt),
        )
        return "\x1f".join(parts)

    def operation_key(self) -> str:
        return hashlib.sha256(self.canonical_payload().encode("utf-8")).hexdigest()


def claim_operation(con: sqlite3.Connection, identity: OperationIdentity) -> tuple[str, bool]:
    """Atomically claim a logical operation.

    Returns (operation_key, created). A replay of the same canonical identity
    returns the existing key with created=False and creates no new row.
    """
    key = identity.operation_key()
    now = datetime.now(timezone.utc).isoformat()
    con.execute("BEGIN IMMEDIATE")
    try:
        cur = con.execute(
            """
            INSERT OR IGNORE INTO operation_results(
              operation_key, theme_id, theme_version, run_id, surgeon_id,
              asset_id, prompt_version, provider, model_version, attempt,
              state, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                key,
                identity.theme_id,
                identity.theme_version,
                identity.run_id,
                identity.surgeon_id,
                identity.asset_id,
                identity.prompt_version,
                identity.provider,
                identity.model_version,
                identity.attempt,
                "claimed",
                now,
            ),
        )
        row = con.execute(
            """
            SELECT operation_key FROM operation_results
            WHERE theme_id=? AND theme_version=? AND run_id=? AND surgeon_id=?
              AND asset_id=? AND prompt_version=? AND provider=?
              AND model_version=? AND attempt=?
            """,
            (
                identity.theme_id,
                identity.theme_version,
                identity.run_id,
                identity.surgeon_id,
                identity.asset_id,
                identity.prompt_version,
                identity.provider,
                identity.model_version,
                identity.attempt,
            ),
        ).fetchone()
        if row is None or row[0] != key:
            raise sqlite3.IntegrityError("canonical operation-key mismatch")
        con.commit()
        return key, cur.rowcount == 1
    except Exception:
        con.rollback()
        raise


def complete_operation(
    con: sqlite3.Connection,
    operation_key: str,
    *,
    result_kind: str,
    result_ref: str,
    result_sha256: str,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    con.execute("BEGIN IMMEDIATE")
    try:
        cur = con.execute(
            """
            UPDATE operation_results
            SET state='completed', result_kind=?, result_ref=?, result_sha256=?, completed_at=?
            WHERE operation_key=? AND state='claimed'
            """,
            (result_kind, result_ref, result_sha256, now, operation_key),
        )
        if cur.rowcount != 1:
            row = con.execute(
                "SELECT state,result_kind,result_ref,result_sha256 FROM operation_results WHERE operation_key=?",
                (operation_key,),
            ).fetchone()
            if row == ("completed", result_kind, result_ref, result_sha256):
                con.commit()
                return
            raise sqlite3.IntegrityError("operation cannot be completed with a conflicting result")
        con.commit()
    except Exception:
        con.rollback()
        raise
