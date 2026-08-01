import { autoTubeHealth, handleAutoTubeRpc } from "@/lib/chatgpt-apps/autotube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function originFrom(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  const origin = originFrom(request);
  return Response.json(
    {
      name: "illco-autotube-production",
      description:
        "ChatGPT Apps SDK MCP endpoint for server-side AutoTube narration, rendering, status, preview, and MP4 delivery.",
      version: "5.0.0",
      mcpUrl: `${origin}/api/chatgpt/autotube/mcp`,
      widgetUrl: `${origin}/api/chatgpt/autotube/widget`,
      renderUrl: `${origin}/api/autotube/render`,
      health: autoTubeHealth(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await handleAutoTubeRpc(body, originFrom(request));
  if (result === null) return new Response(null, { status: 202 });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
