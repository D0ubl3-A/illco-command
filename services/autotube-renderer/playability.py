from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path
from typing import Any


class PlayabilityError(RuntimeError):
    """Raised when an AutoTube artifact is valid media but unsafe to deliver."""


def _run(command: list[str], *, timeout: int = 240) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError as error:
        raise PlayabilityError(f"Required media tool is unavailable: {command[0]}") from error
    except subprocess.TimeoutExpired as error:
        raise PlayabilityError(f"Media validation timed out after {timeout} seconds") from error
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or str(error)).strip().replace("\n", " ")[:1200]
        raise PlayabilityError(f"Media validation command failed: {detail}") from error


def _rate(value: str) -> float:
    numerator, separator, denominator = str(value or "0/1").partition("/")
    try:
        if not separator:
            return float(numerator)
        divisor = float(denominator)
        return float(numerator) / divisor if divisor else 0.0
    except (TypeError, ValueError, ZeroDivisionError):
        return 0.0


def _probe(path: Path) -> dict[str, Any]:
    result = _run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=format_name,duration,size,start_time,bit_rate,format_long_name:"
            "format_tags=major_brand,minor_version,compatible_brands:"
            "stream=index,codec_name,profile,codec_type,width,height,pix_fmt,level,"
            "r_frame_rate,avg_frame_rate,time_base,start_time,duration,bit_rate,"
            "sample_rate,channels,channel_layout,has_b_frames",
            "-of",
            "json",
            str(path),
        ],
        timeout=60,
    )
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise PlayabilityError("ffprobe returned invalid JSON") from error


def _faststart(path: Path) -> bool:
    # ISO BMFF atoms use a 4-byte size followed by a 4-byte type. Searching the
    # complete file is intentional: a file is progressive-playable only when the
    # moov atom exists before the first mdat atom.
    data = path.read_bytes()
    moov = data.find(b"moov")
    mdat = data.find(b"mdat")
    return moov >= 0 and mdat >= 0 and moov < mdat


def validate_playable_mp4(
    path_input: str | Path,
    *,
    expected_width: int,
    expected_height: int,
    expected_fps: int,
) -> dict[str, Any]:
    """Fully validate an MP4 before AutoTube exposes it as a ready artifact.

    This intentionally goes beyond a successful FFmpeg exit during rendering.
    The artifact must be conservative enough for common phone/browser decoders,
    progressive-download safe, constant-frame-rate, and fully decodable.
    """

    path = Path(path_input)
    if not path.is_file():
        raise PlayabilityError("Rendered MP4 does not exist")
    size = path.stat().st_size
    if size < 100_000:
        raise PlayabilityError("Rendered MP4 is unexpectedly small")

    probe = _probe(path)
    streams = probe.get("streams") if isinstance(probe.get("streams"), list) else []
    video_streams = [entry for entry in streams if entry.get("codec_type") == "video"]
    audio_streams = [entry for entry in streams if entry.get("codec_type") == "audio"]
    if len(video_streams) != 1:
        raise PlayabilityError("Rendered MP4 must contain exactly one video stream")
    if len(audio_streams) != 1:
        raise PlayabilityError("Rendered MP4 must contain exactly one audio stream")

    video = video_streams[0]
    audio = audio_streams[0]
    format_info = probe.get("format") if isinstance(probe.get("format"), dict) else {}
    failures: list[str] = []

    if "mp4" not in str(format_info.get("format_name") or ""):
        failures.append("container is not MP4")
    if video.get("codec_name") != "h264":
        failures.append("video codec is not H.264")
    if "baseline" not in str(video.get("profile") or "").lower():
        failures.append("H.264 profile is not Constrained Baseline")
    if video.get("pix_fmt") != "yuv420p":
        failures.append("pixel format is not yuv420p")
    if int(video.get("has_b_frames") or 0) != 0:
        failures.append("video contains B-frames")
    if int(video.get("width") or 0) != expected_width:
        failures.append("video width does not match the render contract")
    if int(video.get("height") or 0) != expected_height:
        failures.append("video height does not match the render contract")

    real_fps = _rate(str(video.get("r_frame_rate") or "0/1"))
    average_fps = _rate(str(video.get("avg_frame_rate") or "0/1"))
    if not math.isclose(real_fps, float(expected_fps), abs_tol=0.01):
        failures.append("declared frame rate is not the requested constant frame rate")
    if not math.isclose(average_fps, float(expected_fps), abs_tol=0.01):
        failures.append("average frame rate is not constant")

    if audio.get("codec_name") != "aac":
        failures.append("audio codec is not AAC")
    if str(audio.get("profile") or "").upper() not in {"LC", "AAC LC"}:
        failures.append("AAC profile is not Low Complexity")
    if int(audio.get("sample_rate") or 0) not in {44_100, 48_000}:
        failures.append("audio sample rate is not 44.1 or 48 kHz")
    if int(audio.get("channels") or 0) not in {1, 2}:
        failures.append("audio channel count is not mono or stereo")

    for entry, label in ((format_info, "container"), (video, "video"), (audio, "audio")):
        try:
            start_time = float(entry.get("start_time") or 0)
        except (TypeError, ValueError):
            failures.append(f"{label} start time is invalid")
            continue
        if abs(start_time) > 0.05:
            failures.append(f"{label} does not start near zero")

    try:
        duration = float(format_info.get("duration") or 0)
    except (TypeError, ValueError):
        duration = 0
    if duration <= 0:
        failures.append("duration is invalid")

    faststart = _faststart(path)
    if not faststart:
        failures.append("MP4 moov atom is not before media data")

    if failures:
        raise PlayabilityError("Rendered artifact failed playability validation: " + "; ".join(failures))

    # Decode every packet/frame. -xerror upgrades decoder warnings to failure.
    _run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-xerror",
            "-i",
            str(path),
            "-map",
            "0:v:0",
            "-map",
            "0:a:0",
            "-f",
            "null",
            "-",
        ],
        timeout=max(240, int(duration * 8)),
    )

    tags = format_info.get("tags") if isinstance(format_info.get("tags"), dict) else {}
    return {
        "validated": True,
        "completeDecode": True,
        "progressiveDownload": True,
        "container": "mp4",
        "majorBrand": tags.get("major_brand", ""),
        "compatibleBrands": tags.get("compatible_brands", ""),
        "videoCodec": "h264",
        "videoProfile": video.get("profile"),
        "pixelFormat": video.get("pix_fmt"),
        "hasBFrames": int(video.get("has_b_frames") or 0),
        "width": int(video.get("width") or 0),
        "height": int(video.get("height") or 0),
        "fps": real_fps,
        "audioCodec": "aac",
        "audioProfile": audio.get("profile"),
        "audioSampleRate": int(audio.get("sample_rate") or 0),
        "audioChannels": int(audio.get("channels") or 0),
        "durationSeconds": duration,
        "sizeBytes": size,
    }
