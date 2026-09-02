from __future__ import annotations

import json
import os
import shutil
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from fastapi import Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

OPENMONTAGE_ROOT = Path(os.environ.get("OPENMONTAGE_ROOT", "/opt/OpenMontage"))
DATA_ROOT = Path(os.environ.get("OPENMONTAGE_DATA_DIR", "/data/openmontage"))
TOKEN = (
    os.environ.get("OPENMONTAGE_WORKER_TOKEN", "").strip()
    or os.environ.get("AUTOTUBE_RENDER_SERVICE_TOKEN", "").strip()
)

ALLOWED_HOSTS = {
    "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
    "instagram.com", "www.instagram.com",
    "tiktok.com", "www.tiktok.com",
    "vimeo.com", "www.vimeo.com",
    "x.com", "www.x.com", "twitter.com", "www.twitter.com",
}
JOB_ID_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")
DATA_ROOT.mkdir(parents=True, exist_ok=True)


class ReferenceJobRequest(BaseModel):
    url: str
    max_resolution: str = Field(default="720p", pattern="^(360p|480p|720p|1080p)$")
    max_duration_seconds: int = Field(default=7200, ge=30, le=21600)
    download_subtitles: bool = True
    reference_video_date: str | None = None
    target_topic: str | None = None
    creative_goal: str | None = None


def _require_auth(authorization: str | None) -> None:
    if not TOKEN:
        raise HTTPException(status_code=503, detail="OpenMontage worker authentication is not configured")
    if authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def _safe_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only HTTP(S) URLs are supported")
    host = (parsed.hostname or "").lower()
    if host not in ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail=f"Unsupported reference-video host: {host}")
    return value


def _job_dir(job_id: str) -> Path:
    if not job_id or any(ch not in JOB_ID_CHARS for ch in job_id):
        raise HTTPException(status_code=400, detail="Invalid job id")
    return DATA_ROOT / job_id


def _state_path(job_id: str) -> Path:
    return _job_dir(job_id) / "job.json"


def _write_state(job_id: str, **changes: Any) -> dict[str, Any]:
    directory = _job_dir(job_id)
    directory.mkdir(parents=True, exist_ok=True)
    path = _state_path(job_id)
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


def _read_state(job_id: str) -> dict[str, Any]:
    path = _state_path(job_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    return json.loads(path.read_text(encoding="utf-8"))


def _artifact_name(path_value: str | None) -> str | None:
    return Path(path_value).name if path_value else None


def _run_reference_job(job_id: str, request: ReferenceJobRequest) -> None:
    try:
        _write_state(job_id, status="running", stage="openmontage-download", progress=10)
        if not OPENMONTAGE_ROOT.is_dir():
            raise RuntimeError(f"OpenMontage root is missing: {OPENMONTAGE_ROOT}")
        root = str(OPENMONTAGE_ROOT)
        if root not in sys.path:
            sys.path.insert(0, root)

        from tools.analysis.video_downloader import VideoDownloader

        output_dir = _job_dir(job_id) / "media"
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
        _write_state(job_id, status="running", stage="openmontage-subtitles", progress=70)

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

        manifest = {
            "source": "OpenMontage/tools.analysis.video_downloader.VideoDownloader",
            "reference_url": request.url,
            "reference_video_date": request.reference_video_date,
            "target_topic": request.target_topic,
            "creative_goal": request.creative_goal,
            "platform": data.get("platform"),
            "metadata": data.get("metadata") or {},
            "artifacts": {
                "video": _artifact_name(data.get("video_path")),
                "audio": _artifact_name(data.get("audio_path")),
                "subtitles": _artifact_name(subtitle_path),
            },
            "next_stage": "argument-segmentation-and-fact-check",
        }
        (_job_dir(job_id) / "manifest.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )
        _write_state(job_id, status="ready", stage="ready", progress=100, manifest=manifest)
    except Exception as exc:
        _write_state(job_id, status="failed", stage="failed", progress=100, error=str(exc)[:4000])


def attach_openmontage_routes(app) -> None:
    @app.get("/openmontage/health")
    def openmontage_health() -> dict[str, Any]:
        return {
            "ok": True,
            "service": "illco-openmontage-worker",
            "openmontage_present": OPENMONTAGE_ROOT.is_dir(),
            "auth_configured": bool(TOKEN),
        }

    @app.post("/v1/reference-jobs")
    def create_reference_job(
        request: ReferenceJobRequest,
        authorization: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_auth(authorization)
        request.url = _safe_url(request.url)
        job_id = f"om_{uuid.uuid4().hex}"
        _write_state(job_id, status="queued", stage="queued", progress=0, request=request.model_dump())
        threading.Thread(target=_run_reference_job, args=(job_id, request), daemon=True).start()
        return {"job_id": job_id, "status": "queued", "progress": 0}

    @app.get("/v1/reference-jobs/{job_id}")
    def get_reference_job(
        job_id: str,
        authorization: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_auth(authorization)
        return _read_state(job_id)

    @app.get("/v1/reference-jobs/{job_id}/artifacts/{name}")
    def get_reference_artifact(
        job_id: str,
        name: str,
        authorization: str | None = Header(default=None),
    ):
        _require_auth(authorization)
        state = _read_state(job_id)
        if state.get("status") != "ready":
            raise HTTPException(status_code=409, detail="Job is not ready")
        if name not in {"video", "audio", "subtitles", "manifest"}:
            raise HTTPException(status_code=404, detail="Artifact not found")

        if name == "manifest":
            path = _job_dir(job_id) / "manifest.json"
        else:
            filename = ((state.get("manifest") or {}).get("artifacts") or {}).get(name)
            if not filename:
                raise HTTPException(status_code=404, detail="Artifact not available")
            path = _job_dir(job_id) / "media" / Path(str(filename)).name

        if not path.is_file():
            raise HTTPException(status_code=404, detail="Artifact file not found")
        return FileResponse(path)

    @app.delete("/v1/reference-jobs/{job_id}")
    def delete_reference_job(
        job_id: str,
        authorization: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_auth(authorization)
        directory = _job_dir(job_id)
        if directory.exists():
            shutil.rmtree(directory)
        return {"deleted": True, "job_id": job_id}
