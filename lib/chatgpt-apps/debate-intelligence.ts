const MCP_PROTOCOL_VERSION = "2025-06-18";
const MCP_WIDGET_MIME_TYPE = "text/html;profile=mcp-app";

export const DEBATE_INTELLIGENCE_APP = {
  id: "debate-intelligence",
  title: "Debate Intelligence",
  serverName: "illco-debate-intelligence",
  serverVersion: "1.1.0",
  widgetUri: "ui://illco/debate-intelligence/studio-v1.html",
};

export type DebateJsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: any;
};

type ToolHandler = (args: any, origin: string) => Promise<any> | any;
type ToolEntry = { definition: any; handler: ToolHandler };

function toolResult(structuredContent: any, message: string, extraMeta: Record<string, any> = {}) {
  return {
    structuredContent,
    content: [{ type: "text", text: message }],
    _meta: {
      ui: { resourceUri: DEBATE_INTELLIGENCE_APP.widgetUri },
      "openai/outputTemplate": DEBATE_INTELLIGENCE_APP.widgetUri,
      ...extraMeta,
    },
  };
}

function toolMeta(invoking: string, invoked: string) {
  return {
    "openai/outputTemplate": DEBATE_INTELLIGENCE_APP.widgetUri,
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
    ui: {
      resourceUri: DEBATE_INTELLIGENCE_APP.widgetUri,
      visibility: ["model", "app"],
    },
  };
}

function sentences(text = "") {
  return text
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function analyzeTranscriptLocally(title: string, topic: string, transcript: string) {
  const rows = sentences(transcript);
  const speakerPattern = /^([A-Za-z][A-Za-z0-9 _.-]{0,40}):\s*(.+)$/;
  const speakerCounts = new Map<string, number>();
  const turns = rows.map((row, index) => {
    const match = row.match(speakerPattern);
    const speaker = match?.[1]?.trim() || "Speaker A";
    const text = match?.[2]?.trim() || row;
    speakerCounts.set(speaker, (speakerCounts.get(speaker) || 0) + 1);
    return { id: `turn-${index + 1}`, speaker, text };
  });

  const claimPattern = /\b(is|are|was|were|has|have|had|did|does|will|percent|million|billion|according to|report|study|data|number|rate)\b/i;
  const claims = turns
    .filter((turn) => claimPattern.test(turn.text))
    .slice(0, 20)
    .map((turn, index) => ({
      id: `claim-${index + 1}`,
      speaker: turn.speaker,
      claim: turn.text,
      verdict: "not_yet_reviewed",
    }));

  const rebuttalPattern = /\b(but|however|no,|that(?:'s| is) (?:not|false|wrong)|disagree|actually|instead|because)\b/i;
  const rebuttals = turns
    .filter((turn) => rebuttalPattern.test(turn.text))
    .slice(0, 20)
    .map((turn) => ({ speaker: turn.speaker, text: turn.text }));

  return {
    title,
    topic,
    transcript,
    transcriptWords: transcript.trim() ? transcript.trim().split(/\s+/).length : 0,
    turns,
    speakers: Array.from(speakerCounts, ([name, turnCount]) => ({ name, turnCount })),
    claims,
    rebuttals,
    factCheckStatus: claims.length ? "requires_external_verification" : "no_checkable_claims_detected",
    evidencePolicy: "No claim is marked true or false without external evidence.",
  };
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function youtubeVideoId(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0] || "")) return parts[1] || null;
    }
  } catch {
    return null;
  }
  return null;
}

function extractCaptionTracks(html: string): any[] {
  const marker = '"captionTracks":';
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const arrayStart = html.indexOf("[", start + marker.length);
  if (arrayStart < 0) return [];

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = arrayStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(arrayStart, index + 1));
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

