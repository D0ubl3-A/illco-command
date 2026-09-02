from __future__ import annotations

import json
import os
import shutil
import threading
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

OPENMONTAGE_ROOT = Path(os.environ.get("OPENMONTAGE_ROOT", "/opt/OpenMontage"))
DATA_ROOT = Path(os.environ.get("OPENMONTAGE_DATA_DIR", "/data/openmontage"))
TOKEN = os.environ.get("OPENMONTAGE_WORKER_TOKEN", "").strip()

ALLOWED_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "instagram.com",
    "www.instagram.com",
    "tiktok.com",
    "www.tiktok.com",
    "vimeo.com",
    "www.vimeo.com",
    "x.com",
    "www.x.com",
    "twitter.com",
    "www.twitter.com",
}

DATA_ROOT.mkdir(parents=True, exist_ok=True)


class ReferenceJobRequest(BaseModel):
    url: str
    max_resolution: str = Field(default="720p", pattern="^(360p|480p|720p|1080p)$")
    max_duration_seconds: int = Field(default=7200, ge=30, le=21600)
    download_subtitles: bool = True
    reference_video_date: str | None = None
    target_topic: str | None = None
    creative_goal: str | None = None


app = FastAPI(title="iLLCo OpenMontage Worker", version="1.0.0")


def require_auth(authorization: str | None) -> None:
    if not TOKEN:
        raise HTTPException(status_code=503, detail="OPENMONTAGE_WORKER_TOKEN is not configured")
    if authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def safe_url(value: str) -> str:
    try:
        parsed = urlparse(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid URL") from exc
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only HTTP(S) URLs are supported")
    host = (parsed.hostname or "").lower()
    if host not in ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail=f"Unsupported reference-video host: {host}")
    return value


def job_dir(job_id: str) -> Path:
    if not job_id or any(ch not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for ch in job_id):
        raise HTTPException(status_code=400, detail="Invalid job id")
    return DATA_ROOT / job_id


def state_path(job_id: str) -> Path:
    return job_dir(job_id) / "job.json"


def write_state(job_id: str, **changes: Any) -> dict[str, Any]:
    directory = job_dir(job_id)
    directory.mkdir(parents=True, exist_ok=True)
    path = state_path(job_id)
    current: dict[str, Any] = {}
    if path.exists():
        try:
            current = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            current = {}
    current.update(changes)
    current["job_id"] = job_id
    current["updated_at"] = int(time.time())
    path.write_text(json.dumps(current, indent=2), encoding="utf-8")
    return current


def read_state(job_id: str) -> dict[str, Any]:
    path = state_path(job_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Corrupt job state") from exc


def artifact_name(path_value: str | None) -> str | None:
    if not path_value:
        return None
    return Path(path_value).name


def run_reference_job(job_id: str, request: ReferenceJobRequest) -> None:
    try:
        write_state(job_id, status="running", stage="openmontage-download", progress=10)
        if not OPENMONTAGE_ROOT.is_dir():
            raise RuntimeError(f"OpenMontage root is missing: {OPENMONTAGE_ROOT}")

        import sys
        root = str(OPENMONTAGE_ROOT)
        if root not in sys.path:
            sys.path.insert(0, root)
        from tools.analysis.video_downloader import VideoDownloader

        output_dir = job_dir(job_id) / "media"
        output_dir.mkdir(parents=True, exist_ok=True)
        downloader = VideoDownloader()
        result = downloader.execute({
            "url": request.url,
            "output_dir": str(output_dir),
            "format": "video",
            "max_resolution": request.max_resolution,
            "max_duration_seconds": request.max_duration_seconds,
        })
        if not result.success:
            raise RuntimeError(result.error or "OpenMontage video downloader failed")

        data = result.data or {}
        write_state(job_id, status="running", stage="openmontage-subtitles", progress=70)

        subtitle_path = None
        if request.download_subtitles:
            subtitle_result = downloader.execute({
                "url": request.url,
                "output_dir": str(output_dir),
                "format": "subtitles_only",
                "max_resolution": request.max_resolution,
                "max_duration_seconds": request.max_duration_seconds,
            })
            if subtitle_result.success:
                subtitle_path = (subtitle_result.data or {}).get("subtitle_path")

        video_path = data.get("video_path")
        audio_path = data.get("audio_path")
        metadata = data.get("metadata") or {}

        manifest = {
            "source": "OpenMontage/tools.analysis.video_downloader.VideoDownloader",
            "reference_url": request.url,
            "reference_video_date": request.reference_video_date,
            "target_topic": request.target_topic,
            "creative_goal": request.creative_goal,
            "platform": data.get("platform"),
            "metadata": metadata,
            "artifacts": {
                "video": artifact_name(video_path),
                "audio": artifact_name(audio_path),
                "subtitles": artifact_name(subtitle_path),
            },
            "next_stage": "argument-segmentation-and-fact-check",
        }
        (job_dir(job_id) / "manifest.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )
        write_state(
            job_id,
            status="ready",
            stage="ready",
            progress=100,
            manifest=manifest,
        )
    except Exception as exc:
        write_state(
            job_id,
            status="failed",
            stage="failed",
            progress=100,
            error=str(exc)[:4000],
        )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "illco-openmontage-worker",
        "openmontage_root": str(OPENMONTAGE_ROOT),
        "openmontage_present": OPENMONTAGE_ROOT.is_dir(),
        "auth_configured": bool(TOKEN),
    }


@app.post("/v1/reference-jobs")
def create_reference_job(
    request: ReferenceJobRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_auth(authorization)
    request.url = safe_url(request.url)
    job_id = f"om_{uuid.uuid4().hex}"
    write_state(
        job_id,
        status="queued",
        stage="queued",
        progress=0,
        request=request.model_dump(),
    )
    thread = threading.Thread(target=run_reference_job, args=(job_id, request), daemon=True)
    thread.start()
    return {"job_id": job_id, "status": "queued", "progress": 0}


@app.get("/v1/reference-jobs/{job_id}")
def get_reference_job(
    job_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_auth(authorization)
    return read_state(job_id)


@app.get("/v1/reference-jobs/{job_id}/artifacts/{name}")
def get_artifact(
    job_id: str,
    name: str,
    authorization: str | None = Header(default=None),
):
    require_auth(authorization)
    state = read_state(job_id)
    if state.get("status") != "ready":
        raise HTTPException(status_code=409, detail="Job is not ready")

    allowed = {"video", "audio", "subtitles", "manifest"}
    if name not in allowed:
        raise HTTPException(status_code=404, detail="Artifact not found")

    if name == "manifest":
        path = job_dir(job_id) / "manifest.json"
    else:
        artifact_file = ((state.get("manifest") or {}).get("artifacts") or {}).get(name)
        if not artifact_file:
            raise HTTPException(status_code=404, detail="Artifact not available")
        path = job_dir(job_id) / "media" / Path(str(artifact_file)).name

    if not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact file not found")
    return FileResponse(path)


@app.delete("/v1/reference-jobs/{job_id}")
def delete_reference_job(
    job_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_auth(authorization)
    directory = job_dir(job_id)
    if directory.exists():
        shutil.rmtree(directory)
    return {"deleted": True, "job_id": job_id}
