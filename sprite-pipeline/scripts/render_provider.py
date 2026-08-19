#!/usr/bin/env python3
"""Fail-closed image renderer for the sprite pipeline.

This module does not advance database state by itself. It produces a PNG only when a
real OpenAI Images API response contains decodable image bytes. Callers must still
register evidence/file hashes and perform the transactional status transition.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import struct
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "https://api.openai.com/v1/images/generations"
MODEL = "gpt-image-2-2026-04-21"
CHARACTER_CHROMA_CONTRACT = (
    " Render the complete full-body subject against a perfectly uniform pure #00FF00 "
    "chroma-green background only. No gradient, vignette, floor, horizon, cast shadow, "
    "reflected green lighting, text, logo, watermark, or show branding. Keep all wardrobe "
    "and props free of green that could conflict with keying."
)
FX_ALPHA_CONTRACT = (
    " Render only the effect on a fully transparent background with clean alpha edges; "
    "no opaque box, backdrop, floor, text, logo, watermark, or show branding."
)


def png_dimensions(data: bytes) -> tuple[int, int]:
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError("provider output is not a valid PNG header")
    width, height = struct.unpack(">II", data[16:24])
    if width <= 0 or height <= 0:
        raise ValueError("PNG dimensions must be positive")
    return width, height


def build_payload(prompt: str, asset_type: str) -> dict:
    if asset_type not in {"character", "fx"}:
        raise ValueError("asset_type must be character or fx")
    if not prompt.strip():
        raise ValueError("prompt must be nonempty")
    if asset_type == "character":
        background = "opaque"
        contracted_prompt = prompt.strip() + CHARACTER_CHROMA_CONTRACT
    else:
        background = "transparent"
        contracted_prompt = prompt.strip() + FX_ALPHA_CONTRACT
    return {
        "model": MODEL,
        "prompt": contracted_prompt,
        "size": "1024x1536" if asset_type == "character" else "1024x1024",
        "quality": "high",
        "background": background,
        "output_format": "png",
        "n": 1,
    }


def render_bytes(prompt: str, asset_type: str, api_key: str, opener=urllib.request.urlopen) -> bytes:
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required; refusing mock/placeholder render")
    payload = json.dumps(build_payload(prompt, asset_type)).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with opener(req, timeout=180) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:2000]
        raise RuntimeError(f"image provider HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"image provider network failure: {exc}") from exc

    try:
        obj = json.loads(raw)
        b64 = obj["data"][0]["b64_json"]
        image = base64.b64decode(b64, validate=True)
    except Exception as exc:
        raise RuntimeError("provider response did not contain valid data[0].b64_json") from exc
    png_dimensions(image)
    return image


def atomic_write_png(output: Path, image: bytes) -> dict:
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{output.name}.", suffix=".tmp", dir=output.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(image)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, output)
    except Exception:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass
        raise
    width, height = png_dimensions(image)
    return {
        "path": str(output),
        "sha256": hashlib.sha256(image).hexdigest(),
        "byte_size": len(image),
        "width": width,
        "height": height,
        "mime": "image/png",
        "extension": ".png",
        "model": MODEL,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-type", required=True, choices=["character", "fx"])
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    image = render_bytes(args.prompt, args.asset_type, os.environ.get("OPENAI_API_KEY", ""))
    result = atomic_write_png(args.output, image)
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
