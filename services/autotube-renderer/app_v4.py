from __future__ import annotations

import base64
import json
import math
import shutil
from pathlib import Path
from typing import Any

import app as legacy

APP_VERSION = "5.1.0-autotube4"
LEGACY_RENDER_JOB = legacy.render_job
legacy.APP_VERSION = APP_VERSION

SUPPORTED_PRESETS = {
    "none",
    "fade",
    "slide",
    "scale",
    "spring",
    "reveal",
    "mask-wipe",
    "parallax",
    "orbit",
    "float",
    "pulse",
    "glitch",
    "morph",
    "camera-pan",
    "camera-push",
    "camera-pull",
    "camera-orbit",
}


def _production_package(request: legacy.RenderRequest) -> dict[str, Any]:
    extra = getattr(request.delivery, "model_extra", None) or {}
    value = extra.get("autotubeV4")
    return value if isinstance(value, dict) else {}


def _scene_manifest(production: dict[str, Any]) -> list[dict[str, Any]]:
    value = production.get("rendererScenes")
    if not isinstance(value, list):
        return []
    return [entry for entry in value if isinstance(entry, dict)]


def _preset(scene: dict[str, Any]) -> str:
    animations = scene.get("animations")
    if not isinstance(animations, list):
        return "fade"
    for animation in animations:
        if not isinstance(animation, dict):
            continue
        candidate = str(animation.get("preset") or "").strip()
        if candidate in SUPPORTED_PRESETS:
            return candidate
        if candidate:
            raise RuntimeError(f"Unsupported AutoTube 4 animation preset: {candidate}")
    return "fade"


def _scene_durations(
    request: legacy.RenderRequest,
    manifests: list[dict[str, Any]],
    total_duration: float,
) -> list[float]:
    raw: list[float] = []
    for index in range(len(request.scenes)):
        manifest = manifests[index] if index < len(manifests) else {}
        try:
            duration = float(manifest.get("durationSeconds") or 0)
        except (TypeError, ValueError):
            duration = 0
        raw.append(max(0.0, duration))
    if not any(raw):
        return [total_duration / max(1, len(request.scenes))] * len(request.scenes)
    raw = [duration if duration > 0 else 1.5 for duration in raw]
    scale = total_duration / max(0.001, sum(raw))
    return [max(0.5, duration * scale) for duration in raw]


def _motion_filter(
    preset: str,
    width: int,
    height: int,
    fps: int,
    frames: int,
    duration: float,
) -> str:
    base = (
        f"scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height}"
    )
    center_x = "iw/2-(iw/zoom/2)"
    center_y = "ih/2-(ih/zoom/2)"
    gentle = (
        f"zoompan=z='min(zoom+0.00045,1.055)':x='{center_x}':y='{center_y}':"
        f"d={frames}:s={width}x{height}:fps={fps}"
    )
    fade_out_start = max(0.0, duration - min(0.45, duration / 4))

    if preset in {"none"}:
        motion = f"zoompan=z='1':d={frames}:s={width}x{height}:fps={fps}"
        tail = ""
    elif preset in {"slide", "camera-pan", "parallax"}:
        motion = (
            f"zoompan=z='1.08':x='(iw-iw/zoom)*on/{max(1, frames - 1)}':"
            f"y='{center_y}':d={frames}:s={width}x{height}:fps={fps}"
        )
        tail = ""
    elif preset in {"camera-pull"}:
        motion = (
            f"zoompan=z='max(1.0,1.10-on*0.10/{max(1, frames - 1)})':"
            f"x='{center_x}':y='{center_y}':d={frames}:s={width}x{height}:fps={fps}"
        )
        tail = ""
    elif preset in {"orbit", "camera-orbit", "float"}:
        motion = (
            f"zoompan=z='1.07':"
            f"x='(iw-iw/zoom)/2+sin(on/12)*(iw-iw/zoom)/5':"
            f"y='(ih-ih/zoom)/2+cos(on/15)*(ih-ih/zoom)/6':"
            f"d={frames}:s={width}x{height}:fps={fps}"
        )
        tail = ""
    elif preset == "pulse":
        motion = (
            f"zoompan=z='1.035+0.018*sin(on/5)':x='{center_x}':y='{center_y}':"
            f"d={frames}:s={width}x{height}:fps={fps}"
        )
        tail = "eq=contrast=1.04:saturation=1.08"
    elif preset == "glitch":
        motion = gentle
        tail = "noise=alls=7:allf=t+u,eq=contrast=1.10:saturation=1.18"
    elif preset in {"scale", "spring", "camera-push"}:
        motion = (
            f"zoompan=z='min(1.11,1.0+on*0.11/{max(1, frames - 1)})':"
            f"x='{center_x}':y='{center_y}':d={frames}:s={width}x{height}:fps={fps}"
        )
        tail = ""
    elif preset in {"reveal", "mask-wipe", "morph"}:
        motion = gentle
        tail = (
            f"fade=t=in:st=0:d={min(0.45, duration / 3):.3f},"
            f"fade=t=out:st={fade_out_start:.3f}:d={min(0.45, duration / 3):.3f}"
        )
    else:
        raise RuntimeError(f"Unsupported AutoTube 4 animation preset: {preset}")

    filters = [base, motion]
    if tail:
        filters.append(tail)
    filters.append("format=yuv420p")
    return ",".join(filters)


