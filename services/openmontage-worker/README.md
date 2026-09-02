# OpenMontage worker for AutoTube

This service runs the real OpenMontage reference-video downloader in an isolated long-running worker.

## What it does

1. Accepts a supported reference-video URL.
2. Runs OpenMontage `tools.analysis.video_downloader.VideoDownloader`.
3. Downloads analysis-quality video plus a mono WAV audio track.
4. Attempts English subtitles.
5. Stores a manifest for downstream argument segmentation, fact checking, sprite generation, and AutoTube rendering.

The Docker image pins OpenMontage to commit `cd9f3c1f03368be87b140af494914b8ee4e3c7a4` for reproducibility.

## Required environment

- `OPENMONTAGE_WORKER_TOKEN` — bearer token shared with illco-command.
- `OPENMONTAGE_DATA_DIR` — optional persistent volume path; defaults to `/data/openmontage`.

The Next.js app uses:

- `OPENMONTAGE_WORKER_URL`
- `OPENMONTAGE_WORKER_TOKEN`

## API

- `POST /v1/reference-jobs`
- `GET /v1/reference-jobs/{job_id}`
- `GET /v1/reference-jobs/{job_id}/artifacts/video`
- `GET /v1/reference-jobs/{job_id}/artifacts/audio`
- `GET /v1/reference-jobs/{job_id}/artifacts/subtitles`
- `GET /v1/reference-jobs/{job_id}/artifacts/manifest`

## License

OpenMontage is upstream software licensed under AGPL-3.0. The worker intentionally keeps the upstream repository and license intact inside the image. If this network service is modified or distributed, comply with the AGPL source-offer requirements for the corresponding source.
