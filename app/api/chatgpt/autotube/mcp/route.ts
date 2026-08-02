import {
  AUTOTUBE_OAUTH_METADATA,
  AUTOTUBE_OAUTH_RESOURCE,
  AUTOTUBE_REQUIRED_SCOPE,
  authorizeAutoTubeOAuth,
  autoTubeMcpAccessResult,
} from "@/lib/autotube/access";
import {
  autoTubeHealthV4,
  handleAutoTubeRpcV4,
} from "@/lib/chatgpt-apps/autotube-runtime-v4";

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
        "ChatGPT Apps SDK MCP endpoint for authenticated AutoTube 4 style planning, quality-gated rendering, status, preview, and MP4 delivery.",
      version: "5.1.0-autotube4",
      mcpUrl: `${origin}/api/chatgpt/autotube/mcp`,
      widgetUrl: `${origin}/api/chatgpt/autotube/widget`,
      renderUrl: `${origin}/api/autotube/render`,
      oauth: {
        resource: AUTOTUBE_OAUTH_RESOURCE,
        resourceMetadata: AUTOTUBE_OAUTH_METADATA,
        requiredScope: AUTOTUBE_REQUIRED_SCOPE,
      },
      health: autoTubeHealthV4(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (String(body?.method || "") === "tools/call") {
    const access = await authorizeAutoTubeOAuth(request);
    if (!access.ok) {
      return Response.json(autoTubeMcpAccessResult(body?.id, access), {
        headers: { "Cache-Control": "no-store" },
      });
    }
  }

  const result = await handleAutoTubeRpcV4(body, originFrom(request));
  if (result === null) return new Response(null, { status: 202 });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
