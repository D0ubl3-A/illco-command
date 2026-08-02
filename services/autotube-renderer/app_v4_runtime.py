from __future__ import annotations

import json
import subprocess
import threading
from pathlib import Path
from typing import Any

import app_v4 as v4
from playability import validate_playable_mp4

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

# app_v4 currently marks a job ready after codec and resolution checks. This
# wrapper holds that final state, creates a deliberately conservative delivery
# encode, fully decodes it, validates MP4 atom order, and only then publishes
# the ready state. The lock prevents concurrent jobs from replacing the shared
# update_job hook at the same time.
_RENDER_PLAYABILITY_LOCK = threading.RLock()
_original_render_job = v4.render_job_v4
_original_update_job = v4.legacy.update_job


def _run(command: list[str], *, timeout: int = 360) -> None:
    try:
        subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as error:
        raise RuntimeError("AutoTube universal delivery encode timed out") from error
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or str(error)).strip().replace("\n", " ")[:1500]
        raise RuntimeError(f"AutoTube universal delivery encode failed: {detail}") from error


def _universal_delivery_encode(
    source: Path,
    *,
    width: int,
    height: int,
    fps: int,
    audio_sample_rate: int,
) -> None:
    temporary = source.with_name(f"{source.stem}.universal.tmp.mp4")
    temporary.unlink(missing_ok=True)
    keyframe_interval = max(24, fps * 2)
    try:
        _run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(source),
                "-map",
                "0:v:0",
                "-map",
                "0:a:0",
                "-vf",
                f"scale={width}:{height}:flags=lanczos,setsar=1,fps={fps},format=yuv420p",
                "-c:v",
                "libx264",
                "-profile:v",
                "baseline",
                "-level:v",
                "4.0",
                "-preset",
                "medium",
                "-crf",
                "22",
                "-bf",
                "0",
                "-refs",
                "1",
                "-g",
                str(keyframe_interval),
                "-keyint_min",
                str(keyframe_interval),
                "-sc_threshold",
                "0",
                "-maxrate",
                "8M",
                "-bufsize",
                "16M",
                "-fps_mode",
                "cfr",
                "-c:a",
                "aac",
                "-profile:a",
                "aac_low",
                "-b:a",
                "160k",
                "-ar",
                str(audio_sample_rate),
                "-ac",
                "2",
                "-af",
                "aresample=async=1:first_pts=0",
                "-avoid_negative_ts",
                "make_zero",
                "-fflags",
                "+genpts",
                "-movflags",
                "+faststart",
                "-brand",
                "mp42",
                "-map_metadata",
                "-1",
                str(temporary),
            ],
            timeout=360,
        )
        temporary.replace(source)
    finally:
        temporary.unlink(missing_ok=True)


def _playability_gated_render_job(job_id: str) -> None:
    with _RENDER_PLAYABILITY_LOCK:
        captured_ready: dict[str, Any] | None = None

        def gated_update(job_id_input: str, *args: Any, **kwargs: Any) -> Any:
            nonlocal captured_ready
            if job_id_input == job_id and kwargs.get("status") == "ready":
                captured_ready = dict(kwargs)
                return None
            return _original_update_job(job_id_input, *args, **kwargs)

        v4.legacy.update_job = gated_update
        try:
            _original_render_job(job_id)
        finally:
            v4.legacy.update_job = _original_update_job

        if not captured_ready:
            # The original renderer already persisted a failed state.
            return

        try:
            row = v4.legacy.job_row(job_id)
            request = v4.legacy.RenderRequest.model_validate_json(row["request_json"])
            artifact_path = Path(str(captured_ready.get("artifact_path") or ""))
            if not artifact_path.is_file():
                raise RuntimeError("AutoTube ready state did not contain a real artifact")

            _original_update_job(
                job_id,
                status="rendering",
                stage="autotube4-universal-delivery-encode",
                progress=96,
            )
            _universal_delivery_encode(
                artifact_path,
                width=request.video.width,
                height=request.video.height,
                fps=request.video.fps,
                audio_sample_rate=request.video.audioSampleRate,
            )

            _original_update_job(
                job_id,
                status="rendering",
                stage="autotube4-complete-decode-validation",
                progress=98,
            )
            playability = validate_playable_mp4(
                artifact_path,
                expected_width=request.video.width,
                expected_height=request.video.height,
                expected_fps=request.video.fps,
            )

            output = json.loads(str(captured_ready.get("output_json") or "{}"))
            if not isinstance(output, dict):
                output = {}
            output["playability"] = playability
            output["deliveryEncoding"] = {
                "container": "mp4",
                "videoCodec": "h264",
                "videoProfile": "Constrained Baseline",
                "pixelFormat": "yuv420p",
                "bFrames": 0,
                "audioCodec": "aac",
                "audioProfile": "LC",
                "constantFrameRate": True,
                "fastStart": True,
                "completeDecodeRequired": True,
            }
            captured_ready["output_json"] = json.dumps(output, separators=(",", ":"))
            captured_ready["progress"] = 100
            captured_ready["stage"] = "ready"
            _original_update_job(job_id, **captured_ready)
        except Exception as error:
            message = str(error).replace(v4.legacy.SERVICE_TOKEN, "[redacted]")[:4000]
            _original_update_job(job_id, status="failed", stage="failed-playability", error=message)


v4.legacy.render_job = _playability_gated_render_job

app = v4.app
RenderRequest = v4.RenderRequest
create_render_job = v4.create_render_job
job_row = v4.job_row