def render_job_v4(job_id: str) -> None:
    work_dir = legacy.JOBS_DIR / job_id
    try:
        legacy.ensure_runtime()
        row = legacy.job_row(job_id)
        request = legacy.RenderRequest.model_validate_json(row["request_json"])
        production = _production_package(request)
        if not production:
            LEGACY_RENDER_JOB(job_id)
            return

        quality = production.get("qualityReport")
        if not isinstance(quality, dict) or not quality.get("publishable"):
            raise RuntimeError("AutoTube 4 render was submitted without a publishable quality report")

        work_dir.mkdir(parents=True, exist_ok=True)
        legacy.update_job(job_id, status="processing", stage="autotube4-narration", progress=4)

        try:
            narration_bytes = base64.b64decode(request.narration.base64, validate=True)
        except Exception as error:
            raise RuntimeError("Narration payload is not valid base64") from error
        if not narration_bytes or len(narration_bytes) > legacy.MAX_NARRATION_BYTES:
            raise RuntimeError("Narration payload is empty or exceeds 12 MB")

        narration_path = work_dir / "narration.mp3"
        narration_path.write_bytes(narration_bytes)
        narration_duration = legacy.probe_duration(narration_path)
        total_duration = min(180.0, max(float(request.video.durationSeconds), narration_duration + 0.25))
        manifests = _scene_manifest(production)
        durations = _scene_durations(request, manifests, total_duration)
        executed: list[str] = []

        legacy.update_job(job_id, status="processing", stage="autotube4-animated-scenes", progress=12)
        segment_paths: list[Path] = []
        for index, scene in enumerate(request.scenes):
            manifest = manifests[index] if index < len(manifests) else {}
            preset = _preset(manifest)
            executed.append(preset)
            duration = durations[index]
            image_path = work_dir / f"scene-{index:02d}.png"
            segment_path = work_dir / f"segment-{index:02d}.mp4"
            legacy.scene_image(scene, request, index, image_path)
            frames = max(1, round(duration * request.video.fps))
            filter_value = _motion_filter(
                preset,
                request.video.width,
                request.video.height,
                request.video.fps,
                frames,
                duration,
            )
            legacy.run_command(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-loop",
                    "1",
                    "-i",
                    str(image_path),
                    "-t",
                    f"{duration:.4f}",
                    "-vf",
                    filter_value,
                    "-an",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "medium",
                    "-crf",
                    "19",
                    "-pix_fmt",
                    "yuv420p",
                    "-r",
                    str(request.video.fps),
                    str(segment_path),
                ],
                cwd=work_dir,
            )
            segment_paths.append(segment_path)
            legacy.update_job(
                job_id,
                status="rendering",
                stage=f"autotube4-scene-{index + 1}-of-{len(request.scenes)}-{preset}",
                progress=15 + ((index + 1) / len(request.scenes)) * 60,
            )

        concat_path = work_dir / "segments.txt"
        concat_path.write_text(
            "\n".join(f"file '{path.name}'" for path in segment_paths) + "\n",
            encoding="utf-8",
        )
        output_path = legacy.ARTIFACTS_DIR / f"{job_id}.mp4"
        legacy.update_job(job_id, status="rendering", stage="autotube4-mux-and-faststart", progress=82)
        legacy.run_command(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat_path),
                "-i",
                str(narration_path),
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-ar",
                str(request.video.audioSampleRate),
                "-ac",
                "2",
                "-t",
                f"{total_duration:.4f}",
                "-movflags",
                "+faststart",
                "-metadata",
                f"title={request.video.title}",
                "-metadata",
                f"comment=Generated by iLLCo AI AutoTube 4 style {production.get('styleId', 'unknown')}",
                str(output_path),
            ],
            cwd=work_dir,
        )

        legacy.update_job(job_id, status="rendering", stage="autotube4-quality-control", progress=94)
        metadata = legacy.probe_output(output_path)
        if metadata["videoCodec"] != "h264" or metadata["audioCodec"] != "aac":
            raise RuntimeError("Rendered artifact failed codec validation")
        if metadata["width"] != request.video.width or metadata["height"] != request.video.height:
            raise RuntimeError("Rendered artifact failed resolution validation")
        if metadata["sizeBytes"] < 100_000:
            raise RuntimeError("Rendered artifact is unexpectedly small")

        output = {
            **metadata,
            "title": request.video.title,
            "prospect": request.prospect,
            "sceneCount": len(request.scenes),
            "narrationSource": request.narration.source,
            "retentionSeconds": max(
                legacy.JOB_RETENTION_SECONDS,
                request.delivery.minimumRetentionSeconds,
            ),
            "autotubeStandardVersion": production.get("standardVersion", "4.0.0"),
            "styleId": production.get("styleId", "custom"),
            "intent": production.get("intent", "explainer"),
            "qualityScore": quality.get("score"),
            "qualityThreshold": quality.get("threshold"),
            "executedAnimationPresets": executed,
            "rendererVersion": APP_VERSION,
        }
        legacy.update_job(
            job_id,
            status="ready",
            stage="ready",
            progress=100,
            output_json=json.dumps(output, separators=(",", ":")),
            artifact_path=str(output_path),
            error=None,
        )
        shutil.rmtree(work_dir, ignore_errors=True)
    except Exception as error:
        message = str(error).replace(legacy.SERVICE_TOKEN, "[redacted]")[:4000]
        legacy.update_job(job_id, status="failed", stage="failed", error=message)


legacy.render_job = render_job_v4

app = legacy.app
RenderRequest = legacy.RenderRequest
create_render_job = legacy.create_render_job
job_row = legacy.job_row