async function fetchYoutubeCaptions(youtubeUrl: string, preferredLanguage = "English") {
  const videoId = youtubeVideoId(youtubeUrl);
  if (!videoId) return { videoId: null, status: "invalid_youtube_url", transcript: "", segments: [] as any[] };

  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`;
  const response = await fetch(watchUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; iLLCoAI-DebateIntelligence/1.1)" },
    cache: "no-store",
  });
  if (!response.ok) {
    return { videoId, status: `youtube_fetch_failed_${response.status}`, transcript: "", segments: [] as any[] };
  }

  const html = await response.text();
  const tracks = extractCaptionTracks(html);
  if (!tracks.length) return { videoId, status: "captions_unavailable", transcript: "", segments: [] as any[] };

  const languageNeedle = preferredLanguage.toLowerCase().slice(0, 2);
  const track =
    tracks.find((item) => String(item?.languageCode || "").toLowerCase().startsWith(languageNeedle)) ||
    tracks.find((item) => String(item?.languageCode || "").toLowerCase().startsWith("en")) ||
    tracks[0];

  const baseUrl = String(track?.baseUrl || "").replace(/\\u0026/g, "&");
  if (!baseUrl) return { videoId, status: "caption_track_missing_url", transcript: "", segments: [] as any[] };

  const captionUrl = baseUrl.includes("fmt=") ? baseUrl.replace(/fmt=[^&]+/, "fmt=json3") : `${baseUrl}&fmt=json3`;
  const captionResponse = await fetch(captionUrl, { cache: "no-store" });
  if (!captionResponse.ok) {
    return { videoId, status: `caption_fetch_failed_${captionResponse.status}`, transcript: "", segments: [] as any[] };
  }

  const raw = await captionResponse.text();
  try {
    const json = JSON.parse(raw);
    const segments = (json?.events || [])
      .map((event: any) => {
        const text = (event?.segs || []).map((segment: any) => segment?.utf8 || "").join("").replace(/\n/g, " ").trim();
        if (!text) return null;
        return {
          startMs: Number(event?.tStartMs || 0),
          durationMs: Number(event?.dDurationMs || 0),
          text,
        };
      })
      .filter(Boolean);
    const transcript = segments.map((segment: any) => segment.text).join(" ").replace(/\s+/g, " ").trim();
    return {
      videoId,
      status: transcript ? "ready" : "captions_empty",
      languageCode: track?.languageCode || null,
      transcript,
      segments,
    };
  } catch {
    const segments = Array.from(raw.matchAll(/<text[^>]*start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g)).map((match) => ({
      startMs: Math.round(Number(match[1]) * 1000),
      durationMs: 0,
      text: decodeHtml(match[2].replace(/<[^>]+>/g, "")).trim(),
    }));
    const transcript = segments.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim();
    return { videoId, status: transcript ? "ready" : "caption_parse_failed", transcript, segments };
  }
}

const entries: Array<[string, ToolEntry]> = [
  [
    "create_debate_project",
    {
      definition: {
        name: "create_debate_project",
        title: "Create debate project",
        description: "Initialize a Debate Intelligence project before adding media or a transcript.",
        inputSchema: {
          type: "object",
          properties: { title: { type: "string" }, topic: { type: "string" } },
          required: ["title"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false },
        _meta: toolMeta("Creating debate project…", "Debate project created"),
      },
      handler: async (args) => {
        const project = {
          id: `debate-${crypto.randomUUID()}`,
          title: String(args?.title || "Debate Intelligence Project"),
          topic: String(args?.topic || ""),
          status: "ready",
          createdAt: new Date().toISOString(),
        };
        return toolResult(project, `Debate Intelligence project created: ${project.title}`);
      },
    },
  ],
  [
    "analyze_debate_transcript",
    {
      definition: {
        name: "analyze_debate_transcript",
        title: "Analyze debate transcript",
        description: "Map speakers, claims, rebuttal signals, and evidence requirements from a complete transcript.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            topic: { type: "string" },
            transcript: { type: "string", minLength: 20, maxLength: 100000 },
            generate_visuals: { type: "boolean", default: true },
          },
          required: ["title", "transcript"],
          additionalProperties: true,
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
        _meta: toolMeta("Analyzing debate…", "Debate analyzed"),
      },
      handler: async (args) => {
        const analysis = analyzeTranscriptLocally(String(args?.title || "Debate"), String(args?.topic || ""), String(args?.transcript || ""));
        return toolResult(analysis, `Analyzed ${analysis.transcriptWords} transcript words without inventing evidence.`);
      },
    },
  ],
  [
    "fact_check_debate_claims",
    {
      definition: {
        name: "fact_check_debate_claims",
        title: "Fact-check debate claims",
        description: "Prepare factual claims for current source-backed verification without converting missing evidence into a false verdict.",
        inputSchema: {
          type: "object",
          properties: {
            context: { type: "string" },
            claims: {
              type: "array",
              minItems: 1,
              maxItems: 20,
              items: {
                type: "object",
                properties: {
                  id: { type: "string" }, speaker: { type: "string" }, timestamp: { type: "string" }, claim: { type: "string" },
                },
                required: ["claim"],
                additionalProperties: true,
              },
            },
          },
          required: ["claims"],
          additionalProperties: true,
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
        _meta: toolMeta("Preparing evidence checks…", "Claims prepared for verification"),
      },
      handler: async (args) => {
        const checked = (Array.isArray(args?.claims) ? args.claims : []).map((item: any, index: number) => ({
          id: String(item?.id || `claim-${index + 1}`),
          speaker: item?.speaker || null,
          timestamp: item?.timestamp || null,
          claim: String(item?.claim || ""),
          verdict: "not_yet_reviewed",
          evidence: [],
        }));
        return toolResult(
          { checked, status: "external_verification_required", context: String(args?.context || ""), evidencePolicy: "No evidence means not yet reviewed, not false." },
          `${checked.length} claim${checked.length === 1 ? "" : "s"} queued for external verification.`,
        );
      },
    },
  ],
  [
    "render_debate_studio",
    {
      definition: {
        name: "render_debate_studio",
        title: "Open Debate Intelligence Studio",
        description: "Open the interactive in-chat Debate Intelligence studio for media intake, transcript review, evidence, and analysis.",
        inputSchema: {
          type: "object",
          properties: { title: { type: "string" }, topic: { type: "string" } },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
        _meta: toolMeta("Opening Debate Intelligence Studio…", "Debate Intelligence Studio ready"),
      },
      handler: async (args, origin) => {
        const payload = {
          studioStatus: "ready",
          title: String(args?.title || "Debate Intelligence Studio"),
          topic: String(args?.topic || ""),
          widgetUrl: `${origin}/api/chatgpt/debate-intelligence/widget`,
          capabilities: ["media intake", "transcript review", "claim extraction", "evidence review", "YouTube captions when public captions are available"],
        };
        return toolResult(payload, "Debate Intelligence Studio is ready.");
      },
    },
  ],
  [
    "transcribe_debate_media",
    {
      definition: {
        name: "transcribe_debate_media",
        title: "Transcribe debate media",
        description: "Transcribe accessible media. Public YouTube URLs use exposed captions when available; unsupported media is reported as blocked rather than simulated.",
        inputSchema: {
          type: "object",
          properties: { media_url: { type: "string", format: "uri" }, language: { type: "string" }, prompt: { type: "string" } },
          required: ["media_url"],
          additionalProperties: true,
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
        _meta: toolMeta("Reading debate media…", "Media transcription checked"),
      },
      handler: async (args) => {
        const mediaUrl = String(args?.media_url || "");
        if (!youtubeVideoId(mediaUrl)) {
          return toolResult(
            { status: "blocked", reason: "This deployment currently accepts public YouTube caption tracks through this tool. Use the studio upload path for other audio/video." },
            "Direct media transcription is blocked for this URL type; use Debate Intelligence Studio upload.",
          );
        }
        const captions = await fetchYoutubeCaptions(mediaUrl, String(args?.language || "English"));
        return toolResult(captions, captions.status === "ready" ? `Recovered ${captions.segments.length} timed caption segments.` : `YouTube transcription status: ${captions.status}.`);
      },
    },
  ],
  [
    "run_debate_youtube_pipeline",
    {
      definition: {
        name: "run_debate_youtube_pipeline",
        title: "Run Debate Intelligence on YouTube",
        description: "Use a YouTube URL for end-to-end caption ingest and evidence-first transcript analysis, then open the studio output.",
        inputSchema: {
          type: "object",
          properties: {
            youtube_url: { type: "string", format: "uri" }, title: { type: "string" }, topic: { type: "string" }, language: { type: "string" }, fact_check: { type: "boolean", default: true }, generate_visuals: { type: "boolean", default: true },
          },
          required: ["youtube_url"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
        _meta: toolMeta("Running YouTube evidence pipeline…", "YouTube evidence pipeline complete"),
      },
      handler: async (args, origin) => {
        const youtubeUrl = String(args?.youtube_url || "");
        const title = String(args?.title || "YouTube Debate Intelligence");
        const topic = String(args?.topic || "");
        const captions = await fetchYoutubeCaptions(youtubeUrl, String(args?.language || "English"));
        if (captions.status !== "ready" || !captions.transcript) {
          return toolResult(
            {
              title,
              topic,
              youtubeUrl,
              videoId: captions.videoId,
              captionStatus: captions.status,
              pipelineStatus: "needs_studio_upload",
              widgetUrl: `${origin}/api/chatgpt/debate-intelligence/widget`,
              factCheckStatus: "not_started",
              visualsStatus: "studio_ready",
            },
            `Public captions were not available (${captions.status}). Open the studio and upload media to continue.`,
          );
        }
        const analysis = analyzeTranscriptLocally(title, topic, captions.transcript);
        return toolResult(
          {
            title,
            topic,
            youtubeUrl,
            videoId: captions.videoId,
            languageCode: captions.languageCode || null,
            captionStatus: "ready",
            segmentCount: captions.segments.length,
            transcript: captions.transcript,
            segments: captions.segments,
            analysis,
            pipelineStatus: "analyzed",
            factCheckRequested: args?.fact_check !== false,
            factCheckStatus: analysis.claims.length ? "requires_external_verification" : "no_checkable_claims_detected",
            visualsRequested: args?.generate_visuals !== false,
            visualsStatus: "studio_ready",
            widgetUrl: `${origin}/api/chatgpt/debate-intelligence/widget`,
          },
          `Recovered ${captions.segments.length} caption segments and analyzed ${analysis.transcriptWords} words. External claims remain unverified until sourced.`,
        );
      },
    },
  ],
  [
    "render_debate_video",
    {
      definition: {
        name: "render_debate_video",
        title: "Render debate video",
        description: "Render an analyzed debate project when the production renderer is connected.",
        inputSchema: { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"], additionalProperties: true },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false },
        _meta: toolMeta("Checking debate renderer…", "Debate renderer checked"),
      },
      handler: async (args) => toolResult({ status: "blocked", projectId: args?.project_id || null, reason: "Production renderer adapter is not connected in this Next.js deployment." }, "Video rendering is blocked until the renderer adapter is connected."),
    },
  ],
  [
    "run_debate_video_pipeline",
    {
      definition: {
        name: "run_debate_video_pipeline",
        title: "Run full debate video pipeline",
        description: "Run the full media-to-analysis-to-render pipeline when all production adapters are connected.",
        inputSchema: { type: "object", properties: { media_url: { type: "string" }, title: { type: "string" }, topic: { type: "string" } }, additionalProperties: true },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false },
        _meta: toolMeta("Checking full debate pipeline…", "Full debate pipeline checked"),
      },
      handler: async (args, origin) => {
        const mediaUrl = String(args?.media_url || "");
        if (youtubeVideoId(mediaUrl)) {
          const youtubeEntry = registry.get("run_debate_youtube_pipeline");
          return youtubeEntry!.handler({ youtube_url: mediaUrl, title: args?.title, topic: args?.topic, fact_check: true, generate_visuals: true }, origin);
        }
        return toolResult({ status: "blocked", reason: "Secure uploaded-media resolver and production renderer adapters are not yet connected in this route." }, "Full video pipeline is blocked for non-YouTube media until production adapters are connected.");
      },
    },
  ],
];

const registry = new Map<string, ToolEntry>(entries);

export const DEBATE_INTELLIGENCE_TOOL_NAMES = Array.from(registry.keys());

export function getDebateIntelligenceTools() {
  return Array.from(registry.values(), (entry) => entry.definition);
}

export function getDebateIntelligenceWidgetHtml(origin = "https://illcoai.tech") {
  const safeOrigin = origin.replace(/[^a-zA-Z0-9:/.\-_]/g, "");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#080b11;color:#f5f7fb;font:14px system-ui,-apple-system,sans-serif}main{padding:18px}.brand{font-size:22px;font-weight:900}.accent{color:#adff5f}.sub{color:#9ca8ba;margin:5px 0 16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.card{background:#121822;border:1px solid #283140;border-radius:14px;padding:13px}.k{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8591a3}.v{font-size:18px;font-weight:800;margin-top:5px}.status{display:inline-block;padding:4px 8px;border:1px solid #354254;border-radius:999px}.out{white-space:pre-wrap;word-break:break-word;max-height:380px;overflow:auto;font:12px ui-monospace,SFMono-Regular,monospace}</style></head><body><main><div class="brand">Debate Intelligence <span class="accent">Studio</span></div><div class="sub">Evidence-first analysis · iLLCoAI.Tech</div><div class="grid"><div class="card"><div class="k">MCP</div><div class="v status">READY</div></div><div class="card"><div class="k">Origin</div><div class="v" style="font-size:12px">${safeOrigin}</div></div><div class="card"><div class="k">Policy</div><div class="v" style="font-size:12px">No invented evidence</div></div></div><div class="card" style="margin-top:10px"><div class="k">Latest intelligence</div><pre class="out" id="out">Run a Debate Intelligence tool to populate this studio.</pre></div></main><script>function render(d){if(!d)return;document.getElementById('out').textContent=JSON.stringify(d,null,2)}window.addEventListener('message',e=>{const m=e.data;if(m?.method==='ui/notifications/tool-result')render(m.params?.structuredContent||m.params?.content)});if(window.openai?.toolOutput)render(window.openai.toolOutput);</script></body></html>`;
}

