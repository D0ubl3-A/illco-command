import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const googleOauthSource = readFileSync("lib/google-oauth.ts", "utf8");
const accountCallbackSource = readFileSync("app/api/account/google/callback/route.ts", "utf8");
const legacyCallbackSource = readFileSync("app/api/auth/oauth/callback/route.ts", "utf8");

test("Google OAuth respects the configured redirect URI", () => {
  assert.match(googleOauthSource, /return url\.toString\(\);/);
  assert.doesNotMatch(googleOauthSource, /url\.pathname = "\/api\/account\/google\/callback"/);
});

test("Google OAuth supports both canonical and legacy callback cookie paths", () => {
  assert.match(googleOauthSource, /\/api\/account\/google\/callback/);
  assert.match(googleOauthSource, /\/api\/auth\/oauth\/callback/);
  assert.match(accountCallbackSource, /getGoogleOAuthCookiePaths/);
  assert.match(legacyCallbackSource, /account\/google\/callback\/route/);
});
