import type { Metadata } from "next";

import { MemeMcpConsole } from "@/components/meme-mcp-console";

export const metadata: Metadata = {
  title: "Meme MCP Server",
  description:
    "ILLCO Command webapp for the deployed Meme MCP Server, ChatGPT custom app setup, live tool discovery, and monetized meme generation checks.",
};

export const dynamic = "force-dynamic";

export default function MemeMcpServerPage() {
  return (
    <div className="fallbackPage appLandingPage">
      <div className="workspace appLandingWorkspace memeMcpWorkspace">
        <nav className="appLandingNav" aria-label="Meme MCP navigation">
          <a className="brandBlock" href="/tools">
            <span className="brandGlyph">IC</span>
            <strong>ILLCO Tools</strong>
          </a>
          <div>
            <a className="button secondary" href="/tools">Back to Tools</a>
            <a className="button secondary" href="/commander">Commander</a>
            <a className="button primary" href="#meme-mcp-generator">Generate Test</a>
          </div>
        </nav>

        <MemeMcpConsole />
      </div>
    </div>
  );
}
