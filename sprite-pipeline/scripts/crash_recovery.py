#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from idempotency import complete_operation


@dataclass(frozen=True)
class RecoveryResult:
    operation_key: str
    action: str
    result_ref: str | None = None
    result_sha256: str | None = None


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def atomic_register_file(temp_path: Path, final_path: Path) -> tuple[str, int]:
    """Atomically publish a completed temporary artifact into its final path."""
    if not temp_path.exists() or not temp_path.is_file():
        raise FileNotFoundError(temp_path)
    if temp_path.stat().st_size <= 0:
        raise ValueError('temporary artifact is empty')
    final_path.parent.mkdir(parents=True, exist_ok=True)
    if final_path.exists():
        raise FileExistsError(final_path)
    os.replace(temp_path, final_path)
    return sha256_file(final_path), final_path.stat().st_size


def recover_claimed_operation(
    con: sqlite3.Connection,
    operation_key: str,
    *,
    final_path: Path,
    temp_path: Path | None = None,
    result_kind: str = 'artifact',
) -> RecoveryResult:
    """Reconcile a claimed operation after a crash without duplicating output.

    Recovery is intentionally fail-closed:
    - an already-completed operation is returned unchanged;
    - a claimed operation with a final artifact is completed using its current hash;
    - an orphan temporary file is removed, leaving the operation claimed for retry;
    - no file/evidence state is invented when no durable artifact exists.
    """
    row = con.execute(
        'SELECT state,result_kind,result_ref,result_sha256 FROM operation_results WHERE operation_key=?',
        (operation_key,),
    ).fetchone()
    if row is None:
        raise KeyError(operation_key)

    state, stored_kind, stored_ref, stored_sha = row
    if state == 'completed':
        return RecoveryResult(operation_key, 'already-completed', stored_ref, stored_sha)
    if state != 'claimed':
        return RecoveryResult(operation_key, f'no-recovery:{state}')

    if final_path.exists():
        if not final_path.is_file() or final_path.stat().st_size <= 0:
            raise ValueError('final artifact is invalid')
        digest = sha256_file(final_path)
        complete_operation(
            con,
            operation_key,
            result_kind=result_kind,
            result_ref=str(final_path),
            result_sha256=digest,
        )
        return RecoveryResult(operation_key, 'completed-from-final', str(final_path), digest)

    if temp_path is not None and temp_path.exists():
        if temp_path.is_file():
            temp_path.unlink()
        else:
            raise ValueError('temporary path is not a file')
        return RecoveryResult(operation_key, 'removed-orphan-temp')

    return RecoveryResult(operation_key, 'retry-required')
