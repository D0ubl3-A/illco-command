from __future__ import annotations

import base64
import subprocess
import tempfile
import time
from pathlib import Path

from app import RenderRequest, create_render_job, job_row


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
                "source": "github-actions-smoke-test",
                "prospect": "AutoTube smoke test",
                "offer": "verified server-side rendering",
                "painPoint": "browser encoding is unreliable",
                "callToAction": "Ship the verified MP4.",
                "video": {
                    "title": "AutoTube production smoke test",
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
                    "script": "AutoTube production renderer smoke test.",
                    "source": "generated-test-tone",
                    "mimeType": "audio/mpeg",
                    "base64": base64.b64encode(audio_path.read_bytes()).decode("ascii"),
                },
                "scenes": [
                    {
                        "title": "Off-device render",
                        "onScreenText": "H.264 MP4 with AAC audio",
                        "narration": "AutoTube production renderer smoke test.",
                        "imageUrl": "",
                    }
                ],
                "delivery": {
                    "mode": "durable-artifact",
                    "requireRangeRequests": True,
                    "minimumRetentionSeconds": 86400,
                },
            }
        )
        created = create_render_job(payload, "github-actions-autotube-smoke-v5")
        job_id = created["jobId"]
        deadline = time.time() + 180
        while time.time() < deadline:
            row = job_row(job_id)
            if row["status"] == "ready":
                assert row["artifact_path"]
                artifact = Path(row["artifact_path"])
                assert artifact.is_file()
                assert artifact.stat().st_size > 100_000
                print(f"AutoTube smoke render passed: {artifact} ({artifact.stat().st_size} bytes)")
                return
            if row["status"] == "failed":
                raise RuntimeError(row["error"] or "AutoTube smoke render failed")
            time.sleep(1)
        raise TimeoutError("AutoTube smoke render did not finish within 180 seconds")


if __name__ == "__main__":
    main()
