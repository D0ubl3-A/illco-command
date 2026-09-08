# iLLCo Command

Production app for [illcoai.tech](https://illcoai.tech): the iLLCo AI product catalog, app landing pages, account access, paid unlockables, proof sections, customer-facing product surfaces, and the iLLCo Home Agent command layer.

## Stack

- Next.js 16
- React 19
- TypeScript
- Stripe checkout integration
- Vercel deployment
- OpenAI Agents SDK integration
- MCP / ChatGPT App endpoints
- OAuth-protected tool routes

## iLLCo Home Agent

The homepage mounts a command interface before the marketplace hero. Users describe the outcome they want, and the Home Agent routes the request to the best iLLCo capability while preserving existing product, access, checkout, and safety gates.

Primary implementation:

- `components/illco-home-agent.tsx` — responsive home command UI
- `components/illco-home-agent.module.css` — home agent styling
- `lib/illco-agent-registry.ts` — MCP/app capability registry and intent routing metadata
- `app/api/illco-agent/route.ts` — home-agent routing API
- `app/api/master-agent/route.ts` — existing catalog/access/checkout-aware Master Agent
- `lib/master-agent.ts` — existing product recommendation and safe route logic
- `app/page.tsx` — mounts the Home Agent above the existing App Store

### Connected iLLCo capability lanes

The Home Agent registry routes toward these systems:

- AutoTube — video rendering, scene composition, narration, OpenMontage reference ingest
- Debate Intelligence — transcript analysis, speaker/argument mapping, factual claim verification, YouTube pipeline, studio UI
- Lyric Video Forge — transcription, lyric review, caption export, visual planning, lyric-video rendering
- Meme Forge — meme concepts, generated image assets, quota/monetization flows
- Project Kickoff / Commander — project command-center workflows
- AI Voice — voice generation
- AccurateScribe — transcription and subtitle workflows
- Upload Post — publishing, analytics, FFmpeg jobs, and social distribution
- GitHub — repository, issue, PR, workflow, and code operations
- Google Drive — Docs, Sheets, Slides, and file operations
- Notion — workspace, documentation, database, and session operations
- Stripe — payment and account operations
- ChatGPT Ads Manager — ads, campaigns, creative, and conversion analysis
- HeyGen — avatars, video, translation, lipsync, voice, and clipping

## MCP and widget routes

### AutoTube

- MCP: `https://illcoai.tech/api/chatgpt/autotube/mcp`
- Widget: `https://illcoai.tech/api/chatgpt/autotube/widget`
- Render: `https://illcoai.tech/api/autotube/render`
- OAuth metadata: `https://illcoai.tech/.well-known/oauth-protected-resource/autotube`

### Debate Intelligence

- MCP: `https://illcoai.tech/api/chatgpt/debate-intelligence/mcp`
- Widget: `https://illcoai.tech/api/chatgpt/debate-intelligence/widget`
- Widget resource: `ui://illco/debate-intelligence/studio-v1.html`

### Lyric Video Forge

- MCP: `https://illcoai.tech/api/chatgpt/lyric-video-forge/mcp`
- SSE: `https://illcoai.tech/api/chatgpt/lyric-video-forge/sse`
- Messages: `https://illcoai.tech/api/chatgpt/lyric-video-forge/messages`
- Widget: `https://illcoai.tech/api/chatgpt/lyric-video-forge/widget`
- Widget resource: `ui://illco/lyric-video-forge/v2.html`

### Meme Image Forge

- Generic MCP entry currently routes into Meme Image Forge: `https://illcoai.tech/mcp`
- Widget resource: `ui://illco/meme-image-forge/v1.html`

### Project Kickoff Builder

- Source app: `apps/ai-project-kickoff-builder/`
- Default MCP path: `/mcp`
- Health: `/healthz`
- Preview: `/preview`
- Widget resource: `ui://ai-project-kickoff-builder/command-center-v1.html`

## Home Agent architecture

```text
User request
   ↓
iLLCo Home Agent
   ↓
Intent + capability registry
   ↓
Master Agent product/access checks
   ↓
Best matching iLLCo capability
   ├── AutoTube
   ├── Debate Intelligence
   ├── Lyric Video Forge
   ├── Meme Forge
   ├── Project / Commander
   ├── Voice / Transcription
   ├── GitHub / Drive / Notion
   ├── Stripe / Ads
   └── Publishing / Video services
   ↓
Open the correct tool, widget, app, or safe setup route
```

The next architectural step is multi-tool orchestration so one user instruction can execute a verified sequence such as Debate Intelligence → AutoTube → Voice → Meme/Image Forge → Upload Post, rather than only routing to a single destination.

## Local Development

```powershell
npm install
npm run dev
```

Open the local URL printed by Next.js.

## Verification

```powershell
npm run build
npm test
```

## Environment

Use `.env.example` as the public template. Real `.env*` files are intentionally ignored and must stay out of Git.

AutoTube renderer credentials, signing secrets, allowlists, OAuth secrets, narration-provider credentials, and other sensitive configuration must remain server-side and must never be committed.

## Deployment

The production domain is:

- https://illcoai.tech

Deployments are handled through Vercel.

After changes to MCP or production integration code, verify the live domain and relevant MCP/widget endpoints rather than treating a successful source commit as proof of a successful production deployment.
