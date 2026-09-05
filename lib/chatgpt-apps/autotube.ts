import {
  AUTOTUBE_TOOL_NAME,
  AUTOTUBE_WIDGET_URI,
  normalizeAutoTubeRequest,
} from "@/lib/autotube/contracts";
import {
  AutoTubeServiceError,
  getAutoTubeConfigurationStatus,
  submitAutoTubeRender,
} from "@/lib/autotube/server";

export const AUTOTUBE_APP = {
  id: "autotube",
  title: "AutoTube Production",
  description:
    "Creates prospect-specific narrated outreach videos through server-side narration, off-device rendering, durable MP4 storage, and mobile-safe delivery.",
  toolName: AUTOTUBE_TOOL_NAME,
  widgetUri: AUTOTUBE_WIDGET_URI,
  serverName: "illco-autotube-production",
  serverVersion: "5.0.0",
};

const MCP_PROTOCOL_VERSION = "2025-06-18";
const APP_WIDGET_DOMAIN = "https://illcoai.tech";
const MCP_WIDGET_MIME_TYPE = "text/html;profile=mcp-app";

const AUTOTUBE_SECURITY_SCHEMES = [
  { type: "oauth2", scopes: ["profile"] },
];

const WIDGET_META = {
  ui: {
    domain: APP_WIDGET_DOMAIN,
    prefersBorder: true,
    csp: {
      connectDomains: [APP_WIDGET_DOMAIN],
      resourceDomains: [APP_WIDGET_DOMAIN],
    },
  },
  "openai/widgetDescription":
    "AutoTube production monitor with server-side narration, render progress, video preview, and direct MP4 download.",
  "openai/widgetCSP": {
    connect_domains: [APP_WIDGET_DOMAIN],
    resource_domains: [APP_WIDGET_DOMAIN],
  },
  "openai/outputTemplate": AUTOTUBE_WIDGET_URI,
};

const INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    prospect: {
      type: "string",
      minLength: 1,
      maxLength: 140,
      description: "Prospect, organization, or campaign name.",
    },
    offer: {
      type: "string",
      minLength: 1,
      maxLength: 500,
      description: "The workflow, service, or product demonstrated in the video.",
    },
    video_title: { type: "string", maxLength: 180 },
    pain_point: { type: "string", maxLength: 500 },
    call_to_action: { type: "string", maxLength: 220 },
    aspect_ratio: {
      type: "string",
      enum: ["landscape", "vertical", "square"],
      default: "landscape",
    },
    duration_seconds: { type: "number", minimum: 6, maximum: 120, default: 30 },
    brand_colors: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    },
    narration_script: {
      type: "string",
      maxLength: 6000,
      description: "Optional final narration. AutoTube combines scene narration when omitted.",
    },
    narration_audio_url: {
      type: "string",
      format: "uri",
      description:
        "Optional approved HTTPS narration file. AutoTube otherwise creates narration server-side with ElevenLabs.",
    },
    voice_id: {
      type: "string",
      maxLength: 160,
      description: "Optional approved ElevenLabs voice ID.",
    },
    scenes: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 140 },
          on_screen_text: { type: "string", maxLength: 260 },
          narration: { type: "string", maxLength: 900 },
          image_url: { type: "string", format: "uri" },
        },
        required: ["title", "on_screen_text"],
      },
    },
  },
  required: ["prospect", "offer"],
};

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    app: { type: "string" },
    version: { type: "string" },
    prospect: { type: "string" },
    videoTitle: { type: "string" },
    jobId: { type: "string" },
    status: { type: "string" },
    progress: { type: "number" },
    statusUrl: { type: "string" },
    videoUrl: { type: "string" },
    downloadUrl: { type: "string" },
    browserEncoding: { type: "boolean" },
    deliveryFormat: { type: "string" },
  },
  required: [
    "app",
    "version",
    "prospect",
    "videoTitle",
    "jobId",
    "status",
    "progress",
    "statusUrl",
    "videoUrl",
    "downloadUrl",
    "browserEncoding",
    "deliveryFormat",
  ],
};

