from __future__ import annotations

import app_v4 as v4

ADDITIONAL_PRESETS = {
    "typewriter",
    "word-pop",
    "letter-build",
    "counter",
    "draw-path",
    "cursor-demo",
    "tap-demo",
    "scroll-demo",
    "music-reactive",
}

v4.SUPPORTED_PRESETS.update(ADDITIONAL_PRESETS)
_original_motion_filter = v4._motion_filter


def _extended_motion_filter(
    preset: str,
    width: int,
    height: int,
    fps: int,
    frames: int,
    duration: float,
) -> str:
    mapped = {
        "typewriter": "reveal",
        "word-pop": "spring",
        "letter-build": "reveal",
        "counter": "pulse",
        "draw-path": "mask-wipe",
        "cursor-demo": "camera-pan",
        "tap-demo": "pulse",
        "scroll-demo": "slide",
        "music-reactive": "pulse",
    }.get(preset, preset)
    return _original_motion_filter(mapped, width, height, fps, frames, duration)


v4._motion_filter = _extended_motion_filter

app = v4.app
RenderRequest = v4.RenderRequest
create_render_job = v4.create_render_job
job_row = v4.job_row
