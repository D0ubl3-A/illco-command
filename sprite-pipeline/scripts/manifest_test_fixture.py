from __future__ import annotations

import sqlite3
from datetime import datetime, timezone


def add_queue_manifest(con: sqlite3.Connection, aid: str, run_id: str, operation_key: str) -> int:
    row = con.execute(
        "SELECT o.surgeon_id,a.category,a.name,t.version FROM ownership o JOIN assets a ON a.asset_id=o.asset_id JOIN themes t ON t.id=a.theme_id WHERE a.asset_id=?",
        (aid,),
    ).fetchone()
    if row is None:
        raise AssertionError(f"missing asset ownership for {aid}")
    surgeon_id, category, asset_name, theme_version = row
    version = con.execute(
        "SELECT COALESCE(MAX(manifest_version),0)+1 FROM asset_manifest_versions WHERE asset_id=?",
        (aid,),
    ).fetchone()[0]
    now = datetime.now(timezone.utc).isoformat()
    values = {
        "asset_id": aid,
        "manifest_version": version,
        "stage": "queued",
        "theme_version": theme_version,
        "run_id": run_id,
        "operation_key": operation_key,
        "surgeon_id": surgeon_id,
        "category": category,
        "subcategory": "ci-fixture",
        "asset_name": asset_name,
        "bible_name": f"{asset_name}-bible",
        "bible_version": 1,
        "action": "idle",
        "facing": "right",
        "mirror_rule": "no-mirror-unless-explicit",
        "camera": "orthographic-neutral",
        "framing": "full-body",
        "expression": "neutral",
        "phase": "idle-hold",
        "variation": "ci",
        "intended_use": "release-gate-fixture",
        "tags_json": "[\"ci\",\"manifest\"]",
        "filename": f"{aid}.png",
        "relative_path": f"assets/{category}/{aid}.png",
        "full_prompt": f"Original clay character production fixture for {aid}",
        "negatives": "real-person likeness,text,logo,watermark,cast shadow",
        "provider": "ci-fixture",
        "model_version": "fixture-v1",
        "parameters_json": "{\"seed\":1}",
        "width": 1024,
        "height": 1024,
        "format": "png",
        "background_mode": "chroma-00ff00" if category == "character" else "transparent",
        "prompt_signature": f"prompt:{aid}:fixture-v1",
        "continuity_pointer": aid,
        "created_at": now,
    }
    columns = list(values)
    sql = f"INSERT INTO asset_manifest_versions({','.join(columns)}) VALUES({','.join('?' for _ in columns)})"
    cur = con.execute(sql, tuple(values[c] for c in columns))
    return int(cur.lastrowid)
