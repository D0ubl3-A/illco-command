#!/usr/bin/env python3
import base64
import json
import tempfile
from pathlib import Path

from render_provider import (
    CHARACTER_CHROMA_CONTRACT,
    FX_ALPHA_CONTRACT,
    MODEL,
    atomic_write_png,
    build_payload,
    png_dimensions,
    render_bytes,
)

PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89"
)


class Response:
    def __init__(self, payload):
        self.payload = payload
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def read(self):
        return self.payload


def opener_ok(request, timeout=0):
    body = json.loads(request.data)
    assert body["model"] == MODEL
    payload = json.dumps({"data": [{"b64_json": base64.b64encode(PNG_1X1).decode()}]}).encode()
    return Response(payload)


def opener_bad(request, timeout=0):
    return Response(json.dumps({"data": [{}]}).encode())


def must_fail(fn, text):
    try:
        fn()
    except Exception as exc:
        assert text in str(exc), (text, str(exc))
    else:
        raise AssertionError(f"expected failure containing {text!r}")


def main():
    character = build_payload("original clay fighter", "character")
    fx = build_payload("impact burst", "fx")
    assert character["background"] == "opaque"
    assert fx["background"] == "transparent"
    assert character["output_format"] == fx["output_format"] == "png"
    assert character["model"] == fx["model"] == MODEL
    assert character["prompt"].startswith("original clay fighter")
    assert "#00FF00" in character["prompt"]
    assert "No gradient" in character["prompt"]
    assert CHARACTER_CHROMA_CONTRACT.strip() in character["prompt"]
    assert fx["prompt"].startswith("impact burst")
    assert "fully transparent background" in fx["prompt"]
    assert FX_ALPHA_CONTRACT.strip() in fx["prompt"]

    must_fail(lambda: render_bytes("x", "character", "", opener=opener_ok), "OPENAI_API_KEY")
    must_fail(lambda: render_bytes("x", "character", "test", opener=opener_bad), "b64_json")

    image = render_bytes("x", "character", "test", opener=opener_ok)
    assert png_dimensions(image) == (1, 1)

    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "asset.png"
        result = atomic_write_png(out, image)
        assert out.exists()
        assert result["byte_size"] == len(image)
        assert len(result["sha256"]) == 64
        assert result["width"] == result["height"] == 1
        assert not list(out.parent.glob("*.tmp"))

    print("render provider contract passed")


if __name__ == "__main__":
    main()
