import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTOTUBE_OAUTH_METADATA,
  AUTOTUBE_REQUIRED_SCOPE,
  autoTubeAccessResponse,
  autoTubeMcpAccessResult,
  isAutoTubeEmailAllowed,
} from "../lib/autotube/access";

test("AutoTube allows trusted administrators without a separate beta list", () => {
  assert.equal(isAutoTubeEmailAllowed("ADMIN@ILLCOAI.TECH"), true);
  assert.equal(isAutoTubeEmailAllowed("unlisted@example.com"), false);
});

test("AutoTube supports an explicit beta and customer email allowlist", () => {
  const previous = process.env.AUTOTUBE_ALLOWED_EMAILS;
  process.env.AUTOTUBE_ALLOWED_EMAILS = "buyer@example.com, second@example.com";
  try {
    assert.equal(isAutoTubeEmailAllowed(" buyer@example.com "), true);
    assert.equal(isAutoTubeEmailAllowed("SECOND@example.com"), true);
    assert.equal(isAutoTubeEmailAllowed("not-listed@example.com"), false);
  } finally {
    if (previous === undefined) delete process.env.AUTOTUBE_ALLOWED_EMAILS;
    else process.env.AUTOTUBE_ALLOWED_EMAILS = previous;
  }
});

test("unauthenticated AutoTube HTTP responses advertise OAuth metadata", async () => {
  const response = autoTubeAccessResponse({
    ok: false,
    status: 401,
    code: "autotube_sign_in_required",
    message: "Sign in.",
  });
  assert.equal(response.status, 401);
  assert.equal(
    response.headers.get("www-authenticate"),
    `Bearer resource_metadata="${AUTOTUBE_OAUTH_METADATA}", scope="${AUTOTUBE_REQUIRED_SCOPE}"`,
  );
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "autotube_sign_in_required",
    message: "Sign in.",
  });
});

test("unauthenticated AutoTube MCP calls return an MCP OAuth challenge", () => {
  const response = autoTubeMcpAccessResult(42, {
    ok: false,
    status: 401,
    code: "autotube_sign_in_required",
    message: "Connect an account.",
  });
  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, 42);
  assert.equal(response.result.isError, true);
  assert.equal(
    response.result._meta["mcp/www_authenticate"],
    `Bearer resource_metadata="${AUTOTUBE_OAUTH_METADATA}", scope="${AUTOTUBE_REQUIRED_SCOPE}"`,
  );
});

test("forbidden AutoTube responses do not prompt repeated authentication", () => {
  const response = autoTubeMcpAccessResult(7, {
    ok: false,
    status: 403,
    code: "autotube_access_denied",
    message: "Access denied.",
  });
  assert.equal(response.result._meta["mcp/www_authenticate"], undefined);
  assert.equal(response.result._meta.access.status, 403);
});
