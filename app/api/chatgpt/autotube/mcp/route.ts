import {
  AUTOTUBE_OAUTH_METADATA,
  AUTOTUBE_OAUTH_RESOURCE,
  AUTOTUBE_REQUIRED_SCOPE,
  authorizeAutoTubeOAuth,
  autoTubeMcpAccessResult,
} from "@/lib/autotube/access";
import {
  AUTOTUBE_OPENMONTAGE_TOOL_NAME,
  openMontageBridgeToolDefinitions,
  openMontageBridgeToolOutput,
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
    const names = new Set(result.result.tools.map((tool: any) => String(tool?.name || "")));
    for (const tool of [openMontageToolDefinition(), ...openMontageBridgeToolDefinitions()]) {
      if (!names.has(tool.name)) result.result.tools.push(tool);
    }
  }
  return result;
}

const OPENMONTAGE_BRIDGE_TOOL_NAMES = new Set(
  openMontageBridgeToolDefinitions().map((tool: any) => String(tool.name)),
);

export async function GET(request: Request) {
  const origin = originFrom(request);
  return Response.json(
    {
      name: "illco-autotube-production",
      description:
        "ChatGPT Apps SDK MCP endpoint for AutoTube 4 rendering, OpenMontage media ingest, tools, and skill resources.",
      version: "5.3.0-autotube4-openmontage-tools-skills",
      endpoint: "/api/chatgpt/autotube/mcp",
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
        openMontageBridge: {
          enabled: true,
          tools: openMontageBridgeToolDefinitions().map((tool: any) => tool.name),
          operations: ["list-tools", "inspect-tool-schema", "execute-available-tool", "list-skills", "read-skill-file"],
        },
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

  if (method === "tools/call" && OPENMONTAGE_BRIDGE_TOOL_NAMES.has(toolName)) {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: body?.id ?? null,
        result: await openMontageBridgeToolOutput(toolName, body?.params?.arguments || {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await handleAutoTubeRpcV4(body, originFrom(request));
  if (result === null) return new Response(null, { status: 202 });

  if (method === "tools/list") withOpenMontageTool(result);
  if (method === "initialize" && result?.result) {
    result.result.instructions = `${String(result.result.instructions || "")} Use ${AUTOTUBE_OPENMONTAGE_TOOL_NAME} for permitted reference-video ingest. For OpenMontage capabilities, first call openmontage_list_tools, inspect the selected tool with openmontage_get_tool, and read its associated skills using openmontage_list_skills/openmontage_read_skill before execution. The bridge exposes tools installed in the worker; unavailable tools remain blocked. Obtain explicit user approval for paid or side-effecting operations.`.trim();
    if (result.result.serverInfo) {
      result.result.serverInfo.version = "5.3.0-autotube4-openmontage-tools-skills";
    }
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