function toolDefinition() {
  return {
    name: AUTOTUBE_TOOL_NAME,
    title: "Render AutoTube prospect video",
    description:
      "Create a complete prospect-specific outreach video. AutoTube generates narration on the server, submits full-HD composition to an off-device renderer, stores the MP4 durably, and returns mobile-safe preview and download links. Do not claim completion until render status is ready.",
    inputSchema: INPUT_SCHEMA,
    outputSchema: OUTPUT_SCHEMA,
    securitySchemes: AUTOTUBE_SECURITY_SCHEMES,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      ...WIDGET_META,
      securitySchemes: AUTOTUBE_SECURITY_SCHEMES,
      ui: { resourceUri: AUTOTUBE_WIDGET_URI, visibility: ["model", "app"] },
      "openai/toolInvocation/invoking": "Generating narration and starting the AutoTube render…",
      "openai/toolInvocation/invoked": "AutoTube render submitted. Tracking production status…",
    },
  };
}

function successToolOutput(request: ReturnType<typeof normalizeAutoTubeRequest>, job: Awaited<ReturnType<typeof submitAutoTubeRender>>) {
  const structuredContent = {
    app: AUTOTUBE_APP.id,
    version: AUTOTUBE_APP.serverVersion,
    prospect: request.prospect,
    videoTitle: request.videoTitle,
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    statusUrl: job.statusUrl,
    videoUrl: job.videoUrl,
    downloadUrl: job.downloadUrl,
    browserEncoding: false,
    deliveryFormat: "MP4/H.264/AAC",
  };
  return {
    structuredContent,
    content: [
      {
        type: "text",
        text: `AutoTube submitted ${request.videoTitle} for ${request.prospect}. Job ${job.jobId} is ${job.status}; completion is not verified until the production status reports ready.`,
      },
    ],
    _meta: {
      ui: { resourceUri: AUTOTUBE_WIDGET_URI },
      autotube: structuredContent,
      verificationRule:
        "Treat queued, processing, and rendering as incomplete. Only ready/completed plus a playable MP4 counts as verified.",
    },
  };
}

function failureToolOutput(error: unknown) {
  const serviceError =
    error instanceof AutoTubeServiceError
      ? error
      : new AutoTubeServiceError("AutoTube could not submit the render.", 500, "render_failed");
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `AutoTube did not start: ${serviceError.message}`,
      },
    ],
    _meta: {
      ui: { resourceUri: AUTOTUBE_WIDGET_URI },
      autotubeError: {
        code: serviceError.code,
        status: serviceError.status,
        message: serviceError.message,
      },
    },
  };
}

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

export async function handleAutoTubeRpc(body: any, origin: string) {
  const method = String(body?.method || "");
  const id = body?.id;

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
      serverInfo: { name: AUTOTUBE_APP.serverName, version: AUTOTUBE_APP.serverVersion },
      instructions:
        "Use autotube_render_video for complete prospect videos. Rendering is server-side and asynchronous. Never describe the video as finished until the returned status endpoint reports ready and the MP4 is playable.",
    });
  }

  if (method === "notifications/initialized") return null;
  if (method === "ping") return jsonRpcResult(id, {});

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: [toolDefinition()] });
  }

  if (method === "resources/list") {
    return jsonRpcResult(id, {
      resources: [
        {
          uri: AUTOTUBE_WIDGET_URI,
          name: "AutoTube Production Monitor",
          title: "AutoTube Production Monitor",
          description:
            "Tracks server-side narration, off-device rendering, durable video delivery, and direct MP4 downloads.",
          mimeType: MCP_WIDGET_MIME_TYPE,
          _meta: WIDGET_META,
        },
      ],
    });
  }

  if (method === "resources/read") {
    const uri = String(body?.params?.uri || "");
    if (uri !== AUTOTUBE_WIDGET_URI) {
      return jsonRpcError(id, -32002, `Unknown AutoTube resource: ${uri}`);
    }
    return jsonRpcResult(id, {
      contents: [
        {
          uri: AUTOTUBE_WIDGET_URI,
          mimeType: MCP_WIDGET_MIME_TYPE,
          text: buildAutoTubeWidgetHtml(origin),
          _meta: WIDGET_META,
        },
      ],
    });
  }

  if (method === "tools/call") {
    const name = String(body?.params?.name || "");
    if (name !== AUTOTUBE_TOOL_NAME) {
      return jsonRpcError(id, -32602, `Unknown AutoTube tool: ${name}`);
    }
    const args = body?.params?.arguments || {};
    const normalized = normalizeAutoTubeRequest(args);
    try {
      const job = await submitAutoTubeRender(normalized, origin);
      return jsonRpcResult(id, successToolOutput(normalized, job));
    } catch (error) {
      return jsonRpcResult(id, failureToolOutput(error));
    }
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}

