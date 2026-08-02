from __future__ import annotations

import base64
import json
import subprocess
import tempfile
import time
from pathlib import Path

from app_v4_runtime import RenderRequest, create_render_job, job_row


def create_audio(path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=220:sample_rate=48000:duration=6",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "128k",
            str(path),
        ],
        check=True,
        timeout=60,
    )


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="autotube-smoke-source-") as temporary:
        audio_path = Path(temporary) / "narration.mp3"
        create_audio(audio_path)
        payload = RenderRequest.model_validate(
            {
                "schemaVersion": 1,
                "source": "github-actions-smoke-test-v4",
                "prospect": "AutoTube 4 smoke test",
                "offer": "verified style-directed server-side rendering",
                "painPoint": "generic static slides do not demonstrate a production pipeline",
                "callToAction": "Ship the verified animated MP4.",
                "video": {
                    "title": "AutoTube 4 production smoke test",
                    "aspectRatio": "square",
                    "width": 360,
                    "height": 360,
                    "fps": 30,
                    "durationSeconds": 6,
                    "container": "mp4",
                    "videoCodec": "h264",
                    "audioCodec": "aac",
                    "audioSampleRate": 48000,
                    "fastStart": True,
                    "brandColors": ["#061A17", "#16E0A5"],
                },
                "narration": {
                    "script": "AutoTube 4 production renderer smoke test.",
                    "source": "generated-test-tone",
                    "mimeType": "audio/mpeg",
                    "base64": base64.b64encode(audio_path.read_bytes()).decode("ascii"),
                },
                "scenes": [
                    {
                        "title": "Style-directed render",
                        "onScreenText": "AutoTube 4 camera motion and verified MP4 delivery",
                        "narration": "AutoTube 4 production renderer smoke test.",
                        "imageUrl": "",
                    }
                ],
                "delivery": {
                    "mode": "durable-artifact",
                    "requireRangeRequests": True,
                    "minimumRetentionSeconds": 86400,
                    "autotubeV4": {
                        "standardVersion": "4.0.0",
                        "styleId": "animated-explainer",
                        "intent": "explainer",
                        "qualityReport": {
                            "score": 100,
                            "threshold": 85,
                            "publishable": True,
                            "issues": [],
                        },
                        "rendererScenes": [
                            {
                                "id": "scene-1",
                                "kind": "hook",
                                "durationSeconds": 6,
                                "visualMode": "workflow-diagram",
                                "animations": [
                                    {
                                        "id": "scene-1-camera",
                                        "target": "scene",
                                        "preset": "camera-push",
                                        "startSeconds": 0,
                                        "durationSeconds": 6,
                                    }
                                ],
                            }
                        ],
                    },
                },
            }
        )
        created = create_render_job(payload, "github-actions-autotube-smoke-v4")
        job_id = created["jobId"]
        deadline = time.time() + 240
        while time.time() < deadline:
            row = job_row(job_id)
            if row["status"] == "ready":
                assert row["artifact_path"]
                artifact = Path(row["artifact_path"])
                assert artifact.is_file()
                assert artifact.stat().st_size > 100_000

                output = json.loads(row["output_json"] or "{}")
                assert "camera-push" in output.get("executedAnimationPresets", [])
                assert output.get("styleId") == "animated-explainer"

                playability = output.get("playability") or {}
                assert playability.get("validated") is True
                assert playability.get("completeDecode") is True
                assert playability.get("progressiveDownload") is True
                assert playability.get("videoCodec") == "h264"
                assert "Baseline" in str(playability.get("videoProfile"))
                assert playability.get("pixelFormat") == "yuv420p"
                assert playability.get("hasBFrames") == 0
                assert playability.get("audioCodec") == "aac"
                assert str(playability.get("audioProfile")).upper() == "LC"
                assert playability.get("width") == 360
                assert playability.get("height") == 360
                assert abs(float(playability.get("fps") or 0) - 30.0) < 0.01

                delivery = output.get("deliveryEncoding") or {}
                assert delivery.get("constantFrameRate") is True
                assert delivery.get("fastStart") is True
                assert delivery.get("completeDecodeRequired") is True

                print(
                    "AutoTube 4 smoke render and playability gate passed: "
                    f"{artifact} ({artifact.stat().st_size} bytes)"
                )
                return
            if row["status"] == "failed":
                raise RuntimeError(row["error"] or "AutoTube 4 smoke render failed")
            time.sleep(1)
        raise TimeoutError("AutoTube 4 smoke render did not finish within 240 seconds")


if __name__ == "__main__":
    main()
