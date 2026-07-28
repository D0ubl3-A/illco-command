import assert from "node:assert/strict";
import test from "node:test";

import {
  CHATGPT_OAUTH_RESOURCE,
  getOAuthAuthorizeUrl,
  getOAuthTokenUrl,
} from "../lib/chatgpt-oauth";
import {
  getLyricVideoForgeTools,
  LYRIC_VIDEO_FORGE_APP,
} from "../lib/chatgpt-apps/lyric-video-forge";

const CANONICAL_ORIGIN = "https://illcoai.tech";

test("Lyric Video Forge advertises the canonical apex MCP resource", () => {
  assert.equal(
    CHATGPT_OAUTH_RESOURCE,
    `${CANONICAL_ORIGIN}/api/chatgpt/lyric-video-forge/mcp`,
  );
  assert.equal(getOAuthAuthorizeUrl(CANONICAL_ORIGIN), `${CANONICAL_ORIGIN}/api/oauth/authorize`);
  assert.equal(getOAuthTokenUrl(CANONICAL_ORIGIN), `${CANONICAL_ORIGIN}/api/oauth/token`);
});

test("every Lyric Video Forge tool publishes OAuth at the descriptor and compatibility layers", () => {
  const tools = getLyricVideoForgeTools();
  assert.equal(tools.length, Object.keys(LYRIC_VIDEO_FORGE_APP.toolNames).length);

  for (const tool of tools) {
    const descriptorSchemes = tool.securitySchemes;
    const compatibilitySchemes = tool._meta.securitySchemes;

    assert.ok(Array.isArray(descriptorSchemes), `${tool.name} needs descriptor securitySchemes`);
    assert.deepEqual(
      descriptorSchemes,
      compatibilitySchemes,
      `${tool.name} security declarations must agree`,
    );
    assert.equal(descriptorSchemes[0]?.resource, CHATGPT_OAUTH_RESOURCE);
    assert.equal(
      descriptorSchemes[0]?.authorizationUrl,
      `${CANONICAL_ORIGIN}/api/oauth/authorize`,
    );
    assert.equal(descriptorSchemes[0]?.tokenUrl, `${CANONICAL_ORIGIN}/api/oauth/token`);
  }
});

test("start tool schema contains one artist property", () => {
  const start = getLyricVideoForgeTools().find(
    (tool) => tool.name === LYRIC_VIDEO_FORGE_APP.toolNames.start,
  );
  assert.ok(start);
  assert.equal(Object.keys(start.inputSchema.properties).filter((key) => key === "artist").length, 1);
});