export function buildAutoTubeWidgetHtml(origin: string) {
  const safeOrigin = JSON.stringify(origin);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>AutoTube Production</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#04110f;color:#f4fffb}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 82% 0%,rgba(22,224,165,.24),transparent 38%),linear-gradient(145deg,#020a09,#071d19 55%,#04110f);padding:18px}
.shell{max-width:980px;margin:0 auto;border:1px solid rgba(126,255,217,.2);background:rgba(3,18,15,.88);border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.38)}
header{display:flex;gap:16px;justify-content:space-between;align-items:flex-start;padding:22px;border-bottom:1px solid rgba(126,255,217,.14)}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#70f5ce}.title{font-size:clamp(24px,5vw,42px);font-weight:900;line-height:1;margin:7px 0 8px}.sub{margin:0;color:#a9c8bf;max-width:620px;line-height:1.5}
.badge{white-space:nowrap;border:1px solid rgba(112,245,206,.34);background:rgba(19,88,70,.32);padding:9px 12px;border-radius:999px;font-size:12px;font-weight:800;color:#a7ffe5}
main{padding:22px}.status{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:16px;border-radius:18px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}
.status strong{font-size:18px}.status p{margin:5px 0 0;color:#9cbdb4;font-size:13px}.percent{font-size:26px;font-weight:900;color:#70f5ce}.bar{height:10px;background:#0a2a22;border-radius:999px;overflow:hidden;margin:16px 0 22px}.bar span{display:block;height:100%;width:0;background:linear-gradient(90deg,#16e0a5,#7effd9);transition:width .4s ease}
video{display:none;width:100%;max-height:550px;background:#000;border-radius:18px;border:1px solid rgba(255,255,255,.1)}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.button{display:none;appearance:none;border:0;text-decoration:none;cursor:pointer;border-radius:13px;padding:13px 17px;font-weight:900;background:#16e0a5;color:#00130d}.button.secondary{background:rgba(255,255,255,.08);color:#effff9;border:1px solid rgba(255,255,255,.12)}
.log{margin-top:18px;border-top:1px solid rgba(255,255,255,.08);padding-top:15px;color:#88aaa0;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}.error{color:#ffaaa4}.ready{color:#7effd9}@media(max-width:640px){body{padding:0}.shell{border-radius:0;border-left:0;border-right:0;min-height:100vh}header,main{padding:18px}.status{grid-template-columns:1fr}.percent{font-size:22px}}
</style>
</head>
<body>
<section class="shell">
<header><div><div class="eyebrow">iLLCo AI · AutoTube 5</div><div class="title" id="title">Production render</div><p class="sub" id="subtitle">Waiting for the AutoTube render job. Encoding happens off-device—never on your phone.</p></div><div class="badge">MP4 · H.264 · AAC</div></header>
<main>
<div class="status"><div><strong id="state">Initializing</strong><p id="stage">Reading the production job…</p></div><div class="percent" id="percent">0%</div></div>
<div class="bar"><span id="bar"></span></div>
<video id="video" controls playsinline preload="metadata"></video>
<div class="actions"><a class="button" id="download">Download MP4</a><a class="button secondary" id="openVideo" target="_blank" rel="noopener">Open video</a></div>
<div class="log" id="log">AutoTube production monitor connected.</div>
</main>
</section>
<script>
const ORIGIN=${safeOrigin};
const els={title:document.getElementById('title'),subtitle:document.getElementById('subtitle'),state:document.getElementById('state'),stage:document.getElementById('stage'),percent:document.getElementById('percent'),bar:document.getElementById('bar'),video:document.getElementById('video'),download:document.getElementById('download'),openVideo:document.getElementById('openVideo'),log:document.getElementById('log')};
let current=null;let timer=null;
function log(message,isError=false){els.log.textContent=message;els.log.className='log'+(isError?' error':'')}
function number(value){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(0,Math.min(100,parsed)):0}
function render(data){if(!data)return;current=data;els.title.textContent=data.videoTitle||data.prospect||'AutoTube production';const progress=number(data.progress);els.percent.textContent=Math.round(progress)+'%';els.bar.style.width=progress+'%';const status=String(data.status||'queued').toLowerCase();els.state.textContent=status.replace(/_/g,' ');els.stage.textContent=data.stage||'Server-side production in progress';els.subtitle.textContent=data.prospect?'Producing a prospect-specific video for '+data.prospect+'. Encoding stays off-device.':'Encoding stays off-device and the finished MP4 is delivered from iLLCoAI.';
if(data.error){log(data.error,true)}else{log('Job '+(data.jobId||'pending')+' · '+status+' · '+Math.round(progress)+'%')}
if(data.ready||['ready','completed','complete','succeeded'].includes(status)){els.state.className='ready';els.percent.textContent='100%';els.bar.style.width='100%';els.video.src=data.videoUrl;els.video.style.display='block';els.download.href=data.downloadUrl;els.download.style.display='inline-flex';els.download.setAttribute('download','');els.openVideo.href=data.videoUrl;els.openVideo.style.display='inline-flex';log('Verified render status: ready. Confirm playback before delivery.');if(timer){clearTimeout(timer);timer=null}return}
if(status==='failed'){els.state.className='error';if(timer){clearTimeout(timer);timer=null}return}schedule()}
async function poll(){if(!current?.statusUrl)return;try{const response=await fetch(current.statusUrl,{cache:'no-store'});const body=await response.json();if(!response.ok||!body.ok)throw new Error(body.message||'Status request failed');render({...current,...body})}catch(error){log('Status check failed: '+error.message,true);schedule(5000)}}
function schedule(delay=2500){if(timer)clearTimeout(timer);timer=setTimeout(poll,delay)}
function extract(value){if(!value)return null;if(value.structuredContent)return value.structuredContent;if(value.autotube)return value.autotube;return value}
function accept(value){const data=extract(value);if(data?.statusUrl){render(data);return true}const metaError=value?._meta?.autotubeError||value?.autotubeError;if(metaError){els.state.textContent='Not started';els.state.className='error';els.stage.textContent=metaError.code||'configuration error';log(metaError.message||'AutoTube did not start.',true);return true}return false}
function loadGlobals(globals){return accept(globals?.toolOutput)||accept(globals?.structuredContent)||accept(globals?.toolResponse)}
window.addEventListener('openai:set_globals',event=>loadGlobals(event.detail?.globals||event.detail));
if(!loadGlobals(window.openai)){setTimeout(()=>{if(!loadGlobals(window.openai)){els.state.textContent='Waiting for render';els.stage.textContent='Run the AutoTube render tool to start production.'}},250)}
</script>
</body>
</html>`;
}

export function autoTubeHealth() {
  return {
    app: AUTOTUBE_APP,
    configuration: getAutoTubeConfigurationStatus(),
  };
}
