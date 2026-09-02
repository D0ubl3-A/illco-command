import assert from "node:assert/strict";
import test from "node:test";

import {
  DEBATE_INTELLIGENCE_APP,
  DEBATE_INTELLIGENCE_TOOL_NAMES,
  getDebateIntelligenceTools,
  handleDebateIntelligenceRpc,
} from "../lib/chatgpt-apps/debate-intelligence";

const origin = "https://illcoai.tech";

test("Debate Intelligence advertises every canonical callable tool", async () => {
  const listed = await handleDebateIntelligenceRpc(
    { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    origin,
  );
  const listedNames = new Set((listed as any).result.tools.map((tool: any) => tool.name));

  assert.deepEqual(
    [...listedNames].sort(),
    [...DEBATE_INTELLIGENCE_TOOL_NAMES].sort(),
  );
  assert.equal(getDebateIntelligenceTools().length, DEBATE_INTELLIGENCE_TOOL_NAMES.length);
  assert.ok(listedNames.has("render_debate_studio"));
  assert.ok(listedNames.has("run_debate_youtube_pipeline"));
});

test("render_debate_studio is executable, not list-only", async () => {
  const response = await handleDebateIntelligenceRpc(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "render_debate_studio",
        arguments: { title: "Robot Incident", topic: "Factory robot safety" },
      },
    },
    origin,
  );

  assert.equal((response as any).error, undefined);
  assert.equal((response as any).result.structuredContent.studioStatus, "ready");
  assert.equal(
    (response as any).result._meta.ui.resourceUri,
    DEBATE_INTELLIGENCE_APP.widgetUri,
  );
});

test("Debate Intelligence studio resource is readable as an MCP app widget", async () => {
  const response = await handleDebateIntelligenceRpc(
    {
      jsonrpc: "2.0",
      id: 3,
      method: "resources/read",
      params: { uri: DEBATE_INTELLIGENCE_APP.widgetUri },
    },
    origin,
  );

  const content = (response as any).result.contents[0];
  assert.equal(content.uri, DEBATE_INTELLIGENCE_APP.widgetUri);
  assert.equal(content.mimeType, "text/html;profile=mcp-app");
  assert.match(content.text, /Debate Intelligence/);
  assert.match(content.text, /No invented evidence/);
});

test("unknown tools fail explicitly instead of drifting into resource errors", async () => {
  const response = await handleDebateIntelligenceRpc(
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "not_a_real_tool", arguments: {} },
    },
    origin,
  );

  assert.equal((response as any).error.code, -32601);
  assert.match((response as any).error.message, /Unknown tool/);
});
