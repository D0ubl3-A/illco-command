import { NextResponse } from "next/server";

import {
  CHATGPT_OAUTH_CLIENT_ID,
  createOAuthAuthorizationCode,
  isAllowedClientId,
  isAllowedRedirectUri,
  normalizeScopes,
} from "@/lib/chatgpt-oauth";
import { getCurrentUser } from "@/lib/user-accounts";

export const dynamic = "force-dynamic";

function errorRedirect(redirectUri: string, state: string, error: string, description: string) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const clientId = requestUrl.searchParams.get("client_id") || CHATGPT_OAUTH_CLIENT_ID;
  const redirectUri = requestUrl.searchParams.get("redirect_uri") || "";
  const responseType = requestUrl.searchParams.get("response_type") || "";
  const state = requestUrl.searchParams.get("state") || "";
  const codeChallenge = requestUrl.searchParams.get("code_challenge") || "";
  const codeChallengeMethod = requestUrl.searchParams.get("code_challenge_method") || "S256";
  const scopes = normalizeScopes(requestUrl.searchParams.get("scope"));

  if (!isAllowedRedirectUri(redirectUri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }
  if (!isAllowedClientId(clientId)) {
    return errorRedirect(redirectUri, state, "unauthorized_client", "Unknown OAuth client.");
  }
  if (responseType !== "code") {
    return errorRedirect(redirectUri, state, "unsupported_response_type", "Only authorization code is supported.");
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return errorRedirect(redirectUri, state, "invalid_request", "PKCE S256 is required.");
  }

  const user = await getCurrentUser();
  if (!user) {
    const loginUrl = new URL("/account", request.url);
    loginUrl.searchParams.set("returnTo", requestUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  const code = await createOAuthAuthorizationCode({
    userId: user.id,
    clientId,
    redirectUri,
    scope: scopes.join(" "),
    codeChallenge,
    codeChallengeMethod,
  });
  const callback = new URL(redirectUri);
  callback.searchParams.set("code", code);
  if (state) callback.searchParams.set("state", state);
  return NextResponse.redirect(callback);
}
