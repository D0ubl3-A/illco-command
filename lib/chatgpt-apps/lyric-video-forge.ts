export const LYRIC_VIDEO_FORGE_APP = {
  id: "lyric-video-forge",
  title: "Lyric Video Forge",
  description:
    "Turns uploaded audio, character references, approved lyrics, image credits, and dissolve rules into production lyric-video plans.",
  toolNames: {
    start: "lyric_video_forge_start",
    transcript: "lyric_video_forge_transcript_review",
    visualPlan: "lyric_video_forge_visual_plan",
  },
  widgetUri: "ui://illco/lyric-video-forge/v1.html",
};

export type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: any;
};

const baseToolMeta = {
  "openai/outputTemplate": LYRIC_VIDEO_FORGE_APP.widgetUri,
  "openai/toolInvocation/invoking": "Preparing Lyric Video Forge...",
  "openai/toolInvocation/invoked": "Lyric Video Forge is ready.",
};

export function getLyricVideoForgeTools() {
  return [
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.start,
      title: "Start Lyric Video Forge",
      description:
        "Use this when the user wants to create a lyric video from audio, a character reference, artist/song details, credits, and visual direction.",
      inputSchema: {
        type: "object",
        properties: {
          artist: { type: "string", default: "M3ntally-iLL" },
          songTitle: { type: "string", default: "Untitled" },
          visualDirection: { type: "string" },
          imageCount: { type: "integer", minimum: 1, maximum: 12, default: 4 },
          lyricsStatus: { type: "string", enum: ["needs_transcription", "user_supplied", "approved"], default: "needs_transcription" },
        },
        required: ["artist", "songTitle"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: baseToolMeta,
    },
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.transcript,
      title: "Review Rap Transcript",
      description:
        "Use this when lyrics or transcription text need to be reviewed before image generation or rendering is unlocked.",
      inputSchema: {
        type: "object",
        properties: {
          transcript: { type: "string" },
          knownIssues: { type: "string" },
          requireUserApproval: { type: "boolean", default: true },
        },
        required: ["transcript"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: baseToolMeta,
    },
    {
      name: LYRIC_VIDEO_FORGE_APP.toolNames.visualPlan,
      title: "Plan Dissolve Visuals",
      description:
        "Use this after lyrics are confirmed to plan the selected number of images, character lock, dissolve pacing, and render requirements.",
      inputSchema: {
        type: "object",
        properties: {
          artist: { type: "string" },
          songTitle: { type: "string" },
          imageCount: { type: "integer", minimum: 1, maximum: 12 },
          lyricsApproved: { type: "boolean" },
          characterReferenceProvided: { type: "boolean" },
          visualDirection: { type: "string" },
        },
        required: ["artist", "songTitle", "imageCount", "lyricsApproved", "characterReferenceProvided"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: baseToolMeta,
    },
  ];
}

function ok(id: JsonRpcRequest["id"], result: any) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function error(id: JsonRpcRequest["id"], code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status: code === -32601 ? 404 : 400 });
}

export function buildWidgetHtml(origin = "") {
  const apiBase = origin ? `${origin}/tools/lyric-video-forge` : "/tools/lyric-video-forge";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Lyric Video Forge</title>
<style>
:root{color-scheme:dark;--gold:#ffd66b;--ink:#07080c;--panel:#11141d;--line:rgba(255,255,255,.16);--text:#f9f3e3;--muted:#b7ad96;--red:#ff425e}*{box-sizing:border-box}body{margin:0;font-family:Georgia,'Times New Roman',serif;background:radial-gradient(circle at 20% 0%,rgba(255,214,107,.18),transparent 28%),linear-gradient(145deg,#06070b,#17100d 58%,#07080c);color:var(--text)}main{min-height:100vh;padding:22px;display:grid;gap:16px}.hero{border:1px solid var(--line);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.03));padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.45)}h1{font-size:clamp(32px,8vw,64px);line-height:.9;margin:8px 0 12px;letter-spacing:-.06em}.pill{display:inline-flex;border:1px solid rgba(255,214,107,.5);color:var(--gold);border-radius:999px;padding:7px 10px;font-size:12px;text-transform:uppercase;letter-spacing:.16em}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.card{border:1px solid var(--line);border-radius:18px;background:rgba(0,0,0,.26);padding:14px}.card strong{display:block;color:var(--gold);font-size:22px}button,a.button{appearance:none;text-decoration:none;border:0;border-radius:14px;padding:13px 15px;background:var(--gold);color:#171009;font-weight:900;cursor:pointer}.secondary{background:rgba(255,255,255,.1)!important;color:var(--text)!important;border:1px solid var(--line)!important}.actions{display:flex;gap:10px;flex-wrap:wrap}.muted{color:var(--muted)}pre{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#050609;border:1px solid var(--line);border-radius:16px;padding:14px;max-height:240px;overflow:auto}@media(max-width:720px){.grid{grid-template-columns:1fr}main{padding:14px}}
</style>
</head>
<body>
<main>
<section class="hero">
<span class="pill">ChatGPT App</span>
<h1>Lyric Video Forge</h1>
<p class="muted">Upload audio and a character reference in the ILLCO page, transcribe rap lyrics, confirm the words, then spend credits on generated images and dissolve visuals.</p>
<div class="actions">
<a class="button" href="${apiBase}" target="_blank" rel="noreferrer">Open full ILLCO Forge</a>
<button class="secondary" id="ask">Ask ChatGPT to start</button>
</div>
</section>
<section class="grid">
<div class="card"><strong>1</strong><p>Transcribe first with rap-specialist instructions and word-timing fallback.</p></div>
<div class="card"><strong>2</strong><p>User confirms lyrics before any render/image generation plan unlocks.</p></div>
<div class="card"><strong>3</strong><p>Credits choose image count; stills dissolve instead of hard cutting.</p></div>
</section>
<section class="card">
<strong>Current tool output</strong>
<pre id="out">Waiting for ChatGPT tool output...</pre>
</section>
</main>
<script>
const out=document.getElementById('out');
function paint(){const data=window.openai?.toolOutput||window.openai?.toolResponseMetadata||window.openai?.toolInput;if(data)out.textContent=JSON.stringify(data,null,2)}
paint();
document.getElementById('ask').onclick=()=>{if(window.openai?.sendFollowUpMessage){window.openai.sendFollowUpMessage({prompt:'Start a Lyric Video Forge run. Ask me for the song audio, character reference, artist name, song title, and image count.'})}else{out.textContent='Open this inside ChatGPT to use the Apps bridge.'}}
window.addEventListener('message',paint);
</script>
</body>
</html>`;
}

function toolResult(name: string, args: any) {
  const imageCount = Math.min(12, Math.max(1, Number(args?.imageCount || 4)));
  const credits = name === LYRIC_VIDEO_FORGE_APP.toolNames.start ? 4 : 2 + imageCount * 5;
  const structuredContent = {
    app: LYRIC_VIDEO_FORGE_APP.id,
    mode: name,
    artist: args?.artist || "M3ntally-iLL",
    songTitle: args?.songTitle || "Untitled",
    imageCount,
    estimatedCredits: credits,
    lyricsApproved: Boolean(args?.lyricsApproved || args?.lyricsStatus === "approved"),
    characterReferenceProvided: Boolean(args?.characterReferenceProvided),
    nextStep:
      name === LYRIC_VIDEO_FORGE_APP.toolNames.visualPlan
        ? "Open the Forge page, upload the reference, and generate the selected dissolve image plan."
        : "Collect audio and character reference, transcribe, then require user lyric approval before visuals.",
  };

  return {
    structuredContent,
    content: [
      {
        type: "text",
        text: `Lyric Video Forge is staged for ${structuredContent.artist} - ${structuredContent.songTitle}. Estimated credits: ${credits}.`,
      },
    ],
    _meta: {
      ui: { resourceUri: LYRIC_VIDEO_FORGE_APP.widgetUri },
      forge: structuredContent, securityBoundary: "Read-only MCP app. No destructive actions, no purchases, no external writes, no credentials, and no unrelated private user data requested.",
    },
  };
}

export async function handleLyricVideoForgeRpc(request: JsonRpcRequest, origin = "") {
  const id = request.id ?? null;
  const method = request.method || "";

  if (method === "initialize") {
    return ok(id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: "illco-lyric-video-forge", version: "1.0.0" },
    });
  }

  if (method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }

  if (method === "tools/list") {
    return ok(id, { tools: getLyricVideoForgeTools() });
  }

  if (method === "resources/list") {
    return ok(id, {
      resources: [
        {
          uri: LYRIC_VIDEO_FORGE_APP.widgetUri,
          name: LYRIC_VIDEO_FORGE_APP.title,
          title: LYRIC_VIDEO_FORGE_APP.title,
          description: LYRIC_VIDEO_FORGE_APP.description,
          mimeType: "text/html+skybridge",
          _meta: {
            "openai/widgetDescription": "Interactive Lyric Video Forge control panel for audio, lyric approval, credits, and dissolve visuals.",
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: [origin || "https://illco.tech"],
              resource_domains: [origin || "https://illco.tech"],
            },
          },
        },
      ],
    });
  }

  if (method === "resources/read") {
    const uri = request.params?.uri;
    if (uri !== LYRIC_VIDEO_FORGE_APP.widgetUri) return error(id, -32602, "Unknown resource URI.");
    return ok(id, {
      contents: [
        {
          uri,
          mimeType: "text/html+skybridge",
          text: buildWidgetHtml(origin),
        },
      ],
    });
  }

  if (method === "tools/call") {
    const name = request.params?.name;
    const args = request.params?.arguments || {};
    if (!Object.values(LYRIC_VIDEO_FORGE_APP.toolNames).includes(name)) return error(id, -32602, "Unknown Lyric Video Forge tool.");
    return ok(id, toolResult(name, args));
  }

  return error(id, -32601, `Unsupported MCP method: ${method}`);
}



