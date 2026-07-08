# Lyric Video Forge ChatGPT App

This adds a ChatGPT Apps SDK/MCP surface for the existing ILLCO Lyric Video Forge app.

## App URLs

Production MCP URL after deploy:

```text
https://illcoai.tech/api/chatgpt/lyric-video-forge/mcp
```

SSE compatibility URL if the ChatGPT UI asks specifically for an SSE endpoint:

```text
https://illcoai.tech/api/chatgpt/lyric-video-forge/sse
```

Local tunnel shape:

```text
https://YOUR-TUNNEL.ngrok-free.app/api/chatgpt/lyric-video-forge/mcp
https://YOUR-TUNNEL.ngrok-free.app/api/chatgpt/lyric-video-forge/sse
```

## ChatGPT setup

1. Run the ILLCO app locally or deploy it publicly.
2. If local, expose the Next server with an HTTPS tunnel.
3. In ChatGPT, enable Developer Mode in Apps & Connectors advanced settings.
4. Create a new app/custom MCP connection.
5. Paste the public MCP URL above.
6. Refresh the app after endpoint or tool metadata changes.

## Tools exposed

- `lyric_video_forge_start`: starts a run from artist, song, visual direction, image count, and lyric status.
- `lyric_video_forge_transcript_review`: reviews provided transcription text and keeps user approval as the gate.
- `lyric_video_forge_visual_plan`: plans image count, character lock, dissolve pacing, and render requirements after lyrics are approved.
- `lyric_video_forge_choose_stt_model`: selects the STT model and word/segment timestamp mode before transcription.
- `lyric_video_forge_transcribe_audio`: requires a ChatGPT-provided `audioFile` reference, fetches its temporary `download_url` server-side, and returns transcript text plus timed lyric JSON when STT credentials are configured.
- `lyric_video_forge_export_srt`: stages approved timed lyrics for SRT caption export.
- `lyric_video_forge_export_ass`: stages approved timed lyrics for styled ASS subtitle burn-in.
- `lyric_video_forge_render_lyric_video`: stages final watermarked render using audio, approved captions, selected images, dissolve transitions, and QC artifacts.

## Data rules

- Audio and character files stay in the ILLCO Forge upload flow.
- The ChatGPT app can stage and guide the workflow, but the full upload/render surface remains `/tools/lyric-video-forge`.
- Image generation is credit-counted by selected image count.
- Lyrics approval is required before visual/render planning.

## MCP risk controls

- All exposed ChatGPT tools are read-only planning tools.
- Tool descriptors do not request conversation summaries, addresses, income, credentials, API keys, or unrelated private data.
- The app does not expose destructive write actions through MCP.
- Asset generation, rendering, purchases, and credit-spending actions must stay behind the normal ILLCO app UI and user confirmation.
- Transcript review accepts only lyrics/transcript text needed for the job.
- Render, export, and transcription MCP actions expose the production workflow to ChatGPT, but final file upload, credit spend, render execution, and downloads still require Forge account/UI confirmation.
- `transcribe_audio` uses `_meta["openai/fileParams"] = ["audioFile"]`; do not pass local paths or `file://` URLs. ChatGPT must attach the uploaded MP3 as `audioFile`.
- Groq STT requires `GROQ_API_KEY`; OpenAI STT requires `OPENAI_API_KEY` or `CODEX_API_KEY`.
- If OAuth is added later, scopes should be narrow and action-specific, for example `lyric_video:plan` and `lyric_video:review_transcript`.
