import { NextResponse } from "next/server";

import { routeIllcoAgent } from "@/lib/illco-agent-registry";
import { runMasterAgent } from "@/lib/master-agent";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { message?: unknown };
  const message = String(body.message || "").trim();

  if (!message) {
    return NextResponse.json({ detail: "Message is required." }, { status: 400 });
  }

  const mcp = routeIllcoAgent(message);
  const catalog = runMasterAgent({ message, mode: "route", limit: 4 });
  const best = mcp.best;

  return NextResponse.json({
    ok: true,
    message,
    route: best
      ? {
          id: best.id,
          name: best.name,
          description: best.description,
          launchHref: best.launchHref,
          mcpUrl: best.mcpUrl || null,
          widgetUrl: best.widgetUrl || null,
          tools: best.tools,
          status: best.status,
          score: best.score,
          evidence: best.evidence,
        }
      : null,
    alternatives: mcp.alternatives.map((target) => ({
      id: target.id,
      name: target.name,
      description: target.description,
      launchHref: target.launchHref,
      status: target.status,
      score: target.score,
    })),
    catalog: {
      summary: catalog.summary,
      recommendations: catalog.recommendations.slice(0, 4).map((item) => ({
        id: item.id,
        name: item.name,
        summary: item.summary,
        detailsHref: item.detailsHref,
        openHref: item.openHref,
        canOpen: item.canOpen,
        canCheckout: item.canCheckout,
        reason: item.reason,
      })),
    },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "iLLCo Home Agent",
    description: "Routes natural-language requests to the best iLLCo MCP app, widget, connected service, and storefront product.",
  });
}
