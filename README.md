# Live Control Plane MVP (One-to-Many AI Stream)

This is a runnable implementation of your improved architecture:

- Control plane receives viewer messages
- Moderation + rate limiting + audit
- Redis + BullMQ queue with one worker per channel
- Orchestrator enforces strict turn-taking
- Producer webpage receives only `channel:{id}:speak`
- Producer emits ACK events (`accepted_for_render`, `avatar_started`, `avatar_finished`, `avatar_error`) with `commandId` correlation
- Host-only controls can skip, stop, mute, or unmute a channel
- OBS consumes only the producer webpage and distributes one encoded stream

## What to run

1. Copy env:

```
cp .env.example .env
```

2. Install dependencies:

```
npm install
```

3. Start infra and run in dev mode:

```
npm run dev
```

Required local services:

- Redis 7+
- PostgreSQL (optional, logs are in-memory if missing)

## API

- `POST /api/channels/{channelId}/messages`
- `GET /api/channels/{channelId}/health`
- `GET /api/channels/{channelId}/producer-token`
- `POST /api/channels/{channelId}/control` (admin token; `{ "command": "skip" | "stop" | "mute" | "unmute" }`)
- `GET /producer/channel/{channelId}?token=...`
- `POST /api/producers/{channelId}/events` (internal signed with `x-internal-secret`)

## Message flow

1. Viewer submits message to `/api/channels/{channelId}/messages`.
2. Moderation + rate limits are applied.
3. Approved message enters `channel:{id}:queue`.
4. Channel worker pops one job at a time (`concurrency = 1`).
5. Orchestrator generates response and emits socket command.
6. Producer page calls the configured D-ID agent command path and sends ACKs.
7. Orchestrator unlocks channel on final ACK and moves to next message.

The producer page fails closed if no D-ID agent bridge is present on `window.agentManager`, `window.didAgent`, `window.DID`, or `window.DIdAgent`. It no longer simulates playback.

## OBS

Point OBS Browser Source to:

```
https://producer.yourplatform.com/producer/channel/{channelId}?token=...
```

This route is private and only emits the video/audio for distribution.

## Vercel Deployment

This repo ships with a Vercel-safe HTTP mode:

- `/api/*` runs through `api/[...path].ts`
- `/producer/channel/{channelId}` rewrites to `public/producer.html`
- the producer page uses Socket.IO locally and HTTP polling on Vercel
- Redis is still required for queue, turn state, rate limits, and producer locks

Set these Vercel environment variables before production use:

```
REDIS_URL=rediss://...
DATABASE_URL=postgres://... # optional but recommended
PRODUCER_TOKEN_SECRET=<long-random-secret>
INTERNAL_EVENT_SECRET=<long-random-secret>
CONTROL_ADMIN_TOKEN=<long-random-secret>
LLM_ENDPOINT=
LLM_API_KEY=
CORS_ORIGIN=*
```

Deploy commands:

```
vercel
vercel --prod
```

After deploy, create a signed OBS URL:

```
GET https://your-vercel-domain/api/channels/abc123/producer-token?adminToken=<CONTROL_ADMIN_TOKEN>
```
