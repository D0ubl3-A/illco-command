# AutoTube Production Renderer 5.0

This service performs the work that must not run inside an iPhone, ChatGPT iframe, or short-lived Vercel request:

- receives an authenticated render job from `illco-command`;
- persists the job in SQLite on a mounted volume;
- accepts the already-generated narration audio from the same request;
- creates scene graphics or uses approved allowlisted scene images;
- renders H.264 video with FFmpeg at the requested aspect ratio;
- muxes 48 kHz stereo AAC narration;
- applies MP4 fast-start metadata;
- validates codec, resolution, duration, and file size with `ffprobe`;
- stores the MP4 on the mounted `/data` volume;
- exposes status and Range-compatible artifact endpoints.

## Required environment

```dotenv
AUTOTUBE_RENDER_SERVICE_TOKEN=replace-with-a-long-random-secret
AUTOTUBE_DATA_DIR=/data
AUTOTUBE_JOB_RETENTION_SECONDS=604800
AUTOTUBE_RENDER_WORKERS=1
AUTOTUBE_IMAGE_HOSTS=illcoai.tech,images.unsplash.com,*.oaiusercontent.com
```

Use the same `AUTOTUBE_RENDER_SERVICE_TOKEN` in the `illco-command` Vercel environment. Mount durable storage at `/data`; without a persistent volume, completed videos will disappear when the container is replaced.

## Container deployment

Build from this directory:

```bash
docker build -t illco-autotube-renderer:5.0.0 .
docker run --rm \
  -p 8080:8080 \
  -e AUTOTUBE_RENDER_SERVICE_TOKEN="$AUTOTUBE_RENDER_SERVICE_TOKEN" \
  -v autotube-data:/data \
  illco-autotube-renderer:5.0.0
```

The production host can be Railway, Render, Fly.io, AWS ECS, Google Cloud Run with mounted storage, or another container platform that supports a persistent volume and render requests longer than several minutes.

## API contract

All `/v1/*` routes require:

```http
Authorization: Bearer <AUTOTUBE_RENDER_SERVICE_TOKEN>
```

Routes:

- `GET /health` — public process health.
- `GET /ready` — authenticated FFmpeg and storage readiness.
- `POST /v1/render-jobs` — submit a production render; supports `Idempotency-Key`.
- `GET /v1/render-jobs/{job_id}` — read stage, progress, error, and technical output metadata.
- `GET /v1/render-jobs/{job_id}/artifact` — stream the finished MP4 with byte-range support.

## Verification standard

A successful submission is not a completed video. Mark a run verified only after:

1. status is `ready`;
2. progress is `100`;
3. the output reports H.264 video and AAC audio;
4. the output resolution matches the request;
5. the signed iLLCoAI video URL plays with sound;
6. seeking works through HTTP Range requests;
7. the attachment URL downloads a non-empty `.mp4` on mobile.