function ok(id: DebateJsonRpcRequest["id"], result: any) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(id: DebateJsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

export async function handleDebateIntelligenceRpc(body: DebateJsonRpcRequest, origin: string) {
  const id = body?.id ?? null;
  const method = String(body?.method || "");

  if (method === "initialize") {
    return ok(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: DEBATE_INTELLIGENCE_APP.serverName, version: DEBATE_INTELLIGENCE_APP.serverVersion },
      instructions: "Use the same canonical Debate Intelligence registry for tool discovery and execution. Prefer the YouTube pipeline for public YouTube links; open the studio when media upload or transcript review is needed. Never invent evidence or claim a blocked stage completed.",
    });
  }

  if (method === "notifications/initialized") return null;
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") return ok(id, { tools: getDebateIntelligenceTools() });

  if (method === "tools/call") {
    const name = String(body?.params?.name || "");
    const entry = registry.get(name);
    if (!entry) return rpcError(id, -32601, `Unknown tool: ${name}`);
    try {
      const result = await entry.handler(body?.params?.arguments || {}, origin);
      return ok(id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Debate Intelligence tool failed";
      return ok(id, {
        isError: true,
        content: [{ type: "text", text: message }],
        _meta: { ui: { resourceUri: DEBATE_INTELLIGENCE_APP.widgetUri } },
      });
    }
  }

  if (method === "resources/list") {
    return ok(id, {
      resources: [{ uri: DEBATE_INTELLIGENCE_APP.widgetUri, name: "Debate Intelligence Studio", mimeType: MCP_WIDGET_MIME_TYPE, description: "Interactive evidence-first Debate Intelligence studio." }],
    });
  }

  if (method === "resources/read") {
    const uri = String(body?.params?.uri || "");
    if (uri !== DEBATE_INTELLIGENCE_APP.widgetUri) return rpcError(id, -32602, `Unknown resource: ${uri}`);
    return ok(id, {
      contents: [{
        uri,
        mimeType: MCP_WIDGET_MIME_TYPE,
        text: getDebateIntelligenceWidgetHtml(origin),
        _meta: {
          ui: { domain: origin, prefersBorder: true, csp: { connectDomains: [origin], resourceDomains: [origin] } },
          "openai/widgetDescription": "Interactive Debate Intelligence studio for transcript, claim, evidence, and YouTube analysis.",
          "openai/outputTemplate": DEBATE_INTELLIGENCE_APP.widgetUri,
        },
      }],
    });
  }

  return rpcError(id, -32601, `Method not found: ${method}`);
}
