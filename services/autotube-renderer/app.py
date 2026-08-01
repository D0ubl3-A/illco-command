from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import shutil
import sqlite3
import subprocess
import textwrap
import threading
import time
import urllib.parse
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.responses import FileResponse
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pydantic import BaseModel, ConfigDict, Field, field_validator

APP_VERSION = "5.0.0"
DATA_DIR = Path(os.getenv("AUTOTUBE_DATA_DIR", "/data")).resolve()
JOBS_DIR = DATA_DIR / "jobs"
ARTIFACTS_DIR = DATA_DIR / "artifacts"
DATABASE_PATH = DATA_DIR / "autotube-renderer.sqlite3"
SERVICE_TOKEN = os.getenv("AUTOTUBE_RENDER_SERVICE_TOKEN", "").strip()
MAX_NARRATION_BYTES = 12 * 1024 * 1024
MAX_IMAGE_BYTES = 18 * 1024 * 1024
JOB_RETENTION_SECONDS = max(86_400, int(os.getenv("AUTOTUBE_JOB_RETENTION_SECONDS", "604800")))
WORKERS = max(1, min(4, int(os.getenv("AUTOTUBE_RENDER_WORKERS", "1"))))
FONT_BOLD = Path(os.getenv("AUTOTUBE_FONT_BOLD", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
FONT_REGULAR = Path(os.getenv("AUTOTUBE_FONT_REGULAR", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
JOB_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{6,160}$")
HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")

for directory in (DATA_DIR, JOBS_DIR, ARTIFACTS_DIR):
    directory.mkdir(parents=True, exist_ok=True)

executor = ThreadPoolExecutor(max_workers=WORKERS, thread_name_prefix="autotube-render")
database_lock = threading.Lock()


class NarrationPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    script: str = Field(min_length=1, max_length=6000)
    source: str = Field(default="elevenlabs", max_length=40)
    mimeType: str = Field(default="audio/mpeg", max_length=120)
    base64: str = Field(min_length=4)


class VideoPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=180)
    aspectRatio: str = Field(pattern="^(landscape|vertical|square)$")
    width: int = Field(ge=360, le=2160)
    height: int = Field(ge=360, le=2160)
    fps: int = Field(default=30, ge=24, le=60)
    durationSeconds: float = Field(ge=6, le=120)
    container: str = Field(default="mp4", pattern="^mp4$")
    videoCodec: str = Field(default="h264", pattern="^h264$")
    audioCodec: str = Field(default="aac", pattern="^aac$")
    audioSampleRate: int = Field(default=48000, ge=44100, le=48000)
    fastStart: bool = True
    brandColors: list[str] = Field(min_length=2, max_length=2)

    @field_validator("brandColors")
    @classmethod
    def validate_colors(cls, values: list[str]) -> list[str]:
        if not all(HEX_COLOR.match(value) for value in values):
            raise ValueError("brandColors must contain two six-digit hex colors")
        return values


class ScenePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=140)
    onScreenText: str = Field(min_length=1, max_length=260)
    narration: str = Field(default="", max_length=900)
    imageUrl: str = Field(default="", max_length=2048)


class DeliveryPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    mode: str = "durable-artifact"
    requireRangeRequests: bool = True
    minimumRetentionSeconds: int = Field(default=604800, ge=86400, le=31536000)


class RenderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schemaVersion: int = Field(default=1, ge=1, le=1)
    source: str = Field(default="illco-command-autotube-v5", max_length=120)
    prospect: str = Field(min_length=1, max_length=140)
    offer: str = Field(min_length=1, max_length=500)
    painPoint: str = Field(min_length=1, max_length=500)
    callToAction: str = Field(min_length=1, max_length=220)
    video: VideoPayload
    narration: NarrationPayload
    scenes: list[ScenePayload] = Field(min_length=1, max_length=12)
    delivery: DeliveryPayload = Field(default_factory=DeliveryPayload)


@contextmanager
def database() -> Any:
    connection = sqlite3.connect(DATABASE_PATH, timeout=30, isolation_level=None)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA busy_timeout=30000")
        yield connection
    finally:
        connection.close()


def setup_database() -> None:
    with database_lock, database() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                idempotency_key TEXT UNIQUE,
                status TEXT NOT NULL,
                stage TEXT NOT NULL,
                progress REAL NOT NULL DEFAULT 0,
                request_json TEXT NOT NULL,
                output_json TEXT,
                artifact_path TEXT,
                error TEXT,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
            """
        )
        connection.execute("CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs(created_at)")
        connection.execute(
            "UPDATE jobs SET status='failed', stage='recovery', error='Renderer restarted before the job completed', updated_at=? WHERE status IN ('queued','processing','rendering')",
            (time.time(),),
        )


def require_token(authorization: str | None = Header(default=None)) -> None:
    if not SERVICE_TOKEN:
        raise HTTPException(status_code=503, detail="AUTOTUBE_RENDER_SERVICE_TOKEN is not configured")
    expected = f"Bearer {SERVICE_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def run_command(command: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=900,
    )
    if result.returncode != 0:
        tail = result.stderr[-4000:].replace(SERVICE_TOKEN, "[redacted]")
        raise RuntimeError(f"Command failed ({command[0]}): {tail}")
    return result


def ensure_runtime() -> None:
    for binary in ("ffmpeg", "ffprobe"):
        if not shutil.which(binary):
            raise RuntimeError(f"{binary} is required")


def job_row(job_id: str) -> sqlite3.Row:
    if not JOB_ID_PATTERN.match(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID")
    with database() as connection:
        row = connection.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Render job not found")
    return row


def update_job(job_id: str, **changes: Any) -> None:
    allowed = {"status", "stage", "progress", "output_json", "artifact_path", "error"}
    fields = {key: value for key, value in changes.items() if key in allowed}
    fields["updated_at"] = time.time()
    assignments = ", ".join(f"{key}=?" for key in fields)
    with database_lock, database() as connection:
        connection.execute(
            f"UPDATE jobs SET {assignments} WHERE id=?",
            (*fields.values(), job_id),
        )


def cleanup_expired_jobs() -> None:
    cutoff = time.time() - JOB_RETENTION_SECONDS
    with database_lock, database() as connection:
        rows = connection.execute(
            "SELECT id, artifact_path FROM jobs WHERE created_at < ?",
            (cutoff,),
        ).fetchall()
        connection.execute("DELETE FROM jobs WHERE created_at < ?", (cutoff,))
    for row in rows:
        if row["artifact_path"]:
            Path(row["artifact_path"]).unlink(missing_ok=True)
        shutil.rmtree(JOBS_DIR / row["id"], ignore_errors=True)


def rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))  # type: ignore[return-value]


def font(path: Path, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError:
        return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, value: str, selected_font: ImageFont.ImageFont, maximum_width: int) -> str:
    words = value.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        trial = " ".join([*current, word])
        width = draw.textbbox((0, 0), trial, font=selected_font)[2]
        if current and width > maximum_width:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return "\n".join(lines[:6])


def allowed_image_url(url: str) -> bool:
    if not url:
        return False
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    host = parsed.hostname.lower()
    configured = [
        entry.strip().lower()
        for entry in os.getenv("AUTOTUBE_IMAGE_HOSTS", "illcoai.tech,images.unsplash.com,*.oaiusercontent.com").split(",")
        if entry.strip()
    ]
    for allowed in configured:
        if allowed.startswith("*.") and host.endswith(allowed[1:]):
            return True
        if host == allowed:
            return True
    return False


def download_image(url: str) -> Image.Image | None:
    if not allowed_image_url(url):
        return None
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "iLLCoAI-AutoTube-Renderer/5.0", "Accept": "image/*"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            declared = int(response.headers.get("content-length") or 0)
            if declared > MAX_IMAGE_BYTES:
                return None
            payload = response.read(MAX_IMAGE_BYTES + 1)
        if len(payload) > MAX_IMAGE_BYTES:
            return None
        image = Image.open(io.BytesIO(payload))
        image.load()
        return image.convert("RGB")
    except Exception:
        return None


def gradient_background(width: int, height: int, primary: str, secondary: str) -> Image.Image:
    start = rgb(primary)
    end = rgb(secondary)
    image = Image.new("RGB", (width, height), start)
    pixels = image.load()
    diagonal = max(1, width + height - 2)
    for y in range(height):
        for x in range(width):
            mix = min(1.0, max(0.0, (x + y) / diagonal))
            pixels[x, y] = tuple(int(start[channel] * (1 - mix) + end[channel] * mix) for channel in range(3))
    return image


def scene_image(scene: ScenePayload, request: RenderRequest, index: int, output: Path) -> None:
    width = request.video.width
    height = request.video.height
    source = download_image(scene.imageUrl)
    if source is not None:
        canvas = ImageOps.fit(source, (width, height), method=Image.Resampling.LANCZOS)
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle((0, 0, width, height), fill=(0, 12, 10, 70))
        overlay_draw.rectangle((0, int(height * 0.48), width, height), fill=(0, 8, 7, 190))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
    else:
        canvas = gradient_background(
            width,
            height,
            request.video.brandColors[index % 2],
            request.video.brandColors[(index + 1) % 2],
        )

    draw = ImageDraw.Draw(canvas)
    margin = max(48, int(width * 0.06))
    title_font = font(FONT_BOLD, max(30, int(width * 0.035)))
    body_font = font(FONT_BOLD, max(38, int(width * 0.055)))
    caption_font = font(FONT_REGULAR, max(24, int(width * 0.022)))
    label_font = font(FONT_BOLD, max(18, int(width * 0.015)))

    draw.rounded_rectangle(
        (margin, margin, margin + int(width * 0.24), margin + int(height * 0.07)),
        radius=18,
        fill=(5, 24, 20, 220),
        outline=(112, 245, 206),
        width=2,
    )
    draw.text(
        (margin + 20, margin + int(height * 0.018)),
        "iLLCo AI · AUTOTUBE",
        fill=(126, 255, 217),
        font=label_font,
    )

    title = wrap_text(draw, scene.title, title_font, width - margin * 2)
    body = wrap_text(draw, scene.onScreenText, body_font, width - margin * 2)
    caption = wrap_text(draw, scene.narration, caption_font, width - margin * 2)
    title_y = int(height * 0.20)
    draw.multiline_text((margin, title_y), title, fill=(126, 255, 217), font=title_font, spacing=8)
    body_y = title_y + draw.multiline_textbbox((0, 0), title, font=title_font, spacing=8)[3] + int(height * 0.035)
    draw.multiline_text((margin, body_y), body, fill=(255, 255, 255), font=body_font, spacing=12, stroke_width=2, stroke_fill=(0, 20, 15))

    if caption:
        caption_box = draw.multiline_textbbox((0, 0), caption, font=caption_font, spacing=8)
        caption_height = caption_box[3] - caption_box[1]
        caption_y = height - margin - caption_height - 28
        draw.rounded_rectangle(
            (margin - 18, caption_y - 16, width - margin + 18, height - margin + 14),
            radius=18,
            fill=(0, 8, 7, 205),
        )
        draw.multiline_text(
            (margin, caption_y),
            caption,
            fill=(244, 255, 251),
            font=caption_font,
            spacing=8,
        )

    canvas.save(output, format="PNG", optimize=True)


def probe_duration(path: Path) -> float:
    result = run_command(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ]
    )
    try:
        return max(0.0, float(result.stdout.strip()))
    except ValueError:
        return 0.0


def probe_output(path: Path) -> dict[str, Any]:
    result = run_command(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            str(path),
        ]
    )
    payload = json.loads(result.stdout)
    video = next((item for item in payload.get("streams", []) if item.get("codec_type") == "video"), {})
    audio = next((item for item in payload.get("streams", []) if item.get("codec_type") == "audio"), {})
    return {
        "durationSeconds": round(float(payload.get("format", {}).get("duration", 0)), 3),
        "sizeBytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "videoCodec": video.get("codec_name"),
        "width": video.get("width"),
        "height": video.get("height"),
        "frameRate": video.get("avg_frame_rate"),
        "audioCodec": audio.get("codec_name"),
        "audioSampleRate": audio.get("sample_rate"),
        "audioChannels": audio.get("channels"),
    }


def render_job(job_id: str) -> None:
    work_dir = JOBS_DIR / job_id
    try:
        ensure_runtime()
        row = job_row(job_id)
        request = RenderRequest.model_validate_json(row["request_json"])
        work_dir.mkdir(parents=True, exist_ok=True)
        update_job(job_id, status="processing", stage="narration", progress=4)

        try:
            narration_bytes = base64.b64decode(request.narration.base64, validate=True)
        except Exception as error:
            raise RuntimeError("Narration payload is not valid base64") from error
        if not narration_bytes or len(narration_bytes) > MAX_NARRATION_BYTES:
            raise RuntimeError("Narration payload is empty or exceeds 12 MB")
        narration_path = work_dir / "narration.mp3"
        narration_path.write_bytes(narration_bytes)
        narration_duration = probe_duration(narration_path)
        total_duration = max(float(request.video.durationSeconds), narration_duration + 0.25)
        total_duration = min(180.0, total_duration)

        update_job(job_id, status="processing", stage="visuals", progress=12)
        scene_count = len(request.scenes)
        scene_duration = total_duration / scene_count
        segment_paths: list[Path] = []
        for index, scene in enumerate(request.scenes):
            image_path = work_dir / f"scene-{index:02d}.png"
            segment_path = work_dir / f"segment-{index:02d}.mp4"
            scene_image(scene, request, index, image_path)
            frames = max(1, round(scene_duration * request.video.fps))
            zoom_direction = "min(zoom+0.00055,1.075)" if index % 2 == 0 else "max(1.0,1.075-on*0.00055)"
            filter_value = (
                f"scale={request.video.width}:{request.video.height}:force_original_aspect_ratio=increase,"
                f"crop={request.video.width}:{request.video.height},"
                f"zoompan=z='{zoom_direction}':d={frames}:s={request.video.width}x{request.video.height}:fps={request.video.fps},"
                "format=yuv420p"
            )
            run_command(
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
                    f"{scene_duration:.4f}",
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
            update_job(
                job_id,
                status="rendering",
                stage=f"scene-{index + 1}-of-{scene_count}",
                progress=15 + ((index + 1) / scene_count) * 60,
            )

        concat_path = work_dir / "segments.txt"
        concat_path.write_text(
            "\n".join(f"file '{path.name}'" for path in segment_paths) + "\n",
            encoding="utf-8",
        )
        output_path = ARTIFACTS_DIR / f"{job_id}.mp4"
        update_job(job_id, status="rendering", stage="mux-and-faststart", progress=82)
        run_command(
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
                "comment=Generated by iLLCo AI AutoTube 5",
                str(output_path),
            ],
            cwd=work_dir,
        )
        update_job(job_id, status="rendering", stage="quality-control", progress=94)
        metadata = probe_output(output_path)
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
            "sceneCount": scene_count,
            "narrationSource": request.narration.source,
            "retentionSeconds": max(JOB_RETENTION_SECONDS, request.delivery.minimumRetentionSeconds),
        }
        update_job(
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
        message = str(error).replace(SERVICE_TOKEN, "[redacted]")[:4000]
        update_job(job_id, status="failed", stage="failed", error=message)


setup_database()
app = FastAPI(title="iLLCo AI AutoTube Renderer", version=APP_VERSION)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "illco-autotube-renderer",
        "version": APP_VERSION,
        "ffmpeg": bool(shutil.which("ffmpeg")),
        "ffprobe": bool(shutil.which("ffprobe")),
        "persistentDataDirectory": str(DATA_DIR),
        "workers": WORKERS,
    }


@app.get("/ready", dependencies=[Depends(require_token)])
def ready() -> dict[str, Any]:
    ensure_runtime()
    return {"ready": True, "storageWritable": os.access(DATA_DIR, os.W_OK)}


@app.post("/v1/render-jobs", status_code=202, dependencies=[Depends(require_token)])
def create_render_job(
    payload: RenderRequest,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> dict[str, Any]:
    cleanup_expired_jobs()
    key = (idempotency_key or "").strip()[:256] or None
    if key:
        with database() as connection:
            existing = connection.execute(
                "SELECT id, status, progress FROM jobs WHERE idempotency_key=?",
                (key,),
            ).fetchone()
        if existing is not None:
            return {
                "jobId": existing["id"],
                "status": existing["status"],
                "progress": existing["progress"],
                "idempotentReplay": True,
            }

    job_id = uuid.uuid4().hex
    now = time.time()
    with database_lock, database() as connection:
        connection.execute(
            "INSERT INTO jobs (id,idempotency_key,status,stage,progress,request_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (
                job_id,
                key,
                "queued",
                "queued",
                0,
                payload.model_dump_json(),
                now,
                now,
            ),
        )
    executor.submit(render_job, job_id)
    return {"jobId": job_id, "status": "queued", "progress": 0}


@app.get("/v1/render-jobs/{job_id}", dependencies=[Depends(require_token)])
def render_status(job_id: str) -> dict[str, Any]:
    row = job_row(job_id)
    output = json.loads(row["output_json"]) if row["output_json"] else {}
    return {
        "jobId": row["id"],
        "status": row["status"],
        "stage": row["stage"],
        "progress": row["progress"],
        "error": row["error"] or "",
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "output": output,
    }


@app.get("/v1/render-jobs/{job_id}/artifact", dependencies=[Depends(require_token)])
def render_artifact(job_id: str, request: Request) -> FileResponse:
    row = job_row(job_id)
    if row["status"] != "ready" or not row["artifact_path"]:
        raise HTTPException(status_code=409, detail="Rendered artifact is not ready")
    path = Path(row["artifact_path"]).resolve()
    if path.parent != ARTIFACTS_DIR or not path.is_file():
        raise HTTPException(status_code=410, detail="Rendered artifact is no longer available")
    return FileResponse(
        path,
        media_type="video/mp4",
        filename=f"autotube-{job_id}.mp4",
        headers={
            "Cache-Control": "private, max-age=3600",
            "Accept-Ranges": "bytes",
            "X-AutoTube-Job": job_id,
        },
    )
