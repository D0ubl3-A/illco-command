#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from render_provider import MODEL, atomic_write_png, render_bytes

ROOT = Path(__file__).resolve().parents[1]
CHARACTER = ROOT / "assets/characters/CHR-00001.png"
FX = ROOT / "assets/fx/FX-00001.png"
EVIDENCE = ROOT / "evidence/first-real-render"

CHARACTER_PROMPT = """Original fictional stop-motion claymation arena fighter, not based on any real person: Brick Morrow, broad-shouldered middle-aged publicity-obsessed action-star parody archetype, square clay jaw, asymmetrical eyebrow, short sculpted dark clay hair, red-and-black sleeveless robe over boxing shorts, black boots and hand wraps, right-handed orthodox stance, full body, front three-quarter camera, readable silhouette, visible handmade clay fingerprints and tool marks, neutral ready pose, no celebrity likeness, no brands."""
FX_PROMPT = """Original fictional claymation impact FX sprite: compact starburst punch-impact made from layered hand-molded clay shards and dust puffs, warm yellow-orange-white center, six irregular radial lobes, clear center pivot, no text, no logos, no characters, isolated effect suitable for a fighting-game contact frame."""


def record(path: Path, asset_id: str, asset_type: str, prompt: str) -> dict:
    data = path.read_bytes()
    return {
        "asset_id": asset_id,
        "asset_type": asset_type,
        "status": "rendered_unvalidated",
        "path": str(path.relative_to(ROOT)).replace('\\', '/'),
        "sha256": hashlib.sha256(data).hexdigest(),
        "byte_size": len(data),
        "provider": "openai",
        "model": MODEL,
        "prompt": prompt,
    }


def main() -> None:
    key = os.environ.get("OPENAI_API_KEY", "")
    if not key:
        raise SystemExit("OPENAI_API_KEY missing; no assets rendered")
    EVIDENCE.mkdir(parents=True, exist_ok=True)

    c_bytes = render_bytes(CHARACTER_PROMPT, "character", key)
    atomic_write_png(CHARACTER, c_bytes)
    f_bytes = render_bytes(FX_PROMPT, "fx", key)
    atomic_write_png(FX, f_bytes)

    manifest = {
        "truth_state": "rendered_unvalidated",
        "assets": [
            record(CHARACTER, "CHR-00001", "character", CHARACTER_PROMPT),
            record(FX, "FX-00001", "fx", FX_PROMPT),
        ],
    }
    (EVIDENCE / "render-manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(manifest, sort_keys=True))


if __name__ == "__main__":
    main()
