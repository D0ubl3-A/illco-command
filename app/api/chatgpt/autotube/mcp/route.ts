import {
  AUTOTUBE_OAUTH_METADATA,
  AUTOTUBE_OAUTH_RESOURCE,
  AUTOTUBE_REQUIRED_SCOPE,
  authorizeAutoTubeOAuth,
  autoTubeMcpAccessResult,
} from "@/lib/autotube/access";
import {
  AUTOTUBE_OPENMONTAGE_TOOL_NAME,
  openMontageToolDefinition,
  openMontageToolOutput,
  openMontageWorkerHealth,
} from "@/lib/chatgpt-apps/autotube-openmontage";
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

function withOpenMontageTool(result: any) {
  if (Array.isArray(result?.result?.tools)) {
    const exists = result.result.tools.some(
      (tool: any) => String(tool?.name || "") === AUTOTUBE_OPENMONTAGE_TOOL_NAME,
    );
    if (!exists) result.result.tools.push(openMontageToolDefinition());
  }
  return result;
}

export async function GET(request: Request) {
  const origin = originFrom(request);
  return Response.json(
    {
      name: "illco-autotube-production",
      description:
        "ChatGPT Apps SDK MCP endpoint for AutoTube 4 rendering plus real OpenMontage reference-video ingest.",
      version: "5.3.0-autotube4-openmontage-worker",
      mcpUrl: `${origin}/api/chatgpt/autotube/mcp`,
      widgetUrl: `${origin}/api/chatgpt/autotube/widget`,
      renderUrl: `${origin}/api/autotube/render`,
      oauth: {
        resource: AUTOTUBE_OAUTH_RESOURCE,
        resourceMetadata: AUTOTUBE_OAUTH_METADATA,
        requiredScope: AUTOTUBE_REQUIRED_SCOPE,
      },
      integrations: {
        openMontage: openMontageWorkerHealth(),
      },
      health: {
        ...autoTubeHealthV4(),
        openMontage: openMontageWorkerHealth(),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const method = String(body?.method || "");
  const toolName = String(body?.params?.name || "");

  if (method === "tools/call") {
    const access = await authorizeAutoTubeOAuth(request);
    if (!access.ok) {
      return Response.json(autoTubeMcpAccessResult(body?.id, access), {
        headers: { "Cache-Control": "no-store" },
      });
    }
  }

  if (method === "tools/call" && toolName === AUTOTUBE_OPENMONTAGE_TOOL_NAME) {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: body?.id ?? null,
        result: await openMontageToolOutput(
          body?.params?.arguments || {},
          originFrom(request),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await handleAutoTubeRpcV4(body, originFrom(request));
  if (result === null) return new Response(null, { status: 202 });

  if (method === "tools/list") withOpenMontageTool(result);
  if (method === "initialize" && result?.result) {
    result.result.instructions = `${String(result.result.instructions || "")} Use ${AUTOTUBE_OPENMONTAGE_TOOL_NAME} when a user supplies a permitted reference video that should be downloaded and analyzed before clipping or rendering.`.trim();
    if (result.result.serverInfo) {
      result.result.serverInfo.version = "5.3.0-autotube4-openmontage-worker";
    }
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
