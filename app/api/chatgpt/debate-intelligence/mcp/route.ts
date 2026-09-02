import {
  DEBATE_INTELLIGENCE_APP,
  DEBATE_INTELLIGENCE_TOOL_NAMES,
  handleDebateIntelligenceRpc,
} from "@/lib/chatgpt-apps/debate-intelligence";

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
      name: "iLLCoAI Debate Intelligence",
      status: "ready",
      version: DEBATE_INTELLIGENCE_APP.serverVersion,
      endpoint: "/api/chatgpt/debate-intelligence/mcp",
      mcpUrl: `${origin}/api/chatgpt/debate-intelligence/mcp`,
      widgetUrl: `${origin}/api/chatgpt/debate-intelligence/widget`,
      tools: DEBATE_INTELLIGENCE_TOOL_NAMES,
      registryMode: "canonical-list-and-call",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await handleDebateIntelligenceRpc(body, originFrom(request));
  if (result === null) return new Response(null, { status: 202 });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
