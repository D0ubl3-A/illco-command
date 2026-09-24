#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "evidence/first-real-render"


def validate_character(path: Path) -> dict:
    with Image.open(path) as im:
        im.load()
        if im.format != "PNG":
            raise AssertionError("character is not PNG")
        if im.width <= 0 or im.height <= 0:
            raise AssertionError("character has invalid dimensions")
        rgb = im.convert("RGB")
        px = rgb.load()
        samples = [
            px[0, 0], px[im.width - 1, 0], px[0, im.height - 1], px[im.width - 1, im.height - 1],
            px[im.width // 2, 0], px[im.width // 2, im.height - 1], px[0, im.height // 2], px[im.width - 1, im.height // 2],
        ]
        good = sum(1 for r, g, b in samples if abs(r - 0) <= 8 and abs(g - 255) <= 8 and abs(b - 0) <= 8)
        chroma_score = good / len(samples)
        if chroma_score < 0.875:
            raise AssertionError(f"character chroma border purity too low: {chroma_score:.3f}")
        return {"format": im.format, "width": im.width, "height": im.height, "chroma_border_purity": chroma_score}


def validate_fx(path: Path) -> dict:
    with Image.open(path) as im:
        im.load()
        if im.format != "PNG":
            raise AssertionError("fx is not PNG")
        rgba = im.convert("RGBA")
        alpha = rgba.getchannel("A")
        extrema = alpha.getextrema()
        if extrema is None or extrema[1] == 0:
            raise AssertionError("fx alpha is empty")
        if extrema[0] == 255:
            raise AssertionError("fx has no transparency")
        bbox = alpha.getbbox()
        if bbox is None:
            raise AssertionError("fx alpha bounds are empty")
        return {"format": im.format, "width": im.width, "height": im.height, "alpha_min": extrema[0], "alpha_max": extrema[1], "alpha_bounds": bbox}


def main() -> None:
    manifest_path = EVIDENCE / "render-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["truth_state"] == "rendered_unvalidated"
    outcomes = []
    for entry in manifest["assets"]:
        path = ROOT / entry["path"]
        assert path.exists() and path.stat().st_size > 0
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        assert digest == entry["sha256"]
        if entry["asset_type"] == "character":
            checks = validate_character(path)
        else:
            checks = validate_fx(path)
        outcomes.append({"asset_id": entry["asset_id"], "passed": True, "checks": checks, "sha256": digest})
    result = {"validation_scope": "first-real-render-file-gates", "all_passed": all(x["passed"] for x in outcomes), "outcomes": outcomes}
    (EVIDENCE / "validation-results.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
