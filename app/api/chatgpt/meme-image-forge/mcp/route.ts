export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MCP_PROTOCOL_VERSION = "2025-06-18";
const WIDGET_URI = "ui://illco/meme-image-forge/v1.html";
const WIDGET_MIME_TYPE = "text/html;profile=mcp-app";
const APP_TITLE = "Meme Image Forge";
const APP_DESCRIPTION = "Create finished meme images from a topic, tone, audience, and platform.";

function corsHeaders(contentType = "application/json") {
  return {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version",
    "Cache-Control": "no-store",
  };
}

function originFrom(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function ok(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result }, { headers: corsHeaders() });
}

function error(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status: code === -32601 ? 404 : 400, headers: corsHeaders() });
}

function title(value: unknown) {
  return String(value || "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function platformNote(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("facebook")) return "Post it where the comments can argue with each other.";
  if (p.includes("instagram")) return "Use it as a square post or the first carousel slide.";
  if (p.includes("tiktok")) return "Use it under a zoom-in with the caption doing the setup.";
  if (p.includes("linkedin")) return "Keep it safe enough for work and sharp enough for replies.";
  return "Post it while the joke is still fresh.";
}

function makeMemes(args: any) {
  const topic = String(args?.topic || "the internet").trim();
  const audience = String(args?.audience || "everyone").trim();
  const tone = String(args?.tone || "playful").trim();
  const platform = String(args?.platform || "social").trim();
  const style = String(args?.style || "balanced").trim();
  const requested = Math.min(Math.max(Number(args?.count || 1), 1), 12);
  const delivered = 1;
  const upper = topic.toUpperCase();
  const toneMap: Record<string, string> = {
    savage: "AND SOMEHOW EVERYONE IS STILL WRONG",
    deadpan: "THIS IS APPARENTLY NORMAL NOW",
    absurd: "THE PLOT HAS LEFT THE BUILDING",
    wholesome: "AT LEAST WE ARE ALL CONFUSED TOGETHER",
    educational: "SAVE THIS BEFORE THE COMMENTS GET LOUD",
    playful: "THE GROUP CHAT WAS NOT READY",
  };
  const bottom = toneMap[tone.toLowerCase()] || toneMap.playful;
  return {
    topic,
    platform,
    tone,
    style,
    requested_count: requested,
    delivered_count: delivered,
    free_tier_policy: "Free users get one rendered meme image per day. Extra generations must happen outside ChatGPT after review-safe purchase or ad flows are approved.",
    monetization: {
      tier: "free",
      remaining_free: 0,
      request_cost_usd: 0,
      overLimit: false,
    },
    memes: [
      {
        topic,
        meme_format: style && style.toLowerCase() !== "balanced" ? title(style) : "Two Buttons",
        top_text: upper,
        bottom_text: bottom,
        caption_variants: [
          `${title(tone)} ${title(platform)} post: ${upper} - ${bottom}.`,
          `${platformNote(platform)} Audience: ${audience}.`,
        ],
        safety_note: "Safe-for-work topical meme. Avoid private individuals and unverifiable claims.",
      },
    ],
  };
}

function encodePayload(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function svgFor(meme: any, platform: string) {
  const safeTop = String(meme.top_text || "MEME").replace(/[&<>"]/g, "");
  const safeBottom = String(meme.bottom_text || "POST IT").replace(/[&<>"]/g, "");
  const safeFormat = String(meme.meme_format || "Meme").replace(/[&<>"]/g, "");
  const safePlatform = String(platform || "social").replace(/[&<>"]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#ffc440"/><circle cx="980" cy="170" r="180" fill="#111814" opacity=".08"/><rect x="110" y="230" width="980" height="680" rx="54" fill="#fff" stroke="#161814" stroke-width="18"/><rect x="160" y="285" width="880" height="560" rx="34" fill="#ffc440" stroke="#161814" stroke-width="10"/><circle cx="600" cy="530" r="170" fill="#fff8df" stroke="#161814" stroke-width="14"/><circle cx="540" cy="490" r="25" fill="#161814"/><circle cx="660" cy="490" r="25" fill="#161814"/><path d="M505 602 C565 660 690 660 740 590" fill="none" stroke="#161814" stroke-width="24" stroke-linecap="round"/><text x="600" y="125" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="74" font-weight="900" fill="#fff" stroke="#111" stroke-width="14" paint-order="stroke fill">${safeTop.slice(0, 34)}</text><text x="600" y="1015" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="66" font-weight="900" fill="#fff" stroke="#111" stroke-width="14" paint-order="stroke fill">${safeBottom.slice(0, 38)}</text><rect x="160" y="1070" width="880" height="58" rx="29" fill="#161814"/><text x="600" y="1109" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="900" fill="#fff">${safeFormat} / ${safePlatform} / Meme Image Forge</text></svg>`;
}

function attachImages(result: any, origin: string) {
  result.memes = result.memes.map((meme: any, index: number) => {
    const svg = svgFor(meme, result.platform);
    const data = Buffer.from(svg, "utf8").toString("base64");
    const imageUrl = `${origin}/api/chatgpt/meme-image-forge/image?m=${encodeURIComponent(encodePayload({ ...meme, platform: result.platform, index }))}`;
    return { ...meme, image_url: imageUrl, download_url: imageUrl, image_data_base64: data, asset_type: "image/svg+xml", mime_type: "image/svg+xml", width: 1200, height: 1200 };
  });
  return result;
}

function widgetHtml(origin: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{margin:0;font-family:Arial,sans-serif;background:linear-gradient(135deg,#fff8df,#eaf7ff);color:#161814}main{padding:18px}.card{border:2px solid #161814;border-radius:22px;background:#fff;box-shadow:6px 6px 0 #161814;padding:18px}h1{font-size:42px;line-height:.9;margin:0 0 10px}img{width:100%;border:2px solid #161814;border-radius:18px;background:#ffc440}.muted{opacity:.7}</style></head><body><main><section class="card"><h1>Meme Image Forge</h1><p class="muted">Generated meme images render here after a ChatGPT tool call.</p><div id="out">Run Generate Memes in ChatGPT.</div></section></main><script>function render(){var o=window.openai?.toolOutput||window.openai?.structuredContent||{};var m=Array.isArray(o.memes)?o.memes[0]:null;document.getElementById('out').innerHTML=m?'<img src="'+m.image_url+'" alt="Generated meme"/><p>'+m.top_text+' - '+m.bottom_text+'</p>':'Run Generate Memes in ChatGPT.';}render();window.addEventListener('message',render);</script></body></html>`;
}

const tool = {
  name: "generate_memes",
  title: "Generate Memes",
  description: "Use this when the user wants a finished meme image from a topic, tone, platform, and audience.",
  inputSchema: {
    type: "object",
    properties: {
      topic: { type: "string", description: "Main meme topic." },
      audience: { type: "string", default: "general" },
      tone: { type: "string", default: "playful" },
      platform: { type: "string", default: "social" },
      count: { type: "number", minimum: 1, maximum: 12, default: 1 },
      style: { type: "string", default: "balanced" },
    },
    required: ["topic"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      topic: { type: "string" },
      platform: { type: "string" },
      tone: { type: "string" },
      style: { type: "string" },
      requested_count: { type: "number" },
      delivered_count: { type: "number" },
      free_tier_policy: { type: "string" },
      monetization: {
        type: "object",
        properties: {
          tier: { type: "string" },
          remaining_free: { type: "number" },
          request_cost_usd: { type: "number" },
          overLimit: { type: "boolean" },
        },
        required: ["tier", "remaining_free", "request_cost_usd", "overLimit"],
        additionalProperties: false,
      },
      memes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            meme_format: { type: "string" },
            top_text: { type: "string" },
            bottom_text: { type: "string" },
            caption_variants: { type: "array", items: { type: "string" } },
            safety_note: { type: "string" },
            image_url: { type: "string" },
            download_url: { type: "string" },
            image_data_base64: { type: "string" },
            asset_type: { type: "string" },
            mime_type: { type: "string" },
            width: { type: "number" },
            height: { type: "number" },
          },
          required: ["topic", "meme_format", "top_text", "bottom_text", "caption_variants", "safety_note", "image_url", "download_url", "image_data_base64", "asset_type", "mime_type", "width", "height"],
          additionalProperties: false,
        },
      },
    },
    required: ["topic", "platform", "tone", "style", "requested_count", "delivered_count", "free_tier_policy", "monetization", "memes"],
    additionalProperties: false,
  },  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: false },
  securitySchemes: [{ type: "noauth" }],
  _meta: {
    securitySchemes: [{ type: "noauth" }],
    "openai/toolInvocation/invoking": "Generating meme image",
    "openai/toolInvocation/invoked": "Meme image ready",
    "openai/outputTemplate": WIDGET_URI,
  },
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  return Response.json({ ok: true, name: "meme-image-forge", mcp_url: `${originFrom(request)}/api/chatgpt/meme-image-forge/mcp` }, { headers: corsHeaders() });
}

export async function POST(request: Request) {
  const origin = originFrom(request);
  let body: any = {};
  try { body = await request.json(); } catch { return error(null, -32600, "Invalid JSON-RPC request."); }
  const id = body?.id ?? null;
  const method = body?.method || "";
  if (id === null || id === undefined) return new Response(null, { status: 202, headers: corsHeaders() });

  if (method === "initialize") {
    return ok(id, { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: { tools: {}, resources: {} }, serverInfo: { name: "meme-image-forge", title: APP_TITLE, version: "1.0.0" }, instructions: "Create finished meme images. Free public-review mode returns one rendered meme image per call." });
  }
  if (method === "notifications/initialized") return new Response(null, { status: 202, headers: corsHeaders() });
  if (method === "tools/list") return ok(id, { tools: [tool] });
  if (method === "resources/list") return ok(id, { resources: [{ uri: WIDGET_URI, name: "meme-image-forge-widget", title: APP_TITLE, description: APP_DESCRIPTION, mimeType: WIDGET_MIME_TYPE }] });
  if (method === "resources/read") return ok(id, { contents: [{ uri: WIDGET_URI, mimeType: WIDGET_MIME_TYPE, text: widgetHtml(origin), _meta: { "openai/widgetDescription": "Renders finished meme image results.", "openai/widgetPrefersBorder": true, "openai/widgetCSP": { connect_domains: [origin], resource_domains: [origin] }, "openai/widgetDomain": origin } }] });
  if (method === "tools/call") {
    const name = body?.params?.name;
    if (name !== "generate_memes") return error(id, -32602, "Unknown tool.");
    const result = attachImages(makeMemes(body?.params?.arguments || {}), origin);
    return ok(id, { structuredContent: result, content: [{ type: "text", text: `Rendered ${result.delivered_count} meme image for ${result.topic}.` }, ...result.memes.map((meme: any) => ({ type: "image", data: meme.image_data_base64, mimeType: meme.mime_type }))], _meta: result });
  }
  return error(id, -32601, `Unsupported MCP method: ${method}`);
}