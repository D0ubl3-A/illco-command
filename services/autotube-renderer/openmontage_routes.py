from __future__ import annotations

import json
import importlib
import inspect
import os
import pkgutil
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
_REGISTRY_LOCK = threading.Lock()
_REGISTRY: dict[str, Any] | None = None
_REGISTRY_ERRORS: list[str] = []
MAX_SKILL_BYTES = 96_000
TEXT_SKILL_EXTENSIONS = {
    ".md", ".mdx", ".txt", ".yaml", ".yml", ".json", ".py", ".ts", ".tsx",
    ".js", ".jsx", ".sh", ".toml", ".css", ".html", ".sql", ".xml",
}


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


def _openmontage_registry() -> tuple[dict[str, Any], list[str]]:
    """Load OpenMontage tools independently so optional providers do not hide others."""
    global _REGISTRY, _REGISTRY_ERRORS
    with _REGISTRY_LOCK:
        if _REGISTRY is not None:
            return _REGISTRY, _REGISTRY_ERRORS
        root = str(OPENMONTAGE_ROOT)
        if root not in sys.path:
            sys.path.insert(0, root)
        try:
            package = importlib.import_module("tools")
            from tools.base_tool import BaseTool
        except Exception as exc:
            _REGISTRY = {}
            _REGISTRY_ERRORS = [f"OpenMontage tool base unavailable: {type(exc).__name__}"]
            return _REGISTRY, _REGISTRY_ERRORS

        found: dict[str, Any] = {}
        errors: list[str] = []
        for module_info in pkgutil.walk_packages(package.__path__, "tools."):
            if module_info.name.endswith((".base_tool", ".tool_registry")):
                continue
            try:
                module = importlib.import_module(module_info.name)
                for _, cls in inspect.getmembers(module, inspect.isclass):
                    if cls is BaseTool or not issubclass(cls, BaseTool):
                        continue
                    if cls.__module__ != module.__name__ or inspect.isabstract(cls):
                        continue
                    try:
                        instance = cls()
                        if instance.name:
                            found[instance.name] = instance
                    except Exception as exc:
                        errors.append(f"{module_info.name}: {type(exc).__name__}")
            except Exception as exc:
                errors.append(f"{module_info.name}: {type(exc).__name__}")
        _REGISTRY = found
        _REGISTRY_ERRORS = errors[:100]
        return _REGISTRY, _REGISTRY_ERRORS


def _tool_summary(tool: Any) -> dict[str, Any]:
    info = tool.get_info()
    return {
        "name": info.get("name"),
        "description": inspect.getdoc(tool.__class__) or "OpenMontage production tool.",
        "capability": info.get("capability"),
        "provider": info.get("provider"),
        "tier": info.get("tier"),
        "runtime": info.get("runtime"),
        "status": info.get("status"),
        "stability": info.get("stability"),
        "agent_skills": info.get("agent_skills") or [],
        "side_effects": info.get("side_effects") or [],
    }


def _skill_roots() -> list[Path]:
    return [OPENMONTAGE_ROOT / ".agents" / "skills", OPENMONTAGE_ROOT / "skills"]


def _skill_files() -> list[Path]:
    paths: list[Path] = []
    for root in _skill_roots():
        if root.is_dir():
            paths.extend(p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in TEXT_SKILL_EXTENSIONS)
    return sorted(paths, key=lambda p: p.relative_to(OPENMONTAGE_ROOT).as_posix().lower())


