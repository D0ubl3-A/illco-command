import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const googleOauthSource = readFileSync("lib/google-oauth.ts", "utf8");
const accountStartSource = readFileSync("app/api/account/google/start/route.ts", "utf8");
const accountCallbackSource = readFileSync("app/api/account/google/callback/route.ts", "utf8");
const legacyCallbackSource = readFileSync("app/api/auth/oauth/callback/route.ts", "utf8");
const accountPageSource = readFileSync("app/account/page.tsx", "utf8");

test("Google OAuth respects the configured redirect URI", () => {
  assert.match(googleOauthSource, /return url\.toString\(\);/);
  assert.doesNotMatch(googleOauthSource, /url\.pathname = "\/api\/account\/google\/callback"/);
  const configuredRedirectIndex = googleOauthSource.indexOf("const configured = env.googleRedirectUri");
  const requestOriginFallbackIndex = googleOauthSource.indexOf("if (baseUrl)");
  assert.notEqual(configuredRedirectIndex, -1);
  assert.ok(requestOriginFallbackIndex > configuredRedirectIndex);
  assert.match(accountStartSource, /redirectUri:\s*requestOrigin/);
  assert.match(accountCallbackSource, /redirectUri:\s*requestOrigin/);
});

test("Google OAuth supports both canonical and legacy callback cookie paths", () => {
  assert.match(googleOauthSource, /\/api\/account\/google\/callback/);
  assert.match(googleOauthSource, /\/api\/auth\/oauth\/callback/);
  assert.match(accountCallbackSource, /getGoogleOAuthCookiePaths/);
  assert.match(legacyCallbackSource, /account\/google\/callback\/route/);
});

test("Google OAuth has an explicit Gmail signup mode", () => {
  assert.match(googleOauthSource, /GOOGLE_OAUTH_MODE_COOKIE/);
  assert.match(accountStartSource, /mode.*signup/);
  assert.match(accountCallbackSource, /google-created/);
  assert.match(accountPageSource, /Sign up with Gmail/);
});
