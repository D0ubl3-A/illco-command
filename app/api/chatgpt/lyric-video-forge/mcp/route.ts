import { handleLyricVideoForgeRpc } from "@/lib/chatgpt-apps/lyric-video-forge";

export const dynamic = "force-dynamic";

function originFrom(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  const origin = originFrom(request);
  return Response.json({
    name: "illco-lyric-video-forge",
    description: "ChatGPT Apps SDK MCP endpoint for Lyric Video Forge.",
    imageUrl: `${origin}/images/lyric-video-forge-credits.png`,
    mcpUrl: `${origin}/api/chatgpt/lyric-video-forge/mcp`,
    sseUrl: `${origin}/api/chatgpt/lyric-video-forge/sse`,
    widgetUrl: `${origin}/api/chatgpt/lyric-video-forge/widget`,
    setupHelp: {
      mcp: "Use as MCP URL in ChatGPT app setup.",
      sse: "Use SSE URL only if your connector form asks for SSE server mode.",
      widget: "Optional widget preview URL shown in app context panels.",
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return handleLyricVideoForgeRpc(body, originFrom(request));
}