def _safe_skill_path(value: str) -> Path:
    candidate = (OPENMONTAGE_ROOT / value).resolve()
    for root in _skill_roots():
        allowed = root.resolve()
        if candidate == allowed or allowed in candidate.parents:
            if candidate.is_file():
                return candidate
    raise HTTPException(status_code=404, detail="OpenMontage skill file not found")


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

    @app.get("/v1/openmontage/tools")
    def list_openmontage_tools(
        q: str = "",
        capability: str = "",
        provider: str = "",
        status: str = "",
        offset: int = 0,
        limit: int = 50,
        authorization: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_auth(authorization)
        registry, errors = _openmontage_registry()
        query = q.strip().lower()
        rows = [_tool_summary(tool) for tool in registry.values()]
        rows = [row for row in rows if
            (not query or query in " ".join(str(row.get(k, "")) for k in ("name", "description", "capability", "provider")).lower())
            and (not capability or row.get("capability") == capability)
            and (not provider or row.get("provider") == provider)
            and (not status or row.get("status") == status)
        ]
        rows.sort(key=lambda row: str(row.get("name", "")))
        safe_offset = max(0, min(int(offset), 10000))
        safe_limit = max(1, min(int(limit), 100))
        return {"total": len(rows), "offset": safe_offset, "limit": safe_limit,
                "tools": rows[safe_offset:safe_offset + safe_limit],
                "discovery_errors": errors}

    @app.get("/v1/openmontage/tools/{tool_name}")
    def get_openmontage_tool(
        tool_name: str,
        authorization: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_auth(authorization)
        registry, _ = _openmontage_registry()
        tool = registry.get(tool_name)
        if tool is None:
            raise HTTPException(status_code=404, detail="OpenMontage tool not found")
        info = tool.get_info()
        info["description"] = inspect.getdoc(tool.__class__) or "OpenMontage production tool."
        try:
            info["estimated_cost_usd"] = tool.estimate_cost({})
            info["cost_quote_required"] = False
        except Exception as exc:
            info["estimated_cost_usd"] = None
            info["cost_quote_required"] = True
            info["cost_quote_reason"] = str(exc)[:500]
        return info

    @app.post("/v1/openmontage/tools/{tool_name}/execute")
    def execute_openmontage_tool(
        tool_name: str,
        payload: dict[str, Any],
        authorization: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_auth(authorization)
        registry, _ = _openmontage_registry()
        tool = registry.get(tool_name)
        if tool is None:
            raise HTTPException(status_code=404, detail="OpenMontage tool not found")
        if tool.get_status().value != "available":
            raise HTTPException(status_code=409, detail="This OpenMontage tool is unavailable in the current worker runtime")
        inputs = payload.get("inputs") if isinstance(payload.get("inputs"), dict) else {}
        try:
            quoted_cost = tool.estimate_cost(inputs)
        except Exception as exc:
            raise HTTPException(status_code=409, detail=f"Tool needs a cost quote before execution: {str(exc)[:300]}")
        runtime = getattr(tool.runtime, "value", str(tool.runtime))
        if runtime in {"api", "hybrid"} and float(quoted_cost or 0) <= 0:
            raise HTTPException(status_code=409, detail="This API tool has no reliable cost estimate; it is not enabled through the AutoTube bridge")
        confirmed_cost = payload.get("confirmed_cost_usd")
        if float(quoted_cost or 0) > 0 and (not isinstance(confirmed_cost, (int, float)) or confirmed_cost < quoted_cost):
            raise HTTPException(status_code=409, detail=f"Approval required for estimated cost ${float(quoted_cost):.4f}")
        if tool.side_effects and payload.get("confirm_side_effects") is not True:
            raise HTTPException(status_code=409, detail="Approval required for this tool's external side effects")
        try:
            result = tool.execute(inputs)
            response = {
                "success": bool(result.success),
                "data": result.data,
                "artifacts": [Path(str(item)).name for item in (result.artifacts or [])],
                "error": result.error,
                "cost_usd": result.cost_usd,
                "duration_seconds": result.duration_seconds,
                "model": result.model,
                "from_cache": result.from_cache,
            }
            return response
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"OpenMontage tool failed: {type(exc).__name__}: {str(exc)[:500]}") from exc

    @app.get("/v1/openmontage/skills")
    def list_openmontage_skills(
        q: str = "",
        offset: int = 0,
        limit: int = 50,
        authorization: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_auth(authorization)
        files = _skill_files()
        query = q.strip().lower()
        rows = [p.relative_to(OPENMONTAGE_ROOT).as_posix() for p in files]
        if query:
            rows = [path for path in rows if query in path.lower()]
        safe_offset = max(0, min(int(offset), 10000))
        safe_limit = max(1, min(int(limit), 100))
        return {"total": len(rows), "offset": safe_offset, "limit": safe_limit,
                "skills": rows[safe_offset:safe_offset + safe_limit]}

    @app.get("/v1/openmontage/skills/read")
    def read_openmontage_skill(
        path: str,
        authorization: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_auth(authorization)
        file_path = _safe_skill_path(path)
        raw = file_path.read_bytes()
        if len(raw) > MAX_SKILL_BYTES:
            raise HTTPException(status_code=413, detail="Skill file is too large to return in one response")
        return {"path": file_path.relative_to(OPENMONTAGE_ROOT).as_posix(),
                "content": raw.decode("utf-8", errors="replace")}

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
